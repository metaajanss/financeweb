'use server'

import { createClient } from '@/core/db/server'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import type { LeadRow, GoogleSheetsConfig } from '@/shared/types'

/**
 * Google Sheets service for reading and writing spreadsheet data
 */

/**
 * Initialize OAuth2 client for Google Sheets
 */
export async function getSheetsClient(integrationId: string) {
    const supabase = await createClient()

    const { data: integration } = await supabase
        .from('integrations')
        .select('config')
        .eq('id', integrationId)
        .single()

    const config = integration?.config as unknown as GoogleSheetsConfig | null
    if (!config?.access_token) {
        throw new Error('Google Sheets not connected')
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_SHEETS_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Google OAuth credentials are not fully configured')
    }

    const oauth2Client = new OAuth2Client(
        clientId,
        clientSecret,
        redirectUri
    )

    oauth2Client.setCredentials({
        access_token: config.access_token,
        refresh_token: config.refresh_token,
        expiry_date: config.expiry_date
    })

    // Auto-refresh token if needed
    if (config.refresh_token) {
        try {
            const { credentials } = await oauth2Client.refreshAccessToken()
            oauth2Client.setCredentials(credentials)
            
            // Save updated token
            await supabase.from('integrations').update({
                config: {
                    ...config,
                    access_token: credentials.access_token,
                    expiry_date: credentials.expiry_date
                }
            }).eq('id', integrationId)
        } catch (err) {
            const error = err as Error;
            console.error('[Sheets] Auto-refresh failed:', error.message)
        }
    }

    return oauth2Client
}

/**
 * Get authorization URL for Google Sheets OAuth
 */
export async function getSheetsAuthUrl() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_SHEETS_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Google OAuth credentials are not fully configured')
    }

    const oauth2Client = new OAuth2Client(
        clientId,
        clientSecret,
        redirectUri
    )

    const scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ]

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent select_account'
    })

    return { url }
}

/**
 * List spreadsheets from user's Google Drive (with token refresh support)
 */
export async function listSpreadsheets(integrationId: string) {
    if (!integrationId) {
        return { error: 'Integration ID is required' };
    }

    try {
        const supabase = await createClient()
        const { data: integration, error: dbError } = await supabase
            .from('integrations')
            .select('config')
            .eq('id', integrationId)
            .single()

        if (dbError || !integration) {
            console.error('[Sheets] Database error or integration not found:', dbError);
            return { error: 'Integration not found or connection error' };
        }

        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET
        const redirectUri = process.env.GOOGLE_SHEETS_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI

        if (!clientId || !clientSecret || !redirectUri) {
            return { error: 'Google OAuth is not configured on the server' };
        }

        const sheetsConfig = integration.config as unknown as GoogleSheetsConfig
        if (!sheetsConfig?.access_token) {
            return { error: 'No access token found. Please reconnect your account.' };
        }

        const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri)
        oauth2Client.setCredentials({
            access_token: sheetsConfig.access_token,
            refresh_token: sheetsConfig.refresh_token,
            expiry_date: sheetsConfig.expiry_date
        })

        // Proactively refresh token if we have a refresh token
        if (sheetsConfig.refresh_token) {
            try {
                const { credentials } = await oauth2Client.refreshAccessToken()
                oauth2Client.setCredentials(credentials)
                
                // Update tokens in DB
                await supabase.from('integrations').update({
                    config: { 
                        ...sheetsConfig, 
                        access_token: credentials.access_token, 
                        expiry_date: credentials.expiry_date 
                    }
                }).eq('id', integrationId)
            } catch (refreshErr) {
                const error = refreshErr as Error;
                console.warn('[Sheets] Token refresh warning:', error.message);
                // Continue with existing token as fallback
            }
        }

        const drive = google.drive({ version: 'v3', auth: oauth2Client })
        const response = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.spreadsheet'",
            fields: 'files(id, name)',
            pageSize: 50
        })

        const files = response.data.files || []
        return { files };
    } catch (e: unknown) {
        const error = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
        console.error('[Sheets] Critical error in listSpreadsheets:', error?.response?.data || error?.message || error);
        const detailedError = error?.response?.data?.error?.message || error?.message || 'Failed to communicate with Google Drive';
        return { error: detailedError };
    }
}

/**
 * Get sheet names within a spreadsheet
 */
export async function getSpreadsheetSheets(integrationId: string, spreadsheetId: string) {
    const oauth2Client = await getSheetsClient(integrationId)
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client })

    const response = await sheets.spreadsheets.get({
        spreadsheetId
    })

    return response.data.sheets?.map(s => s.properties?.title) || []
}

/**
 * Append a row to a Google Sheet
 */
export async function appendLeadToSheet(integrationId: string, leadData: LeadRow) {
    const supabase = await createClient()
    const { data: integration } = await supabase
        .from('integrations')
        .select('config')
        .eq('id', integrationId)
        .single()

    const config = integration?.config as unknown as GoogleSheetsConfig | null
    if (!config?.spreadsheetId || !config?.mapping) {
        throw new Error('Google Sheets mapping not configured')
    }

    const oauth2Client = await getSheetsClient(integrationId)
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client })

    if (!config) {
        throw new Error('Google Sheets mapping not configured')
    }
    const { spreadsheetId, sheetName, mapping } = config

    if (!spreadsheetId || !mapping) {
        throw new Error('Google Sheets mapping is incomplete')
    }

    // mapping example: { "first_name": "A", "email": "B" }
    // We need to convert this to a row array
    const row: string[] = []
    const sortedMapping = Object.entries(mapping || {}).sort((a, b) =>
        a[1].charCodeAt(0) - b[1].charCodeAt(0)
    )

    sortedMapping.forEach(([field]) => {
        row.push(((leadData as unknown) as Record<string, string>)[field] || '')
    })

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName || 'Sheet1'}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [row]
        }
    })

    return { success: true }
}

/**
 * Import leads from a Google Sheet
 */
export async function importLeadsFromSheet(integrationId: string) {
    const supabase = await createClient()
    const { data: integration } = await supabase
        .from('integrations')
        .select('account_id, config')
        .eq('id', integrationId)
        .single()

    const config = integration?.config as unknown as GoogleSheetsConfig | null
    if (!config?.spreadsheetId || !config?.mapping) {
        throw new Error('Google Sheets mapping not configured')
    }

    const oauth2Client = await getSheetsClient(integrationId)
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client })

    if (!config) {
        throw new Error('Google Sheets mapping not configured')
    }
    const { spreadsheetId, sheetName, mapping } = config

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName || 'Sheet1'}!A2:Z` // Assume A1 is header
    })

    const rows = response.data.values || []
    let importedCount = 0
    const lastSyncedRow = config.lastSyncedRow || 0
    const newRows = rows.slice(lastSyncedRow)

    for (const row of newRows) {
        if (!integration) continue;
        const leadData: Record<string, unknown> = {
            account_id: integration.account_id,
            source: 'google_sheets_import',
            status: 'new',
            metadata: { imported_from_sheets: true, import_date: new Date().toISOString() }
        };

        Object.entries(mapping || {}).forEach(([field, col]) => {
            const colIndex = col.charCodeAt(0) - 65 // A=0, B=1, etc.
            if (row[colIndex]) {
                leadData[field] = row[colIndex] as string;
            }
        })

        if (leadData.email || leadData.phone) {
            // Check for potential duplicates within the account
            const { data: existing } = await supabase
                .from('leads')
                .select('id')
                .eq('account_id', integration?.account_id)
                .or(`email.eq.${leadData.email || '___nonexistent___'},phone.eq.${leadData.phone || '___nonexistent___'}`)
                .maybeSingle()

            if (!existing) {
                const { error } = await supabase.from('leads').insert(leadData as any) // Supabase insert needs better typing but any is common here for dynamic objects
                if (!error) importedCount++
            }
        }
    }

    // Update last synced row
    if (newRows.length > 0) {
        await supabase
            .from('integrations')
            .update({
                config: {
                    ...config,
                    lastSyncedRow: (config.lastSyncedRow || 0) + newRows.length
                },
                last_synced_at: new Date().toISOString()
            })
            .eq('id', integrationId)
    }

    if (importedCount > 0) {
        const { revalidatePath } = await import('next/cache')
        revalidatePath('/admin/leads')
    }

    return { importedCount }
}


/**
 * Action to manually trigger sync
 */
export async function triggerManualSheetImport(integrationId: string) {
    return await importLeadsFromSheet(integrationId)
}

/**
 * Bulk exports given leads to the configured Google Sheet
 */
export async function bulkExportToSheet(integrationId: string, leads: LeadRow[]) {
    if (!leads || leads.length === 0) return { success: true, count: 0 }

    const supabase = await createClient()

    const { data: integration, error: intError } = await supabase
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .single()

    if (intError || !integration || integration.status !== 'connected') {
        throw new Error('Google Sheets integration not active')
    }

    const bulkConfig = integration.config as unknown as GoogleSheetsConfig
    const { spreadsheetId, sheetName, mapping } = bulkConfig
    if (!spreadsheetId || !mapping) {
        throw new Error('Google Sheets is not fully configured.')
    }

    const oauth2Client = await getSheetsClient(integrationId)
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client })

    // Build row data
    const maxColIndex = Math.max(...Object.values(mapping).map((col) => col.charCodeAt(0) - 65))

    const rowsValues = leads.map(leadData => {
        const rowData: string[] = new Array(maxColIndex + 1).fill('')
        Object.entries(mapping || {}).forEach(([field, col]) => {
            const colIndex = col.charCodeAt(0) - 65 // A=0, B=1, etc.
            rowData[colIndex] = ((leadData as unknown) as Record<string, string>)[field] || ''
        })
        return rowData
    })

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetName || 'Sheet1'}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: rowsValues
            }
        })
        return { success: true, count: leads.length }
    } catch (err) {
        console.error('Google Sheets Bulk Append Error:', err)
        throw new Error('Failed to bulk export leads to Google Sheets')
    }
}

/**
 * Import blog posts from a Google Sheet
 * Expected format: Title, Slug, Content, Excerpt, Published
 */
export async function importBlogPostsFromSheets(integrationId: string) {
    const supabase = await createClient()
    const { data: integration } = await supabase
        .from('integrations')
        .select('account_id, config')
        .eq('id', integrationId)
        .single()

    const config = integration?.config as unknown as GoogleSheetsConfig | null
    const spreadsheetId = config?.spreadsheetId
    
    if (!spreadsheetId) {
        throw new Error('Spreadsheet ID not configured for this integration')
    }

    const oauth2Client = await getSheetsClient(integrationId)
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client })

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'A2:E200' // Skip header, get up to 200 posts
    })

    const rows = response.data.values || []
    let importedCount = 0

    // Hoist the user lookup to avoid N+1 network requests
    const { data: { user } } = await supabase.auth.getUser()
    const currentUserId = user?.id

    for (const row of rows) {
        const [title, slug, content, excerpt, publishedStr] = row
        
        if (!title || !content) continue

        const published = publishedStr?.toLowerCase() === 'true' || publishedStr === '1'
        
        const postData = {
            title,
            slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
            content,
            excerpt: excerpt || content.substring(0, 160),
            published,
            author_id: currentUserId,
            published_at: published ? new Date().toISOString() : null
        }

        // Check if slug already exists
        const { data: existing } = await supabase
            .from('posts')
            .select('id')
            .eq('slug', postData.slug)
            .maybeSingle()

        if (existing) {
            const { error } = await supabase
                .from('posts')
                .update(postData)
                .eq('id', existing.id)
            if (!error) importedCount++
        } else {
            const { error } = await supabase
                .from('posts')
                .insert(postData)
            if (!error) importedCount++
        }
    }

    return { importedCount }
}
