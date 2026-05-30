'use server'

import { createClient } from '@/core/db/server'
import { createAdminClient } from '@/core/db/admin'
import { revalidatePath } from 'next/cache'
import { createBot, deleteBot, stopBot } from '@/features/avatar/services/recall-bridge'
import { logEvent } from '@/features/notifications'
import { hasAccess, type SubscriptionPlan } from '@/config/plans'
import { signAvatarToken } from '@/features/avatar/services/token'

/**
 * Surface bot spawn / lifecycle failures to account admins via the
 * notifications table so operators see them in real time instead of
 * discovering them later in log queries.
 */
async function notifyAvatarFailure(
    accountId: string,
    meetingId: string,
    title: string,
    message: string,
): Promise<void> {
    try {
        const admin = createAdminClient()
        const { data: admins } = await admin
            .from('profiles')
            .select('id')
            .eq('account_id', accountId)
            .eq('role', 'admin')
        if (admins && admins.length > 0) {
            await admin.from('notifications').insert(
                admins.map(a => ({
                    user_id: a.id,
                    account_id: accountId,
                    title,
                    message,
                    type: 'error',
                    link: `/dashboard/meetings/${meetingId}`,
                    read: false,
                })),
            )
        }
    } catch (err) {
        console.error('[avatar.notifyAvatarFailure] notifications insert failed:', err)
    }
}

interface EnableAvatarResult {
    success: boolean
    error?: string
    botId?: string
    message?: string
}

interface DisableAvatarResult {
    success: boolean
    error?: string
    message?: string
}

function buildAvatarRendererUrl(token: string): string | null {
    const base =
        process.env.AVATAR_RENDERER_BASE_URL?.trim() ||
        (process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')}/avatar-renderer` : null)
    if (!base) return null
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}token=${encodeURIComponent(token)}`
}

/**
 * Enable AI Avatar for a specific meeting.
 * This creates a Recall.ai bot whose video output is the /avatar-renderer page,
 * effectively projecting the Anam AI avatar into the meeting.
 */
export async function enableAvatarForMeeting(meetingId: string): Promise<EnableAvatarResult> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: 'Unauthorized', success: false }
    }

    type JoinedAccount = {
        plan_id: string | null
        subscription_status: string | null
        ai_config: Record<string, unknown> | null
    }
    type ProfileWithAccount = {
        account_id: string | null
        role: string | null
        accounts: JoinedAccount | null
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id, role, accounts(plan_id, subscription_status, ai_config)')
        .eq('id', user.id)
        .single<ProfileWithAccount>()

    if (profileError || !profile?.account_id) {
        return { error: 'No account found', success: false }
    }

    const accountId = profile.account_id
    const account = profile.accounts
    const plan = ((account?.plan_id || 'free').toLowerCase()) as SubscriptionPlan
    // Treat unset or the legacy placeholder 'admin@admin.com' as no admin
    // configured. Without this guard, a fresh deploy that forgets to set
    // ADMIN_EMAIL would silently grant bypass to anyone who registered the
    // placeholder address.
    const rawAdminEmail = process.env.ADMIN_EMAIL
    const adminEmail = (!rawAdminEmail || rawAdminEmail === 'admin@admin.com') ? null : rawAdminEmail
    const isAdminBypass = adminEmail !== null && user.email === adminEmail

    if (!isAdminBypass && !hasAccess(plan, 'pro')) {
        return { error: 'AI Avatar Pro veya Business plan gerektirir', success: false }
    }
    if (!isAdminBypass && (account?.subscription_status === 'canceled' || account?.subscription_status === 'past_due' || account?.subscription_status === 'paused')) {
        return { error: 'Aboneliğiniz aktif değil', success: false }
    }

    const aiConfig = (account?.ai_config ?? {}) as { avatar_config?: { enabled?: boolean; persona_id?: string } }
    const avatarConfig = aiConfig.avatar_config ?? {}
    if (!avatarConfig?.enabled) {
        return { error: 'Avatar AI Ayarları sekmesinden etkinleştirilmedi', success: false }
    }
    const resolvedPersona = (avatarConfig.persona_id || '').trim() || (process.env.ANAM_PERSONA_ID || '').trim()
    if (!resolvedPersona) {
        return { error: 'Avatar için persona seçilmemiş', success: false }
    }

    // Fetch the meeting to ensure it belongs to the account and get meeting details
    const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('id, title, meeting_link, scheduled_at, status, ai_avatar_enabled')
        .eq('id', meetingId)
        .eq('account_id', accountId)
        .single()

    if (meetingError || !meeting) {
        return { error: 'Meeting not found', success: false }
    }

    if (meeting.ai_avatar_enabled) {
        return { error: 'AI Avatar is already enabled for this meeting', success: false }
    }
    if (!meeting.meeting_link) {
        return { error: 'Meeting must have a meeting link to enable AI Avatar', success: false }
    }
    if (meeting.status === 'cancelled' || meeting.status === 'completed') {
        return { error: 'Cannot enable AI Avatar for cancelled or completed meetings', success: false }
    }

    let token: string
    let rendererUrl: string | null
    try {
        token = await signAvatarToken({ account_id: accountId, meeting_id: meeting.id, persona_id: resolvedPersona })
        rendererUrl = buildAvatarRendererUrl(token)
    } catch (e: any) {
        console.error('[enableAvatarForMeeting] Token signing failed:', e)
        return { error: 'Avatar token oluşturulamadı: ' + (e?.message || ''), success: false }
    }
    if (!rendererUrl) {
        return { error: 'AVATAR_RENDERER_BASE_URL veya NEXT_PUBLIC_SITE_URL tanımlı değil', success: false }
    }

    try {
        const botResult = await createBot({
            meeting_url: meeting.meeting_link,
            meeting_id: meeting.id,
            account_id: accountId,
            join_at: meeting.scheduled_at,
            output_video_webpage_url: rendererUrl,
        })

        if (!botResult || !botResult.id) {
            return { error: 'Failed to create avatar bot: No ID returned', success: false }
        }

        // Optimistic CAS: only flip ai_avatar_enabled if it's still false.
        // Concurrent callers (double-click, retry) that already created a bot
        // would otherwise both succeed and orphan one of the bots in Recall.
        const { data: updatedRows, error: updateError } = await supabase
            .from('meetings')
            .update({
                ai_avatar_enabled: true,
                ai_avatar_bot_id: botResult.id,
                ai_avatar_status: 'pending',
            })
            .eq('id', meetingId)
            .eq('account_id', accountId)
            .eq('ai_avatar_enabled', false)
            .select('id')

        if (updateError) {
            // botResult.id is non-null here — guaranteed by the check above.
            await deleteBot(botResult.id).catch((cleanupErr: any) => {
                console.error('[enableAvatarForMeeting] Bot cleanup failed after update error:', {
                    botId: botResult.id,
                    meetingId,
                    cleanupError: cleanupErr?.message,
                    originalUpdateError: updateError.message,
                })
            })
            await logEvent('avatar.enable_failed', 'meeting', meetingId, {
                bot_id: botResult.id,
                reason: updateError.message,
            }).catch(() => { /* logEvent should not throw */ })
            return { error: 'Failed to update meeting: ' + updateError.message, success: false }
        }

        if (!updatedRows || updatedRows.length === 0) {
            // Lost the race — another concurrent request already enabled the
            // avatar. Tear down the bot we just created so it doesn't orphan.
            await deleteBot(botResult.id).catch((cleanupErr: any) => {
                console.error('[enableAvatarForMeeting] Race-loser bot cleanup failed:', {
                    botId: botResult.id,
                    meetingId,
                    cleanupError: cleanupErr?.message,
                })
            })
            return { error: 'AI Avatar is already enabled for this meeting', success: false }
        }

        await logEvent('avatar.enabled', 'meeting', meetingId, {
            title: meeting.title,
            bot_id: botResult.id
        })

        revalidatePath('/admin/calendar')
        revalidatePath(`/admin/calendar/${meetingId}`)

        return {
            success: true,
            botId: botResult.id,
            message: 'AI Avatar enabled successfully'
        }
    } catch (error: any) {
        console.error('Error enabling avatar for meeting:', error)
        await notifyAvatarFailure(
            accountId,
            meetingId,
            'AI Avatar Etkinleştirilemedi',
            `Toplantı için avatar başlatılamadı: ${error?.message || 'bilinmeyen hata'}`,
        )
        return { error: error.message || 'Failed to enable AI Avatar', success: false }
    }
}

/**
 * Disable AI Avatar for a specific meeting.
 * Stops the bot first (graceful leave), then removes the record.
 */
export async function disableAvatarForMeeting(meetingId: string): Promise<DisableAvatarResult> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: 'Unauthorized', success: false }
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.account_id) {
        return { error: 'No account found', success: false }
    }

    const accountId = profile.account_id

    const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('id, title, ai_avatar_enabled, ai_avatar_bot_id, ai_avatar_status')
        .eq('id', meetingId)
        .eq('account_id', accountId)
        .single()

    if (meetingError || !meeting) {
        return { error: 'Meeting not found', success: false }
    }
    if (!meeting.ai_avatar_enabled) {
        return { error: 'AI Avatar is not enabled for this meeting', success: false }
    }

    try {
        let botDeleted = true
        if (meeting.ai_avatar_bot_id) {
            // Stop first (works while the bot is in-call), then delete the record.
            try { await stopBot(meeting.ai_avatar_bot_id) } catch (e: any) {
                console.warn('[disableAvatarForMeeting] stopBot failed:', e?.message)
            }
            try {
                await deleteBot(meeting.ai_avatar_bot_id)
            } catch (e: any) {
                console.error('[disableAvatarForMeeting] deleteBot failed:', {
                    botId: meeting.ai_avatar_bot_id,
                    meetingId,
                    error: e?.message,
                })
                botDeleted = false
                // Keep the bot_id in DB so a later retry can clean it up.
                // The avatar is still marked disabled so the bot won't be
                // restarted, and Recall will keep the bot but it should no
                // longer receive webpage-output updates.
                await logEvent('avatar.disable_bot_cleanup_failed', 'meeting', meetingId, {
                    bot_id: meeting.ai_avatar_bot_id,
                    reason: e?.message || 'unknown',
                }).catch(() => { /* logEvent should not throw */ })
            }
        }

        const { error: updateError } = await supabase
            .from('meetings')
            .update({
                ai_avatar_enabled: false,
                ai_avatar_status: botDeleted ? 'cancelled' : 'cleanup_pending',
                // Only clear bot_id when we successfully deleted it from Recall;
                // otherwise keep the reference so an admin / retry job can
                // attempt cleanup later instead of orphaning the bot.
                ai_avatar_bot_id: botDeleted ? null : meeting.ai_avatar_bot_id,
            })
            .eq('id', meetingId)
            .eq('account_id', accountId)

        if (updateError) {
            return { error: 'Failed to update meeting: ' + updateError.message, success: false }
        }

        await logEvent('avatar.disabled', 'meeting', meetingId, {
            title: meeting.title
        })

        revalidatePath('/admin/calendar')
        revalidatePath(`/admin/calendar/${meetingId}`)

        return { success: true, message: 'AI Avatar disabled successfully' }
    } catch (error: any) {
        console.error('Error disabling avatar for meeting:', error)
        return { error: error.message || 'Failed to disable AI Avatar', success: false }
    }
}
