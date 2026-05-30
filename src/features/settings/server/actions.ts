'use server'

import { createClient } from '@/core/db/server'
import { createAdminClient } from '@/core/db/admin'
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { getCalendarAuthUrl } from '@/features/integrations/providers/google/calendar'
import { getSheetsAuthUrl, listSpreadsheets, getSpreadsheetSheets } from '@/features/integrations/providers/google/sheets'
import { getGmailAuthUrl } from '@/features/integrations/providers/messaging/gmail'
import type { IntegrationConfig, AccountMetadata, Integration } from '@/shared/types'
import { getAccountContext } from '@/core/tenancy/account-context'
import { getErrorMessage } from '@/core/errors/error-utils'

export type AccountSettings = {
    name: string
    business_name: string
    company_name: string
    timezone: string
    language: string
    ai_config?: {
        brand_voice?: string
        knowledge_base?: string
        auto_response_enabled?: boolean
        qualification_questions?: string[]
        response_delay_seconds?: number
        feature_toggles?: Record<string, boolean>
    }
    metadata: AccountMetadata | null
    plan?: string
    plan_id?: string
}


export async function getAccountId() {
    const context = await getAccountContext()
    return context.ok ? context.accountId : null
}

export async function getAccountSettings(): Promise<AccountSettings | null> {
    try {
        const supabase = await createClient()
        const context = await getAccountContext()
        if (!context.ok) return null

        const { data: account, error } = await supabase
            .from('accounts')
            .select('id, name, timezone, language, ai_config, metadata, plan_id')
            .eq('id', context.accountId)
            .single()

        if (error || !account) {
            console.error('Error fetching account settings:', error)
            return null
        }

        // Map internal columns to predictable UI fields
        const accountObj = account as unknown as Record<string, unknown>
        return {
            ...accountObj,
            business_name: accountObj.business_name || accountObj.company_name || accountObj.name || ''
        } as unknown as AccountSettings
    } catch (error: unknown) {
        console.error('[getAccountSettings] Fatal Error:', getErrorMessage(error));
        return null;
    }
}

export async function updateAccountSettings(settings: Partial<AccountSettings>) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }
    
    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can update account settings' }
    }

    // Prepare update payload
    // We sync 'name' with 'business_name' input if it's updated
    // to ensure consistency across the database schema.
    const { business_name, company_name: _c, ...otherSettings } = settings
    const updatePayload: Record<string, unknown> = { ...otherSettings }
    
    if (business_name) {
        updatePayload.name = business_name
    }
    
    if (settings.ai_config) {
        const { data: account } = await supabase
            .from('accounts')
            .select('ai_config')
            .eq('id', context.accountId)
            .single()
        
        const currentConfig = account?.ai_config || {}
        updatePayload.ai_config = { ...(currentConfig as Record<string, unknown>), ...settings.ai_config }
    }


    const { error } = await supabase
        .from('accounts')
        .update(updatePayload)
        .eq('id', context.accountId)

    if (error) {
        console.error('Update settings error:', error)
        return { error: error.message }
    }

    revalidatePath('/admin/settings')
    revalidatePath('/admin', 'layout')
    return { success: true }
}

export async function toggleFeature(featureKey: string, enabled: boolean) {
    console.log('[toggleFeature] Start:', { featureKey, enabled })
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) {
        console.error('[toggleFeature] Context error:', context.error)
        return { error: context.error }
    }

    console.log('[toggleFeature] Account ID:', context.accountId)

    const { data: account } = await supabase
        .from('accounts')
        .select('ai_config')
        .eq('id', context.accountId)
        .single()

    const currentConfig = typeof account?.ai_config === 'object' && account.ai_config !== null
        ? (account.ai_config as Record<string, unknown>)
        : {}
    const featureToggles = currentConfig.feature_toggles || {}
    
    const newConfig = {
        ...currentConfig,
        feature_toggles: {
            ...featureToggles,
            [featureKey]: enabled
        }
    }

    console.log('[toggleFeature] Updating AI Config:', JSON.stringify(newConfig, null, 2))

    const { error } = await supabase
        .from('accounts')
        .update({ ai_config: newConfig })
        .eq('id', context.accountId)

    if (error) {
        console.error('[toggleFeature] DB Error:', error)
        return { error: error.message }
    }
    
    console.log('[toggleFeature] Success, revalidating...')
    revalidatePath('/admin/settings')
    revalidatePath('/admin', 'layout')
    return { success: true }
}

const _getIntegrationsCached = (accountId: string) => unstable_cache(
    async () => {
        try {
            const supabase = createAdminClient()
            const { data: integrations, error } = await supabase
                .from('integrations')
                .select('id, account_id, provider, status, config, is_primary, created_at, metadata')
                .eq('account_id', accountId)

            if (error) {
                console.error('Error fetching integrations:', error)
                return []
            }

            return (integrations || []) as unknown as Integration[]
        } catch (error: unknown) {
            console.error('[getIntegrations cache] Fatal Error:', getErrorMessage(error));
            return [];
        }
    },
    [`integrations-${accountId}`],
    { revalidate: 3600, tags: [`integrations-${accountId}`] }
)()

export async function getIntegrations() {
    try {
        const context = await getAccountContext()
        if (!context.ok) return []

        return await _getIntegrationsCached(context.accountId)
    } catch (error: unknown) {
        console.error('[getIntegrations] Fatal Error:', getErrorMessage(error));
        return [];
    }
}

export async function updateIntegrationConfig(provider: string, config: IntegrationConfig) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can manage integrations' }
    }

    // Check if integration exists
    const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('account_id', context.accountId)
        .eq('provider', provider)
        .single()

    if (existing) {
        // Update existing with account check (safety)
        const { error } = await supabase
            .from('integrations')
            .update({
                config: config as any,
                status: 'connected'
            })
            .eq('id', existing.id)
            .eq('account_id', context.accountId)

        if (error) return { error: error.message }
    } else {
        // Create new
        const { error } = await supabase
            .from('integrations')
            .insert({
                account_id: context.accountId,
                provider,
                config: config as any,
                status: 'connected'
            })

        if (error) return { error: error.message }
    }

    revalidatePath('/admin/settings')
    revalidateTag(`integrations-${context.accountId}`)
    return { success: true }
}

export async function disconnectIntegration(provider: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can disconnect integrations' }
    }

    const { error } = await supabase
        .from('integrations')
        .update({ status: 'disconnected', config: {} })
        .eq('account_id', context.accountId)
        .eq('provider', provider)

    if (error) return { error: error.message }

    revalidatePath('/admin/settings')
    revalidateTag(`integrations-${context.accountId}`)
    return { success: true }
}

/** Disconnect a specific Gmail integration by ID. If it was primary, promotes the next connected Gmail. */
export async function disconnectGmailIntegration(integrationId: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can disconnect integrations' }
    }

    // Verify ownership
    const { data: integration } = await supabase
        .from('integrations')
        .select('id, is_primary')
        .eq('id', integrationId)
        .eq('account_id', context.accountId)
        .single()

    if (!integration) return { error: 'Integration not found' }

    const { error } = await supabase
        .from('integrations')
        .update({ status: 'disconnected', config: {}, is_primary: false })
        .eq('id', integrationId)

    if (error) return { error: error.message }

    // If this was primary, promote the next connected Gmail
    const integrationObj = integration as Record<string, unknown>
    if (integrationObj.is_primary === true) {
        const { data: next } = await supabase
            .from('integrations')
            .select('id')
            .eq('account_id', context.accountId)
            .eq('provider', 'gmail')
            .eq('status', 'connected')
            .neq('id', integrationId)
            .limit(1)
            .maybeSingle()

        if (next && typeof next === 'object' && 'id' in next) {
            const nextObj = next as Record<string, unknown>
            await supabase
                .from('integrations')
                .update({ is_primary: true })
                .eq('id', nextObj.id as string)
        }
    }

    revalidatePath('/admin/settings')
    return { success: true }
}

/** Set a Gmail integration as the primary one for the account. */
export async function setPrimaryGmailIntegration(integrationId: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can manage integrations' }
    }

    // Verify ownership and that it's a Gmail integration
    const { data: integration } = await supabase
        .from('integrations')
        .select('id')
        .eq('id', integrationId)
        .eq('account_id', context.accountId)
        .eq('provider', 'gmail')
        .single()

    if (!integration) return { error: 'Gmail integration not found' }

    // Unset current primary across all email providers
    await supabase
        .from('integrations')
        .update({ is_primary: false })
        .eq('account_id', context.accountId)
        .in('provider', ['email', 'gmail'])

    // Set new primary
    const { error } = await supabase
        .from('integrations')
        .update({ is_primary: true })
        .eq('id', integrationId)

    if (error) return { error: error.message }

    revalidatePath('/admin/settings')
    return { success: true }
}

/** Update the display label for a Gmail integration. */
export async function updateGmailLabel(integrationId: string, label: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    const { data: check } = await supabase
        .from('integrations')
        .select('id')
        .eq('id', integrationId)
        .eq('account_id', context.accountId)
        .single()

    if (!check) return { error: 'Integration not found' }

    const { error } = await supabase
        .from('integrations')
        .update({ label })
        .eq('id', integrationId)

    if (error) return { error: error.message }

    revalidatePath('/admin/settings')
    return { success: true }
}

export async function getCalendarAuth() {
    try {
        return await getCalendarAuthUrl()
    } catch (e: unknown) {
        console.error('getCalendarAuth error:', getErrorMessage(e))
        return { error: getErrorMessage(e) || 'An error occurred while connecting to Google Calendar' }
    }
}

export async function getSheetsAuth() {
    try {
        return await getSheetsAuthUrl()
    } catch (e: unknown) {
        console.error('getSheetsAuth error:', getErrorMessage(e))
        return { error: getErrorMessage(e) || 'An error occurred while connecting to Google Sheets' }
    }
}

export async function getGmailAuth() {
    try {
        return await getGmailAuthUrl()
    } catch (e: unknown) {
        console.error('getGmailAuth error:', getErrorMessage(e))
        return { error: getErrorMessage(e) || 'An error occurred while connecting to Gmail' }
    }
}

export async function listSpreadsheetsAction(integrationId: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    const { data: check } = await supabase.from('integrations').select('id').eq('id', integrationId).eq('account_id', context.accountId).single()
    if (!check) return { error: 'Unauthorized' }

    return await listSpreadsheets(integrationId)
}

export async function getSpreadsheetSheetsAction(integrationId: string, spreadsheetId: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    const { data: check } = await supabase.from('integrations').select('id').eq('id', integrationId).eq('account_id', context.accountId).single()
    if (!check) return { error: 'Unauthorized' }

    try {
        return await getSpreadsheetSheets(integrationId, spreadsheetId)
    } catch (e: unknown) {
        return { error: getErrorMessage(e) || 'Failed to get spreadsheet sheets' }
    }
}

export async function manualSyncSheets(integrationId: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can trigger manual sync' }
    }

    const { data: check } = await supabase.from('integrations').select('id').eq('id', integrationId).eq('account_id', context.accountId).single()
    if (!check) return { error: 'Unauthorized' }

    try {
        const { triggerManualSheetImport } = await import('@/features/integrations/providers/google/sheets')
        return await triggerManualSheetImport(integrationId)
    } catch (e: unknown) {
        return { error: getErrorMessage(e) || 'Failed to sync sheets manually' }
    }
}

export async function manualSyncGmail(integrationId: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can trigger manual sync' }
    }

    const { data: check } = await supabase.from('integrations').select('id').eq('id', integrationId).eq('account_id', context.accountId).single()
    if (!check) return { error: 'Unauthorized' }

    try {
        const { processGmailInbox } = await import('@/features/integrations/providers/messaging/gmail')
        return await processGmailInbox(integrationId)
    } catch (e: unknown) {
        return { error: getErrorMessage(e) || 'Failed to sync Gmail manually' }
    }
}

export async function connectSmtpAccountAction(params: any) {
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can manage integrations' }
    }

    try {
        const { connectSmtpAccount } = await import('@/features/integrations/providers/messaging/smtp')
        const result = await connectSmtpAccount(params)
        if (result.success) {
            revalidatePath('/admin/settings')
        }
        return result
    } catch (e: unknown) {
        return { error: getErrorMessage(e) || 'An error occurred while connecting SMTP account' }
    }
}

export async function testSmtpConnectionAction(params: any) {
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can test integrations' }
    }

    try {
        const { testSmtpConnection } = await import('@/features/integrations/providers/messaging/smtp')
        return await testSmtpConnection(params)
    } catch (e: unknown) {
        return { error: getErrorMessage(e) || 'An error occurred while testing SMTP connection' }
    }
}

export async function disconnectSmtpIntegration(integrationId: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can disconnect integrations' }
    }

    const { data: integration } = await supabase
        .from('integrations')
        .select('id, is_primary')
        .eq('id', integrationId)
        .eq('account_id', context.accountId)
        .single()

    if (!integration) return { error: 'Integration not found' }

    const { error } = await supabase
        .from('integrations')
        .update({ status: 'disconnected', config: {}, is_primary: false })
        .eq('id', integrationId)

    if (error) return { error: error.message }

    const integrationObj = integration as Record<string, unknown>
    if (integrationObj.is_primary === true) {
        const { data: next } = await supabase
            .from('integrations')
            .select('id')
            .eq('account_id', context.accountId)
            .eq('provider', 'email')
            .eq('status', 'connected')
            .neq('id', integrationId)
            .limit(1)
            .maybeSingle()

        if (next && typeof next === 'object' && 'id' in next) {
            const nextObj = next as Record<string, unknown>
            await supabase.from('integrations').update({ is_primary: true }).eq('id', nextObj.id as string)
        }
    }

    revalidatePath('/admin/settings')
    return { success: true }
}

export async function setPrimarySmtpIntegration(integrationId: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can manage integrations' }
    }

    const { data: integration } = await supabase
        .from('integrations')
        .select('id')
        .eq('id', integrationId)
        .eq('account_id', context.accountId)
        .eq('provider', 'email')
        .single()

    if (!integration) return { error: 'SMTP integration not found' }

    await supabase.from('integrations').update({ is_primary: false }).eq('account_id', context.accountId).in('provider', ['email', 'gmail'])
    const { error } = await supabase.from('integrations').update({ is_primary: true }).eq('id', integrationId)

    if (error) return { error: error.message }

    revalidatePath('/admin/settings')
    return { success: true }
}

export async function manualSyncSmtp(integrationId: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    if ((context.profile.role as string) !== 'admin' && (context.profile.role as string) !== 'super_admin') {
        return { error: 'Only admins can trigger manual sync' }
    }

    const { data: check } = await supabase.from('integrations').select('id').eq('id', integrationId).eq('account_id', context.accountId).single()
    if (!check) return { error: 'Unauthorized' }

    try {
        const { processSmtpInbox } = await import('@/features/integrations/providers/messaging/smtp')
        return await processSmtpInbox(integrationId)
    } catch (e: unknown) {
        return { error: getErrorMessage(e) || 'Failed to sync SMTP manually' }
    }
}

export async function updateSmtpLabel(integrationId: string, label: string) {
    const supabase = await createClient()
    const context = await getAccountContext()
    if (!context.ok) return { error: context.error }

    const { data: check } = await supabase.from('integrations').select('id').eq('id', integrationId).eq('account_id', context.accountId).single()
    if (!check) return { error: 'Integration not found' }

    const { error } = await supabase.from('integrations').update({ label }).eq('id', integrationId)
    if (error) return { error: error.message }

    revalidatePath('/admin/settings')
    return { success: true }
}
