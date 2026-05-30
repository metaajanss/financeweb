import type { User } from '@supabase/supabase-js'
import type { Database } from '@/shared/types'
import { createAdminClient } from '@/core/db/admin'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type AccountRow = Database['public']['Tables']['accounts']['Row']

export async function ensureProfileForUser(user: User): Promise<ProfileRow | null> {
    const adminSupabase = createAdminClient()
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com'
    const isSpecialAdmin = user.email === adminEmail

    const { data, error: profileError } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    const existingProfile = (data ?? null) as ProfileRow | null

    if (profileError) {
        console.error('[ensureProfileForUser] Failed to load profile:', profileError)
        return null
    }

    if (existingProfile?.account_id) {
        return existingProfile as ProfileRow
    }

    let accountId: string | null = existingProfile?.account_id ?? null

    if (!accountId && isSpecialAdmin) {
        const { data: latestLead } = await adminSupabase
            .from('leads')
            .select('account_id')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        accountId = latestLead?.account_id ?? null

        if (!accountId) {
            const { data: fallbackProfile } = await adminSupabase
                .from('profiles')
                .select('account_id')
                .not('account_id', 'is', null)
                .limit(1)
                .maybeSingle()

            accountId = fallbackProfile?.account_id ?? null
        }
    }

    // NEW: Check for pending invitations before creating a new account
    if (!accountId && user.email) {
        const { data: invitation } = await adminSupabase
            .from('team_invitations')
            .select('account_id, role')
            .eq('email', user.email.toLowerCase())
            .maybeSingle()

        if (invitation) {
            accountId = invitation.account_id
            // Update metadata to include role from invitation if not set
            if (!user.user_metadata?.role) {
                user.user_metadata = { ...user.user_metadata, role: invitation.role }
            }
            
            // Delete invitation after it's been processed
            await adminSupabase
                .from('team_invitations')
                .delete()
                .eq('email', user.email.toLowerCase())
                .eq('account_id', invitation.account_id)
        }
    }

    if (!accountId) {
        const accountName =
            user.user_metadata?.company_name ||
            user.user_metadata?.full_name ||
            user.email ||
            'My Company'

        const { data: insertedAccount, error: accountError } = await adminSupabase
            .from('accounts')
            .insert({
                name: String(accountName),
                subscription_status: 'trialing',
            })
            .select()
            .single()

        const newAccount = (insertedAccount ?? null) as AccountRow | null

        if (accountError || !newAccount) {
            console.error('[ensureProfileForUser] Failed to create account:', accountError)
            return null
        }

        accountId = String(newAccount.id)
    }

    const role =
        existingProfile?.role ||
        (isSpecialAdmin ? 'admin' : null) ||
        (typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : null) ||
        'admin'

    const { data: upsertedProfile, error: upsertError } = await adminSupabase
        .from('profiles')
        .upsert({
            id: user.id,
            account_id: accountId,
            full_name: existingProfile?.full_name || user.user_metadata?.full_name || user.email || 'Admin User',
            email: existingProfile?.email || user.email || null,
            role: role as Database['public']['Tables']['profiles']['Insert']['role'],
            avatar_url: existingProfile?.avatar_url || user.user_metadata?.avatar_url || null,
            email_alerts: existingProfile?.email_alerts ?? true,
            push_notifications: existingProfile?.push_notifications ?? true,
            sms_updates: existingProfile?.sms_updates ?? false,
        })
        .select('*')
        .single()

    if (upsertError) {
        console.error('[ensureProfileForUser] Failed to upsert profile:', upsertError)
        return null
    }

    return upsertedProfile as ProfileRow
}
