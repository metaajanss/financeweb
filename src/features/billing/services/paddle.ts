'use server';

import { Environment, LogLevel, Paddle } from '@paddle/paddle-node-sdk';
import { createClient } from '@/core/db/server';

const getPaddleParams = () => {
    const key = (process.env.PADDLE_API_KEY || '').trim();
    
    if (!key) {
        console.error('[Paddle Service] CRITICAL: PADDLE_API_KEY is missing or empty.');
    } else {
        if (key.includes(' ') || key.includes('\n') || key.includes('\r')) {
            console.error('[Paddle Service] WARNING: PADDLE_API_KEY contains whitespace characters!');
        }
        if (!key.startsWith('pdl_')) {
            console.error('[Paddle Service] WARNING: PADDLE_API_KEY does not start with "pdl_". You might be using a Client Token instead of an API Secret Key.');
        }
    }
    
    const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox' ? Environment.sandbox : Environment.production;
    
    return { key, environment };
}

let _paddleInstance: Paddle | null = null;

export const getPaddle = async () => {
    if (!_paddleInstance) {
        const { key, environment } = getPaddleParams();
        _paddleInstance = new Paddle(key, { environment, logLevel: LogLevel.error });
    }
    return _paddleInstance;
};

// Internal helper for testing only
export const resetPaddleInstance = async () => {
    _paddleInstance = null;
};

export type SubscriptionPlan = 'free' | 'starter' | 'growth' | 'pro' | 'business';

export type SubscriptionStatus = {
    plan: SubscriptionPlan;
    status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
};

interface AccountJoinData {
    paddle_customer_id: string | null;
    paddle_subscription_id: string | null;
}

interface ProfileWithAccount {
    account_id: string | null;
    full_name: string | null;
    accounts: AccountJoinData | AccountJoinData[] | null;
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return null;
    }

    const { data: rawProfile } = await supabase
        .from('profiles')
        .select('account_id, accounts(paddle_customer_id, paddle_subscription_id)')
        .eq('id', user.id)
        .single();

    const profile = rawProfile as unknown as ProfileWithAccount;

    if (!profile?.account_id) {
        return null;
    }

    const accountData = profile.accounts;
    const account = Array.isArray(accountData) ? accountData[0] : accountData;
    const subscriptionId = account?.paddle_subscription_id;

    if (!subscriptionId) {
        return null;
    }

    


    const paddle = await getPaddle();

    try {
        const subscription = await paddle.subscriptions.get(subscriptionId);

        // Determine plan from price ID - in Paddle you check the items price object
        // Assuming subscription has at least one item
        const priceId = subscription.items[0]?.price?.id;
        let plan: SubscriptionPlan = 'free';

        if (priceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO) {
            plan = 'pro';
        } else if (priceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_GROWTH) {
            plan = 'growth';
        } else if (priceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS) {
            plan = 'business';
        } else if (priceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER) {
            plan = 'starter';
        }

        return {
            plan,
            status: subscription.status,
            currentPeriodEnd: subscription.currentBillingPeriod?.endsAt || new Date().toISOString(),
            cancelAtPeriodEnd: subscription.scheduledChange?.action === 'cancel'
        };
    } catch (e) {
        console.error("[Paddle Service] Error fetching Paddle subscription:", e);
        return null; // Return null if subscription fetch fails (it might have been deleted on paddle but not yet updated on our db)
    }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: rawProfile } = await supabase
        .from('profiles')
        .select('account_id, accounts(paddle_subscription_id)')
        .eq('id', user.id)
        .single();

    const profile = rawProfile as unknown as ProfileWithAccount;

    if (!profile?.account_id) return { error: 'No account found' };

    const accountData = profile.accounts;
    const account = Array.isArray(accountData) ? accountData[0] : accountData;
    const subscriptionId = account?.paddle_subscription_id;

    if (!subscriptionId) {
        return { error: 'No active subscription' };
    }

    const paddle = await getPaddle();
    try {
        await paddle.subscriptions.cancel(subscriptionId, { effectiveFrom: 'next_billing_period' });
        return { success: true };
    } catch (e) {
        const error = e as Error;
        console.error("Error cancelling Paddle subscription:", error);
        return { error: error.message || 'Failed to cancel subscription' };
    }
}

/**
 * Get customer portal URL (Paddle implementation logic)
 */
export async function getCustomerPortalUrl() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: rawProfile } = await supabase
        .from('profiles')
        .select('account_id, accounts(paddle_customer_id, paddle_subscription_id)')
        .eq('id', user.id)
        .single();

    const profile = rawProfile as unknown as ProfileWithAccount;

    if (!profile?.account_id) return { error: 'No account found' };

    const accountData = profile.accounts;
    const account = Array.isArray(accountData) ? accountData[0] : accountData;
    const customerId = account?.paddle_customer_id;
    const subscriptionId = account?.paddle_subscription_id;

    if (!customerId) {
        return { error: 'No active customer' };
    }

    // Paddle handles customer portals client side often or via an API endpoint token 
    // depending on the exact implementation. For server-rendered self-serve portal links:
    const paddle = await getPaddle();

    try {
        const portalSession = await paddle.customerPortalSessions.create(customerId, subscriptionId ? [subscriptionId] : []);
        
        // The SDK returns a customerPortalSession with a 'urls' property that contains general.overview
        const url = portalSession.urls?.general?.overview;
        
        return { url: url || '' };
    } catch (error) {
        const err = error as Error;
        console.error('Error generating Paddle Portal:', err);
        return { error: err.message };
    }
}

/**
 * Get the Paddle Customer ID for the currently logged-in user
 */
export async function getPaddleCustomerId(): Promise<string | null> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: rawProfile } = await supabase
        .from('profiles')
        .select('accounts(paddle_customer_id)')
        .eq('id', user.id)
        .single();

    const profile = rawProfile as unknown as ProfileWithAccount;
    const accountData = profile?.accounts;
    const account = Array.isArray(accountData) ? accountData[0] : accountData;
    return account?.paddle_customer_id || null;
}

/**
 * Prepare a transaction for Paddle.js checkout
 */
export async function getTransactionForCheckout(plan: SubscriptionPlan) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: rawProfile } = await supabase
        .from('profiles')
        .select('account_id, full_name, accounts(paddle_customer_id)')
        .eq('id', user.id)
        .single();

    const profile = rawProfile as unknown as ProfileWithAccount;
        
    let finalAccountId = profile?.account_id;
    const accountData = profile?.accounts;
    const account = Array.isArray(accountData) ? accountData[0] : accountData;
    let paddleCustomerId = account?.paddle_customer_id || null;

    if (!finalAccountId) {
        // Fallback: if the user somehow missing an account, we try to create it.
        try {
            const { ensureAccount } = await import('@/features/settings');
            const result = await ensureAccount(user.id);
            finalAccountId = String(result.account_id);
            paddleCustomerId = null; // New account means no customer id yet
        } catch (err) {
            const error = err as Error;
            return { error: `Failed to initialize user account: ${error.message}` };
        }
    }

    if (!finalAccountId) return { error: 'No account found' };

    // Determine Price ID mapping based on plan via env variables
    const starterPrice = process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER;
    const growthPrice = process.env.NEXT_PUBLIC_PADDLE_PRICE_GROWTH;
    const proPrice = process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO;
    const businessPrice = process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS;

    const priceIds: Record<Exclude<SubscriptionPlan, 'free'>, string | undefined> = {
        starter: starterPrice,
        growth: growthPrice,
        pro: proPrice,
        business: businessPrice
    };

    const priceId = priceIds[plan as Exclude<SubscriptionPlan, 'free'>];

    if (!priceId) {
        return { error: `Paddle price ID for plan '${plan}' is not configured` };
    }

    let customerId = paddleCustomerId;
    const paddle = await getPaddle();

    // Create Customer in Paddle proactively if it doesn't exist
    if (!customerId) {
        try {
            const customer = await paddle.customers.create({
                email: user.email!,
                name: profile?.full_name || undefined
            });
            customerId = customer.id;

            await supabase
                .from('accounts')
                .update({ paddle_customer_id: customerId })
                .eq('id', finalAccountId);
        } catch (e: unknown) {
            const err = e as Error;
            // If customer already exists in Paddle, look them up by email via API
            // (more reliable than parsing error message strings which can change)
            try {
                const existingCustomers = paddle.customers.list({ email: [user.email!] });
                let found = false;
                for await (const c of existingCustomers) {
                    customerId = c.id;
                    found = true;
                    break;
                }
                if (found) {
                    await supabase
                        .from('accounts')
                        .update({ paddle_customer_id: customerId })
                        .eq('id', finalAccountId);
                } else {
                    return { error: `Failed to create paddle customer: ${err.message}` };
                }
            } catch {
                return { error: `Failed to create paddle customer: ${err.message}` };
            }
        }
    }

    // Create a transaction scoped to the user account & price item
    // We'll pass the transaction id to Paddle.js
    // Passing the account id as customData ensures we receive it via webhook.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://payofflab.app';
    const isLocalhost = baseUrl.includes('localhost');
    const isProduction = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'production';

    if (isLocalhost && isProduction) {
        console.warn('[Paddle Service] WARNING: Using Production environment on localhost. This may cause checkout failures due to domain verification.');
    }

    // 1. First attempt: Create transaction WITHOUT explicit checkout URL.
    // This allows Paddle to use the 'Default Payment Link' from Dashboard, 
    // which often bypasses custom domain approval glitches.
    try {
        const transaction = await paddle.transactions.create({
            items: [{ priceId, quantity: 1 }],
            customerId: customerId,
            customData: {
                account_id: finalAccountId
            }
        });
        return { transactionId: transaction.id };
    } catch (e: unknown) {
        const err = e as Error;
        // 2. Fallback attempt: If dashboard has no default link, we try providing ours.
        if (err.message && err.message.includes('Default Payment Link has not yet been defined')) {
            try {
                const transaction = await paddle.transactions.create({
                    items: [{ priceId, quantity: 1 }],
                    customerId: customerId,
                    customData: {
                        account_id: finalAccountId
                    },
                    checkout: {
                        url: `${baseUrl}/admin/settings/billing`
                    }
                });
                return { transactionId: transaction.id };
            } catch (fallbackErr: unknown) {
                return handlePaddleError(fallbackErr, customerId, isLocalhost, isProduction, priceId);
            }
        }
        return handlePaddleError(err, customerId, isLocalhost, isProduction, priceId);
    }
}

/**
 * Common error handler for Paddle transaction failures
 */
function handlePaddleError(e: unknown, customerId: string | null, isLocalhost: boolean, isProduction: boolean, priceId: string) {
    const error = e as Error;
    let errorMessage = error.message || 'Failed to create paddle transaction';
    
    // If "Invalid request" occurs, it might be due to a Customer ID from the WRONG environment
    // (e.g. customerId created in Sandbox used in Production).
    if (errorMessage.includes('Invalid request') && customerId) {
        console.error('[Paddle Service] Invalid request detected with existing customerId. This might be an Environment mismatch (Sandbox ID in Production).');
        errorMessage = 'Paddle Hatası: Geçersiz istek (Invalid request). \n\nMuhtemel Sebep: Daha önce Test (Sandbox) modunda oluşturulmuş olan kullanıcı kaydınız Canlı (Live) mod ile çakışıyor olabilir. Lütfen başka bir e-posta ile deneyin veya veritabanındaki paddle_customer_id değerini silin.';
    }

    // Specialized error handling for 'Default Payment Link'
    if (errorMessage.includes('Default Payment Link')) {
        errorMessage = 'Paddle Hatası: Varsayılan Ödeme Linki ayarlanmamış. \n\nÇözüm: Paddle Dashboard > Checkout > Settings ekranından bir "Default Payment Link" tanımlamanız gerekmektedir. Ayrıca localhost üzerinde Live anahtar kullanımı bu hatayı tetikleyebilir.';
    }

    // Specialized error handling for 'Domain approval'
    if (errorMessage.includes('domain that has been approved')) {
        errorMessage = 'Paddle Hatası: Alan adı onaylanmamış. \n\nÇözüm: Paddle Dashboard > Checkout > Settings > Approved Domains kısmına "payofflab.app" adresini eklediğinizden emin olun.';
    }

    // Specialized error handling for blocked vendor/domain (common in production localhost)
    if (errorMessage.includes('Creation is blocked for this vendor')) {
        errorMessage = 'Paddle Hatası: Satıcı veya ödeme işlemi engellendi. \n\nMuhtemel Sebep: Canlı (Production) modda localhost üzerinde işlem yapmaya çalışıyor olabilirsiniz. Paddle güvenlik gereği localhost üzerinden canlı ödeme başlatılmasını engelleyebilir. \n\nÇözüm: Test için .env.local dosyasında NEXT_PUBLIC_PADDLE_ENVIRONMENT değerini "sandbox" yapın ve Sandbox API anahtarlarınızı kullanın.';
    }

    console.error(`[Paddle Service] Transaction error: ${error.message}`, {
        priceId,
        customerId,
        isLocalhost,
        isProduction
    });



    return { error: errorMessage };
}

export type InvoiceItem = {
    id: string;
    status: string;
    date: string;
    amount: string;
    currency: string;
    planName: string;
    receiptUrl: string | null;
}

/**
 * Fetch transaction history for the logged-in user
 */
export async function getTransactionHistory(): Promise<InvoiceItem[]> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: rawProfile } = await supabase
        .from('profiles')
        .select('account_id, accounts(paddle_customer_id)')
        .eq('id', user.id)
        .single();

    const profile = rawProfile as unknown as ProfileWithAccount;
    const accountData = profile?.accounts;
    const account = Array.isArray(accountData) ? accountData[0] : accountData;
    const customerId = account?.paddle_customer_id;

    if (!customerId) return [];



    const paddle = await getPaddle();
    const invoices: InvoiceItem[] = [];

    try {
        const transactions = paddle.transactions.list({
            customerId: [customerId],
            status: ['billed', 'completed']
        });

        for await (const transaction of transactions) {
            
            // Format amount dynamically based on currency rules if needed, 
            // but Paddle transactions details totals usually have it formatted in minor units
            const rawTotal = typeof transaction.details?.totals?.total === 'string' 
                ? parseInt(transaction.details.totals.total, 10) 
                : (transaction.details?.totals?.total || 0);
            
            const totalStr = (rawTotal / 100).toFixed(2);
            
            let planName = 'Subscription';
            if (transaction.details?.lineItems?.length && transaction.details.lineItems[0].product) {
                planName = transaction.details.lineItems[0].product.name;
            }

            // Paddle does not expose a direct receipt URL in the transaction object.
            // Users access receipts via the customer portal (Manage Billing button).
            invoices.push({
                id: transaction.id,
                status: transaction.status,
                date: transaction.billedAt || transaction.createdAt || new Date().toISOString(),
                amount: totalStr,
                currency: transaction.currencyCode || 'USD',
                planName,
                receiptUrl: null
            });
            
            if (invoices.length >= 20) break;
        }

        return invoices;
    } catch (e) {
        console.error('[Paddle Service] Error fetching transaction history:', e);
        return [];
    }
}
