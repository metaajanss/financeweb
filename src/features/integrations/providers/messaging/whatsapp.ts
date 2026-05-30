'use server'

import { createAdminClient } from '@/core/db/admin'
import { fetchWithRetry } from '@/core/http/fetch'
import type { Database } from '@/shared/types'
import type { MetaConfig, WhatsAppConfig } from '@/shared/types'
import { triggerWebhook } from '@/core/webhooks/dispatch'

/**
 * Meta Service for handling Lead Ads and Graph API interactions
 */

export interface MetaLeadDetails {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
}

interface MetaFieldData {
    name: string;
    values: string[];
}

/**
 * Generate Meta OAuth URL for Lead Ads & WhatsApp integration
 */
export async function getMetaAuthUrl() {
    const appId = process.env.META_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`;
    const scopes = [
        'leads_retrieval', 
        'ads_management', 
        'pages_show_list', 
        'pages_manage_ads', 
        'pages_read_engagement',
        'whatsapp_business_management',
        'whatsapp_business_messaging'
    ];
    
    if (!appId) {
        console.warn('[MetaService] META_APP_ID is not defined');
        return '';
    }

    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join(',')}&response_type=code`;
}

/**
 * Fetch lead details from Meta Graph API using leadgen_id
 */
export async function fetchMetaLeadDetails(leadgenId: string, accessToken: string): Promise<MetaLeadDetails | null> {
    try {
        const response = await fetchWithRetry(
            `https://graph.facebook.com/v18.0/${leadgenId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                timeoutMs: 10000,
                retries: 1,
            }
        )

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error?.message || 'Failed to fetch Meta lead data')
        }

        const data = await response.json()

        // Extract field data
        const fieldData = (data.field_data || []) as MetaFieldData[]
        const result: MetaLeadDetails = {}

        fieldData.forEach((field) => {
            if (field.name === 'first_name') result.firstName = field.values[0]
            if (field.name === 'last_name') result.lastName = field.values[0]
            if (field.name === 'email') result.email = field.values[0]
            if (field.name === 'phone_number') result.phone = field.values[0]
            // Map common aliases
            if (field.name === 'full_name' && !result.firstName && field.values[0]) {
                const parts = field.values[0].split(' ')
                result.firstName = parts[0]
                result.lastName = parts.slice(1).join(' ')
            }
        })

        return result
    } catch (error) {
        console.error('Error fetching Meta lead details:', error)
        return null
    }
}


interface MetaWebhookBody {
    entry?: Array<{
        id: string;
        changes?: Array<{
            value: {
                leadgen_id: string;
            };
        }>;
    }>;
}

/**
 * Process a Meta Lead Ads webhook notification
 */
export async function processMetaLeadGen(
    body: MetaWebhookBody,
    integration: Database['public']['Tables']['integrations']['Row']
) {
    const supabase = createAdminClient()

    // Structure: entry[0].changes[0].value.leadgen_id
    const leadgenId = body.entry?.[0]?.changes?.[0]?.value?.leadgen_id
    if (!leadgenId) return { success: false, error: 'No leadgen_id found' }

    const metaConfig = integration.config as MetaConfig | WhatsAppConfig | null
    if (!metaConfig?.access_token) {
        return { success: false, error: 'Meta integration missing access token' }
    }

    const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('account_id', integration.account_id)
        .contains('metadata', { meta_leadgen_id: leadgenId })
        .maybeSingle()

    if (existingLead) {
        return { success: true, leadId: existingLead.id, duplicate: true }
    }

    const leadData = await fetchMetaLeadDetails(leadgenId, metaConfig.access_token)

    if (!leadData) {
        return { success: false, error: 'Failed to fetch lead details from Meta' }
    }

    // Save lead to database
    const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
            account_id: integration.account_id,
            first_name: leadData.firstName || 'Meta',
            last_name: leadData.lastName || 'Lead',
            email: leadData.email,
            phone: leadData.phone,
            source: 'meta_ads',
            status: 'new',
            metadata: { meta_leadgen_id: leadgenId }
        })
        .select('*')
        .single()

    if (leadError || !newLead) {
        return { success: false, error: leadError?.message || 'Failed to create lead' }
    }

    const typedNewLead = newLead as unknown as import('@/shared/types').LeadRow

    // Trigger Outgoing Webhook
    await triggerWebhook(integration.account_id, 'lead.created', typedNewLead).catch(e => console.error('Meta Lead Webhook Error:', e))

    return { success: true, leadId: typedNewLead.id }
}
