'use server';

import { createClient } from '@/core/db/server';
import { createAdminClient } from '@/core/db/admin';
import { revalidatePath } from 'next/cache';

async function verifySuperAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
    return user.email === adminEmail || user.app_metadata?.role === 'super_admin';
}

export interface DashboardMetrics {
    tenantCount: number;
    userCount: number;
    usersToday: number;
    usersMonth: number;
    revenueToday: number;
    revenueMonth: number;
    totalRevenue: number;
    errorCount: number;
    status: string;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized');
    const supabase = createAdminClient();

    try {
        const { data, error } = await (supabase.rpc as any)('get_super_admin_stats');
        
        if (error) throw error;

        return data as unknown as DashboardMetrics;
    } catch (error) {
        console.error('Error fetching dashboard metrics via RPC:', error);
        return {
            tenantCount: 0,
            userCount: 0,
            usersToday: 0,
            usersMonth: 0,
            revenueToday: 0,
            revenueMonth: 0,
            totalRevenue: 0,
            errorCount: 0,
            status: 'Error'
        };
    }
}


export interface Tenant {
    id: string;
    name: string;
    email: string;
    isGoogle: boolean;
    plan: string;
    status: string;
    joined: string;
    revenue: string;
}

export async function getTenants(): Promise<Tenant[]> {
    if (!await verifySuperAdmin()) return [];
    // Must use admin client (service role) to bypass RLS and read ALL tenant accounts.
    const supabase = createAdminClient();

    try {
        const { data, error } = await supabase
            .from('accounts')
            .select(`
                id,
                name,
                plan_id,
                subscription_status,
                created_at,
                profiles (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data as any[] || []).map(account => ({
            id: account.id,
            name: account.name,
            email: account.profiles?.[0]?.email || account.profiles?.[0]?.full_name || 'N/A',
            isGoogle: account.profiles?.[0]?.avatar_url?.includes('googleusercontent.com') || false,
            // Always normalize to lowercase to match SubscriptionPlan type
            plan: (account.plan_id || 'free').toLowerCase(),
            status: account.subscription_status === 'active' || account.subscription_status === 'trialing' ? 'Active' : 'Suspended',
            joined: new Date(account.created_at ?? new Date()).toLocaleDateString(),
            revenue: account.plan_id?.toLowerCase() === 'pro' ? '$99/mo' :
                     account.plan_id?.toLowerCase() === 'business' ? '$299/mo' :
                     account.plan_id?.toLowerCase() === 'growth' ? '$49/mo' :
                     account.plan_id?.toLowerCase() === 'starter' ? '$29/mo' : '$0/mo'
        }));
    } catch (error) {
        console.error('Error fetching tenants:', error);
        return [];
    }
}

export async function updateTenantStatus(id: string, status: string) {
    if (!await verifySuperAdmin()) return { success: false, error: 'Unauthorized' };
    const supabase = createAdminClient();
    // Map frontend status ('Active'/'Suspended') to DB column subscription_status
    const dbStatus = status === 'Active' ? 'active' : 'canceled';

    try {
        const { error } = await supabase
            .from('accounts')
            .update({ subscription_status: dbStatus })
            .eq('id', id);

        if (error) throw error;
        
        revalidatePath('/super-admin/tenants');
        return { success: true };
    } catch (error) {
        console.error('Error updating tenant status:', error);
        return { success: false, error: String(error) };
    }
}

export async function assignAccountPlan(id: string, plan: string) {
    if (!await verifySuperAdmin()) return { success: false, error: 'Unauthorized' };
    const supabaseAdmin = createAdminClient();
    const normalizedPlan = plan.toLowerCase();

    try {
        // Update plan_id and get the updated row back to confirm write succeeded
        const { data: updatedRows, error } = await supabaseAdmin
            .from('accounts')
            .update({ 
                plan_id: normalizedPlan,
                subscription_status: 'active'
            })
            .eq('id', id)
            .select('id, plan_id, subscription_status');

        if (error) {
            console.error('[assignAccountPlan] DB error for account', id, ':', error);
            return { success: false, error: `Database error: ${error.message}` };
        }

        if (!updatedRows || updatedRows.length === 0) {
            console.error('[assignAccountPlan] No rows updated for account', id, '- RLS may be blocking write or ID is wrong');
            return { success: false, error: `No account was updated. The account ID may be wrong, or a Row Level Security policy is blocking the update. Check that SUPABASE_SERVICE_ROLE_KEY is set.` };
        }

        const updatedPlan = updatedRows[0].plan_id;

        revalidatePath('/', 'layout');
        
        return { success: true, newPlan: updatedPlan };
    } catch (error) {
        console.error('[assignAccountPlan] Unexpected error:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function getImpersonationLink({ accountId, origin }: { accountId: string, origin?: string }) {
    if (!await verifySuperAdmin()) return { success: false, error: 'Unauthorized' };
    const supabaseAdmin = createAdminClient();

    try {
        if (!accountId) throw new Error('Account ID is required for impersonation.');

        // Use admin client to bypass RLS for fetching user profiles
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name')
            .eq('account_id', accountId)
            .limit(1);

        if (profileError) throw profileError;
        if (!profiles || profiles.length === 0) {
            throw new Error('Tenant has no user profiles assigned.');
        }

        const userId = profiles[0].id;
        
        // Fetch the email directly from auth.users via Admin API
        const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (userError || !authUser.user) {
            throw new Error('User account could not be found in Authentication database.');
        }

        const email = authUser.user.email;
        if (!email) throw new Error('User profile is missing a registered email address.');

        // Use the passed origin or fall back to SITE_URL / localhost
        const baseRedirect = origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

        // Generate a magic link for immediate login
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
                redirectTo: `${baseRedirect}/admin`
            }
        });

        if (error) throw error;

        const actionLink = data?.properties?.action_link;
        if (actionLink) {
            return { 
                success: true, 
                link: actionLink,
                userName: profiles[0].full_name || 'User',
                error: null
            };
        } else {
            throw new Error('Authentication link generation failed on server.');
        }
    } catch (error: any) {
        console.error('CRITICAL IMPERSONATION ERROR:', error);
        return { 
            success: false, 
            link: null,
            userName: null,
            error: error.message || 'An unexpected authentication error occurred.' 
        };
    }
}

export async function getErrorLogs(page: number = 1, filters: { error_type?: string, severity?: string, search?: string, url?: string } = {}, itemsPerPage: number = 50) {
    if (!await verifySuperAdmin()) return { data: [], count: 0 };
    const supabase = await createClient();

    try {
        let query = supabase
            .from('error_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

        if (filters.error_type) {
            query = query.eq('error_type', filters.error_type);
        }
        if (filters.severity) {
            query = query.eq('severity', filters.severity);
        }
        if (filters.search) {
            query = query.ilike('message', `%${filters.search}%`);
        }
        if (filters.url) {
            query = query.ilike('url', `%${filters.url}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return {
            data: data || [],
            count: count || 0
        };
    } catch (error) {
        console.error('Error fetching error logs:', error);
        return { data: [], count: 0 };
    }
}

export type ErrorAnalyticsItem = {
    message: string;
    url: string | null;
    severity: string;
    error_type: string;
    count: number;
    last_seen: string;
};

export async function getErrorAnalytics(): Promise<ErrorAnalyticsItem[]> {
    if (!await verifySuperAdmin()) return [];
    const supabase = await createClient();

    try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('error_logs')
            .select('message, url, severity, error_type, created_at')
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) throw error;

        const groups: Record<string, ErrorAnalyticsItem> = {};
        data?.forEach(log => {
            const key = `${log.message}-${log.url}`;
            if (!groups[key]) {
                groups[key] = {
                    message: log.message,
                    url: log.url,
                    severity: log.severity,
                    error_type: log.error_type,
                    count: 0,
                    last_seen: log.created_at
                };
            }
            groups[key].count++;
        });

        return Object.values(groups)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    } catch (error) {
        console.error('Error fetching error analytics:', error);
        return [];
    }
}

/**
 * Permanentely delete a tenant (Account)
 * ONLY for Super Admin
 */
export async function deleteTenant(accountId: string) {
    if (!await verifySuperAdmin()) return { success: false, error: 'Unauthorized' };
    
    // We must use the admin client to bypass RLS and delete an account from super-admin panel
    const { createAdminClient } = await import('@/core/db/admin');
    const supabase = createAdminClient();
    
    try {
        // ON DELETE CASCADE in the database handles all related tables (profiles, leads, sequences, etc.)
        const { error } = await supabase
            .from('accounts')
            .delete()
            .eq('id', accountId);

        if (error) throw error;

        revalidatePath('/super-admin/tenants');
        return { success: true };
    } catch (error) {
        console.error('Error deleting tenant:', error);
        return { success: false, error: String(error) };
    }
}
export async function getGlobalAnalyticsData() {
    if (!await verifySuperAdmin()) throw new Error('Unauthorized');
    const supabase = createAdminClient();

    try {
        // Fetch plan distribution
        const { data: planData, error: planError } = await supabase
            .from('accounts')
            .select('plan_id');

        if (planError) throw planError;

        const planCounts: Record<string, number> = {};
        planData?.forEach(row => {
            const plan = (row.plan_id || 'free').toLowerCase();
            planCounts[plan] = (planCounts[plan] || 0) + 1;
        });

        const totalTenants = planData?.length || 0;
        const planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
            label: plan.charAt(0).toUpperCase() + plan.slice(1),
            count,
            pct: totalTenants > 0 ? Math.round((count / totalTenants) * 100) : 0,
            color: plan === 'pro' ? 'bg-purple-500' : 
                   plan === 'business' ? 'bg-orange-500' : 
                   plan === 'growth' ? 'bg-blue-500' : 'bg-gray-500'
        })).sort((a, b) => b.count - a.count);

        // Fetch basic metrics from our existing stats RPC
        const stats = await getDashboardMetrics();

        // Fetch revenue history (last 6 months)
        // For now, we'll calculate this based on created_at and plan_id as a proxy 
        // since we don't have a dedicated "invoices" table yet in the current schema
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: accounts, error: accountsError } = await supabase
            .from('accounts')
            .select('created_at, plan_id')
            .gte('created_at', sixMonthsAgo.toISOString());

        if (accountsError) throw accountsError;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const revenueHistory = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthName = months[date.getMonth()];
            
            // Calculate revenue for this month (proxy)
            const monthRevenue = accounts?.filter(acc => {
                if (!acc.created_at) return false;
                const accDate = new Date(acc.created_at);
                return accDate.getMonth() === date.getMonth() && accDate.getFullYear() === date.getFullYear();
            }).reduce((sum, acc) => {
                const plan = acc.plan_id?.toLowerCase();
                if (plan === 'pro') return sum + 99;
                if (plan === 'business') return sum + 299;
                if (plan === 'growth') return sum + 49;
                if (plan === 'starter') return sum + 29;
                return sum;
            }, 0) || 0;

            revenueHistory.push({
                month: monthName,
                revenue: monthRevenue,
                h: Math.max(10, Math.min(100, (monthRevenue / 2000) * 100)) // Scaled for chart
            });
        }

        return {
            metrics: [
                { label: 'Total MRR', value: `$${stats.totalRevenue.toLocaleString()}`, change: '+0%', positive: true },
                { label: 'Active Tenants', value: stats.tenantCount.toString(), change: '+0%', positive: true },
                { label: 'Churn Rate', value: '0%', change: '0%', positive: true }, // Placeholder
                { label: 'System Errors', value: stats.errorCount.toString(), change: '-0%', positive: true },
            ],
            planDistribution,
            revenueHistory
        };
    } catch (error) {
        console.error('Error fetching global analytics:', error);
        throw error;
    }
}

export async function getGlobalEventLogs(limit = 100) {
    if (!await verifySuperAdmin()) return [];
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from('event_logs')
        .select(`
            *,
            accounts (
                name
            )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching global event logs:', error);
        return [];
    }
    return data;
}

