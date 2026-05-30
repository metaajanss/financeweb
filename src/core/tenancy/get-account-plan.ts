import { createClient } from '@/core/db/server';
import type { SubscriptionPlan } from '@/config/plans';

export async function getAccountPlan(): Promise<SubscriptionPlan> {
    try {
        const supabase = await createClient();

        const { data, error: userError } = await supabase.auth.getUser();
        const user = data?.user;

        if (userError || !user) return 'free';

        // Single JOIN query instead of 3 sequential round-trips
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('account_id, accounts(plan_id, subscription_status)')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.account_id) return 'free';

        const account = (profile as any).accounts as { plan_id: string | null; subscription_status: string | null } | null;
        if (!account) return 'free';

        const resolvedPlan = (account.plan_id || 'free').toLowerCase() as SubscriptionPlan;

        // SPECIAL ADMIN BYPASS: Align with account-context.ts
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
        if (user.email === adminEmail) {
            return 'business';
        }

        // Webhooks set plan_id='free' on cancellation/failure, but as a safety net
        // also downgrade here if the subscription is no longer active.
        if (
            account.subscription_status === 'canceled' ||
            account.subscription_status === 'past_due' ||
            account.subscription_status === 'paused'
        ) {
            return 'free';
        }

        return resolvedPlan;
    } catch (error) {
        console.error('[getAccountPlan] Fatal Error:', error);
        return 'free';
    }
}
