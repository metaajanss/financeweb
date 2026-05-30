'use server'

import { createClient } from '@/core/db/server'
import { revalidatePath, unstable_noStore } from 'next/cache'
import { headers } from 'next/headers'
import { getAccountContext } from '@/core/tenancy/account-context'
import { getErrorMessage } from '@/core/errors/error-utils'

export type Profile = {
    id: string
    email?: string | null
    first_name: string | null
    last_name: string | null
    full_name: string | null
    phone: string | null
    avatar_url: string | null
    account_id: string | null
    role: string | null
    created_at: string | null
    updated_at: string | null
    status?: 'active' | 'pending'
    email_alerts: boolean | null
    push_notifications: boolean | null
    sms_updates: boolean | null
    language?: string | null
}

export type TeamMember = Profile;

export type Account = {
    id: string
    name: string
    created_at?: string | null
    subscription_status: string | null
    plan_id?: string | null
    stripe_customer_id?: string | null
    ai_config?: any
    // Legacy mapping support for code that still expects these
    company_name?: string
    timezone?: string
    language?: string
    paddle_customer_id?: string | null
    paddle_subscription_id?: string | null
    metadata?: any
}

/**
 * Get current user's profile
 */
export async function getCurrentProfile() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (error) {
        return { error: error.message }
    }

    return { data: profile as Profile }
}

/**
 * Update user profile
 */
export async function updateProfile(data: Partial<Profile>) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/profile')
    return { success: true }
}

/**
 * Get account details
 */
export async function getAccount() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single()

    if (!profile?.account_id) return { error: 'No account found' }

    const accountId = profile && typeof profile === 'object' && 'account_id' in profile
        ? (profile as Record<string, unknown>).account_id as string | null
        : null

    if (!accountId) {
        return { error: 'No account_id found in profile' }
    }

    const { data: account, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single()

    if (error) {
        return { error: error.message }
    }

    return { data: account as Account }
}

/**
 * Update account settings
 */
export async function updateAccount(data: Partial<Account>) {
    const { getAccountContext } = await import('@/core/tenancy/account-context')
    const context = await getAccountContext()

    if (!context.ok) {
        return { error: context.error }
    }

    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can update account settings' }
    }

    const supabase = await createClient()

    const { error } = await supabase
        .from('accounts')
        .update(data)
        .eq('id', context.accountId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/settings')
    return { success: true }
}

/**
 * Get team members (all profiles in the same account + pending invitations)
 */
export async function getTeamMembers(): Promise<{ data?: Profile[], error?: string }> {
    unstable_noStore()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Authentication failed' }

    const { createAdminClient } = await import('@/core/db/admin')
    const supabaseAdmin = createAdminClient()

    // 1. Get current user's profile with admin client to ensure we have the account_id
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.account_id) {
        console.error('[getTeamMembers] profile error:', profileError)
        return { error: 'Account not found' }
    }

    try {
        // 2. Fetch active members and pending invitations in parallel with admin client
        const [membersRes, invitesRes] = await Promise.all([
            supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('account_id', (profile as any).account_id),
            supabaseAdmin
                .from('team_invitations')
                .select('*')
                .eq('account_id', (profile as any).account_id)
                .eq('status', 'pending')
        ])

        if (membersRes.error) throw membersRes.error
        if (invitesRes.error) throw invitesRes.error

        // 3. Map active members (Exclude current user)
        const activeMembers: Profile[] = (membersRes.data || [])
            .filter((m: any) => m.id !== user.id) // Filter out the current admin
            .map(m => ({
                ...m,
                status: 'active'
            } as Profile))

        // 4. Map pending invites to Profile shape
        const pendingInvites: Profile[] = (invitesRes.data || []).map((i: any) => ({
            id: i.id,
            email: i.email,
            first_name: null,
            last_name: null,
            full_name: i.email,
            phone: null,
            avatar_url: null,
            account_id: i.account_id,
            role: i.role as 'admin' | 'agent' | 'member',
            created_at: i.created_at,
            updated_at: i.created_at,
            status: 'pending',
            email_alerts: true,
            push_notifications: true,
            sms_updates: false,
            language: 'tr'
        } as Profile))

        // 5. Combine and sort safely
        const allData = [...activeMembers, ...pendingInvites].sort((a, b) => {
            const timeA = new Date(a.created_at || a.updated_at || 0).getTime()
            const timeB = new Date(b.created_at || b.updated_at || 0).getTime()
            return timeB - timeA // Newest first
        })

        return { data: allData }
    } catch (err: unknown) {
        console.error('[getTeamMembers] fetch error:', getErrorMessage(err))
        return { error: 'Failed to load team: ' + getErrorMessage(err) }
    }
}

/**
 * Invite team member
 */
export async function inviteTeamMember(email: string, role: 'admin' | 'agent' | 'member' = 'agent', locale: string = 'tr') {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Get current user's profile with admin client to bypass RLS
    const { createAdminClient } = await import('@/core/db/admin')
    const supabaseAdmin = createAdminClient()

    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('account_id, role, full_name')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.account_id) {
        console.error('[inviteTeamMember] Admin profile error (likely profile not found):', profileError);
        return { error: 'Admin profile not found' }
    }
    
    if (profile.role !== 'admin') {
        return { error: 'Only admins can invite members' }
    }

    // Don't allow inviting yourself
    if (normalizedEmail === user.email?.toLowerCase()) {
        return { error: 'You cannot invite yourself' }
    }

    // Check if user is already a member (SAFE CHECK)
    try {
        const { data: existingMember } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', normalizedEmail)
            .eq('account_id', profile.account_id)
            .maybeSingle()

        if (existingMember) {
            return { error: 'User is already a member of this team' }
        }
    } catch (e: unknown) {
        console.warn('[inviteTeamMember] Profile email check failed:', getErrorMessage(e));
    }

    // Delete any existing pending invitation for this email in this account
    // This allows re-inviting and clearing "stuck" invitations
    await supabaseAdmin
        .from('team_invitations')
        .delete()
        .eq('email', normalizedEmail)
        .eq('account_id', profile.account_id)

    // Create new invitation record in database
    const { error: dbError } = await supabaseAdmin
        .from('team_invitations')
        .insert({
            account_id: profile.account_id,
            email: normalizedEmail,
            role
        })

    if (dbError) {
        console.error('[inviteTeamMember] Error creating invitation record:', dbError)
        return { error: 'Failed to create invitation record: ' + dbError.message }
    }

    // Prepare redirect URL with locale support
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    let baseUrl;
    
    if (siteUrl && siteUrl !== '') {
        baseUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    } else {
        const headerList = await headers();
        const host = headerList.get('host');
        // 'localhost', '127.0.0.1' ve '0.0.0.0' yerel IP'leri her zaman HTTP kabul edilmeli.
        const isLocalHost = host?.includes('localhost') || host?.includes('127.0.0.1') || host?.includes('0.0.0.0');
        const protocol = isLocalHost ? 'http' : 'https';
        baseUrl = host ? `${protocol}://${host}` : 'http://localhost:3000';
    }
    
    // YÖNLENDİRME DÜZELTMESİ (IMPLICIT FLOW İÇİN):
    // admin.inviteUserByEmail varsayılan olarak hash fragment (#access_token=...) döner (Implicit Flow).
    // /auth/callback bir sunucu rotası (server-side route) olduğu için hash fragment'ları göremez.
    // Bu yüzden isteği doğrudan client tarafında #access_token yakalayan /reset-password sayfasına gönderiyoruz.
    const callbackUrl = new URL(`/${locale}/reset-password`, baseUrl);
    callbackUrl.searchParams.set('invite', 'true');
    const redirectTo = callbackUrl.toString();

    

    // Send invitation via Supabase Admin Auth
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: {
            invited_by: user.id
        },
        redirectTo: redirectTo
    })

    if (inviteError) {
        console.error('[inviteTeamMember] Error sending invitation email:', inviteError)
        // Cleanup the database record if email sending fails
        await supabaseAdmin
            .from('team_invitations')
            .delete()
            .eq('email', normalizedEmail)
            .eq('account_id', profile.account_id)

        return { error: 'Failed to send invitation email: ' + inviteError.message }
    }

    revalidatePath('/admin/settings/team')
    return { success: true, message: 'Invitation sent successfully' }
}

/**
 * Remove team member or cancel invitation
 */
export async function removeTeamMember(memberId: string) {
    const { getAccountContext } = await import('@/core/tenancy/account-context')
    const context = await getAccountContext()

    if (!context.ok) {
        return { error: context.error }
    }

    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can remove team members' }
    }

    const { createAdminClient } = await import('@/core/db/admin')
    const supabaseAdmin = createAdminClient()

    // Don't allow removing yourself
    if (memberId === context.user.id) {
        return { error: 'Cannot remove yourself' }
    }


    try {

        // 2. First, check if it's a profile (Active Member)
        const { data: targetProfile, error: profileFetchError } = await supabaseAdmin
            .from('profiles')
            .select('id, account_id, full_name, email, role')
            .eq('id', memberId)
            .maybeSingle();

        if (profileFetchError) {
            console.error('[removeTeamMember] Error fetching profile:', profileFetchError);
            return { error: 'Database error fetching profile: ' + profileFetchError.message };
        }

        if (targetProfile) {
            const targetAccountId = typeof targetProfile === 'object' && targetProfile !== null && 'account_id' in targetProfile
                ? (targetProfile as Record<string, unknown>).account_id
                : null

            if (targetAccountId !== context.profile.account_id) {
                console.error(`[removeTeamMember] Account mismatch! Caller: ${context.profile.account_id}, Target: ${targetAccountId}`);
                return { error: 'Access denied: Member belongs to another account' };
            }

            // Delete profile first
            const { error: delProfileError } = await supabaseAdmin.from('profiles').delete().eq('id', memberId);
            if (delProfileError) {
                console.error('[removeTeamMember] Error deleting profile:', delProfileError);
                return { error: 'Failed to delete profile: ' + delProfileError.message };
            }

            // Then delete auth user
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(memberId);
            if (authError) {
                console.warn('[removeTeamMember] Auth user deletion warning (user might already be gone):', authError.message);
                // We don't return error here because the profile is already gone, which effectively removes them from the team
            }
            
            revalidatePath('/admin/settings/team');
            return { success: true };
        }

        // 3. If not found in profiles, check if it's an invitation (Pending Member)
        const { data: targetInvite, error: inviteFetchError } = await supabaseAdmin
            .from('team_invitations')
            .select('id, account_id, email, role')
            .eq('id', memberId)
            .maybeSingle();

        if (inviteFetchError) {
            console.error('[removeTeamMember] Error fetching invitation:', inviteFetchError);
            return { error: 'Database error fetching invitation: ' + inviteFetchError.message };
        }

        if (targetInvite) {
            const inviteAccountId = typeof targetInvite === 'object' && targetInvite !== null && 'account_id' in targetInvite
                ? (targetInvite as Record<string, unknown>).account_id
                : null
            const inviteEmail = typeof targetInvite === 'object' && targetInvite !== null && 'email' in targetInvite
                ? (targetInvite as Record<string, unknown>).email
                : null

            if (inviteAccountId !== context.profile.account_id) {
                console.error(`[removeTeamMember] Account mismatch on invite! Caller: ${context.profile.account_id}, Target: ${inviteAccountId}`);
                return { error: 'Access denied: Invitation belongs to another account' };
            }

            // Delete invitation record
            const { error: delInviteError } = await supabaseAdmin.from('team_invitations').delete().eq('id', memberId);
            if (delInviteError) {
                console.error('[removeTeamMember] Error deleting invitation:', delInviteError);
                return { error: 'Failed to delete invitation record: ' + delInviteError.message };
            }

            // Clean up auth user associated with the invite
            try {
                const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                if (!listError && typeof inviteEmail === 'string') {
                    const invitedUser = users.find(u => u.email?.toLowerCase() === inviteEmail.toLowerCase());
                    if (invitedUser) {
                        await supabaseAdmin.auth.admin.deleteUser(invitedUser.id);
                    }
                }
            } catch (cleanupErr: unknown) {
                console.warn('[removeTeamMember] Non-critical auth cleanup error:', getErrorMessage(cleanupErr));
            }

            revalidatePath('/admin/settings/team');
            return { success: true };
        }

        console.error(`[removeTeamMember] NO TARGET FOUND for ID: ${memberId}`);
        return { error: 'Member or invitation not found' };
    } catch (err: unknown) {
        console.error('[removeTeamMember] UNEXPECTED SYSTEM ERROR:', getErrorMessage(err));
        return { error: 'Critical system error: ' + getErrorMessage(err) };
    }
}

/**
 * Update user password
 */
export async function updateProfilePassword(password: string) {
    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(preferences: Partial<Pick<Profile, 'email_alerts' | 'push_notifications' | 'sms_updates'>>) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('profiles')
        .update(preferences)
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/profile')
    return { success: true }
}

/**
 * Upload profile avatar
 */
const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const AVATAR_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function uploadProfileAvatar(formData: FormData) {
    const supabase = await createClient()
    const file = formData.get('avatar') as File
    if (!file) return { error: 'No file provided' }

    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
        return { error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.' }
    }

    if (file.size > AVATAR_MAX_BYTES) {
        return { error: 'File too large. Maximum size is 5 MB.' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${user.id}-${crypto.randomUUID()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Delete old avatar before uploading new one to prevent storage accumulation
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single()

    const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, { upsert: false })

    if (uploadError) {
        return { error: uploadError.message }
    }

    const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath)

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

    if (updateError) {
        // Clean up newly uploaded file if DB update fails
        await supabase.storage.from('profiles').remove([filePath]).catch(() => {})
        return { error: updateError.message }
    }

    // Remove old avatar file from storage after successful update
    if (existingProfile?.avatar_url) {
        try {
            const oldUrl = new URL(existingProfile.avatar_url)
            const oldPath = oldUrl.pathname.split('/profiles/').at(1)
            if (oldPath) {
                await supabase.storage.from('profiles').remove([oldPath]).catch(() => {})
            }
        } catch (err: unknown) {
            console.debug('[uploadProfileAvatar] Old file cleanup error (non-critical):', getErrorMessage(err))
        }
    }

    revalidatePath('/admin/profile')
    return { success: true, avatar_url: publicUrl }
}

/**
 * Ensure the current user has an account associated with their profile.
 * If not, create a default account and link it.
 */
export async function ensureAccount(userId: string) {
    const supabase = await createClient();

    // 1. Check existing profile
    const { data: profile, error: _profileError } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', userId)
        .single();

    const existingAccountId = profile && typeof profile === 'object' && 'account_id' in profile
        ? (profile as Record<string, unknown>).account_id
        : null

    if (existingAccountId) {
        return { account_id: existingAccountId, profile };
    }

    // 2. No account found, initialize with admin client

    try {
        const { createAdminClient } = await import('@/core/db/admin');
        const adminSupabase = createAdminClient();

        // Check if account already exists for this user (safeguard)
        // If profile doesn't exist at all, we create it.

        let accountId = existingAccountId as string | null;

        if (!accountId) {
            // Create a default account
            const { data: newAccount, error: accountError } = await adminSupabase
                .from('accounts')
                .insert({ name: 'Default Account' })
                .select()
                .single();

            if (accountError) throw new Error('Failed to create default account: ' + accountError.message);
            accountId = typeof newAccount === 'object' && newAccount !== null && 'id' in newAccount
                ? String((newAccount as Record<string, unknown>).id)
                : null;

            if (!accountId) throw new Error('Failed to extract account ID from new account');
        }

        // Create or Update profile with the new account_id
        const profileRole = profile && typeof profile === 'object' && 'role' in profile
            ? (profile as Record<string, unknown>).role as string
            : 'admin'
        const profileFullName = profile && typeof profile === 'object' && 'full_name' in profile
            ? (profile as Record<string, unknown>).full_name as string
            : 'Admin User'

        const profileData = {
            id: userId,
            account_id: accountId,
            role: profileRole || 'admin',
            full_name: profileFullName || 'Admin User'
        };

        const { data: updatedProfile, error: updateError } = await adminSupabase
            .from('profiles')
            .upsert(profileData)
            .select()
            .single();

        if (updateError) throw new Error('Failed to update profile: ' + updateError.message);

        return { account_id: accountId, profile: updatedProfile };
    } catch (err: unknown) {
        console.error('ensureAccount initialization failed:', getErrorMessage(err));
        throw err;
    }
}

/**
 * Delete account (Offboarding)
 * DANGER: This will delete ALL data associated with the account.
 */
export async function deleteAccount() {
    const context = await getAccountContext();
    if (!context.ok) return { error: context.error };

    // ONLY admin can delete account
    if (context.profile.role !== 'admin') {
        return { error: 'Unauthorized: Only account admins can delete the entire account.' };
    }

    const supabase = await createClient();

    // ON DELETE CASCADE in the database handles all related tables (leads, profiles, integrations, etc.)
    const { error } = await supabase.from('accounts').delete().eq('id', context.accountId);
    
    if (error) {
        console.error('Error deleting account:', error);
        return { error: error.message };
    }

    // In a production app, we might also want to:
    // 1. Cancel Paddle subscription if active
    // 2. Delete storage files (logos, avatars) - though RLS and periodic cleanup can handle this
    // 3. Clear auth user metadata

    revalidatePath('/');
    return { success: true };
}
