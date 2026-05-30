import { createAdminClient } from '@/core/db/admin';
import type { LeadInsert } from '@/shared/types';

export async function processCRMWebhook(provider: string, payload: unknown, accountId?: string) {

    let leadData: Partial<LeadInsert> | null = null;

    try {
        switch (provider) {
            case 'hubspot':
                leadData = parseHubspot(payload);
                break;
            case 'pipedrive':
                leadData = parsePipedrive(payload);
                break;
            case 'salesforce':
                leadData = parseSalesforce(payload);
                break;
            case 'zoho':
                leadData = parseZoho(payload);
                break;
            case 'close':
                leadData = parseClose(payload);
                break;
            case 'copper':
                leadData = parseCopper(payload);
                break;
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }

        if (leadData) {
            return await saveWebhookLead(leadData, accountId);
        }
    } catch (error) {
        console.error(`Error parsing ${provider} webhook:`, error);
        throw error;
    }
}

export function parseHubspot(payload: unknown): Partial<LeadInsert> | null {
    if (!Array.isArray(payload) && (typeof payload !== 'object' || payload === null)) {
        return null;
    }
    // Hubspot often sends an array of events
    const event = Array.isArray(payload) ? payload[0] : payload;
    if (
        typeof event !== 'object' ||
        event === null ||
        !('subscriptionType' in event)
    ) {
        return null;
    }
    const e = event as Record<string, unknown>;
    if (
        e.subscriptionType === 'contact.creation' ||
        e.subscriptionType === 'contact.propertyChange'
    ) {
        // Note: Hubspot webhooks only send IDs by default.
        // A full implementation would need to fetch the contact details using the ID.
        return null; // Placeholder: Hubspot requires an extra API call to get details
    }
    return null;
}

export function parsePipedrive(payload: unknown): Partial<LeadInsert> | null {
    if (
        typeof payload !== 'object' ||
        payload === null ||
        !('event' in payload) ||
        !('current' in payload)
    ) {
        return null;
    }
    const p = payload as { event: unknown; current: Record<string, unknown> };
    if (p.event !== 'added.person' && p.event !== 'updated.person') return null;
    const data = p.current;

    const firstName = typeof data.first_name === 'string'
        ? data.first_name
        : (typeof data.name === 'string' ? data.name.split(' ')[0] : undefined);
    const lastName = typeof data.last_name === 'string'
        ? data.last_name
        : (typeof data.name === 'string' ? data.name.split(' ').slice(1).join(' ') : undefined);

    const emailArr = Array.isArray(data.email) ? data.email : null;
    const email = emailArr
        ? (typeof emailArr[0]?.value === 'string' ? emailArr[0].value : undefined)
        : (typeof data.email === 'string' ? data.email : undefined);

    const phoneArr = Array.isArray(data.phone) ? data.phone : null;
    const phone = phoneArr
        ? (typeof phoneArr[0]?.value === 'string' ? phoneArr[0].value : undefined)
        : (typeof data.phone === 'string' ? data.phone : undefined);

    return {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        source: 'pipedrive_webhook',
    };
}

export function parseSalesforce(payload: unknown): Partial<LeadInsert> | null {
    if (typeof payload !== 'object' || payload === null) {
        return null;
    }
    const p = payload as Record<string, unknown>;
    return {
        first_name: typeof p.FirstName === 'string' ? p.FirstName : undefined,
        last_name: typeof p.LastName === 'string' ? p.LastName : undefined,
        email: typeof p.Email === 'string' ? p.Email : undefined,
        phone: typeof p.Phone === 'string' ? p.Phone : undefined,
        source: 'salesforce_webhook',
    };
}

export function parseZoho(payload: unknown): Partial<LeadInsert> | null {
    if (typeof payload !== 'object' || payload === null) {
        return null;
    }
    const p = payload as Record<string, unknown>;
    const dataArr = Array.isArray(p.data) ? p.data : null;
    const data: Record<string, unknown> = dataArr
        ? (typeof dataArr[0] === 'object' && dataArr[0] !== null ? dataArr[0] as Record<string, unknown> : p)
        : p;

    return {
        first_name: typeof data.First_Name === 'string' ? data.First_Name : undefined,
        last_name: typeof data.Last_Name === 'string' ? data.Last_Name : undefined,
        email: typeof data.Email === 'string' ? data.Email : undefined,
        phone: typeof data.Phone === 'string' ? data.Phone : undefined,
        source: 'zoho_webhook',
    };
}

export function parseClose(payload: unknown): Partial<LeadInsert> | null {
    if (
        typeof payload !== 'object' ||
        payload === null ||
        !('event' in payload) ||
        !('data' in payload)
    ) {
        return null;
    }
    const p = payload as { event: unknown; data: unknown };
    if (
        typeof p.event !== 'object' ||
        p.event === null ||
        !('object_type' in p.event)
    ) {
        return null;
    }
    const evt = p.event as Record<string, unknown>;
    if (evt.object_type !== 'lead') return null;

    if (typeof p.data !== 'object' || p.data === null) return null;
    const data = p.data as Record<string, unknown>;

    const contacts = Array.isArray(data.contacts) ? data.contacts : [];
    const contact: Record<string, unknown> =
        contacts.length > 0 && typeof contacts[0] === 'object' && contacts[0] !== null
            ? contacts[0] as Record<string, unknown>
            : {};

    const contactName = typeof contact.name === 'string' ? contact.name : '';
    const emails = Array.isArray(contact.emails) ? contact.emails : [];
    const phones = Array.isArray(contact.phones) ? contact.phones : [];

    const firstEmail =
        emails.length > 0 && typeof emails[0] === 'object' && emails[0] !== null
            ? (emails[0] as Record<string, unknown>).email
            : undefined;
    const firstPhone =
        phones.length > 0 && typeof phones[0] === 'object' && phones[0] !== null
            ? (phones[0] as Record<string, unknown>).phone
            : undefined;

    return {
        first_name: contactName.split(' ')[0] || 'Unknown',
        last_name: contactName.split(' ').slice(1).join(' ') || 'User',
        email: typeof firstEmail === 'string' ? firstEmail : undefined,
        phone: typeof firstPhone === 'string' ? firstPhone : undefined,
        source: 'close_webhook',
    };
}

export function parseCopper(payload: unknown): Partial<LeadInsert> | null {
    if (typeof payload !== 'object' || payload === null) {
        return null;
    }
    const p = payload as Record<string, unknown>;
    return {
        first_name: typeof p.first_name === 'string' ? p.first_name : undefined,
        last_name: typeof p.last_name === 'string' ? p.last_name : undefined,
        email: typeof p.email === 'string' ? p.email : undefined,
        phone: typeof p.phone === 'string' ? p.phone : undefined,
        source: 'copper_webhook',
    };
}

async function saveWebhookLead(leadData: Partial<LeadInsert>, accountId?: string) {
    const adminSupabase = createAdminClient();

    if (!accountId) {
        console.error('Webhook Lead Save failed: No accountId provided');
        return { error: 'No accountId' };
    }

    const insertData = {
        ...leadData,
        account_id: accountId,
        status: 'new' as const,
    };

     
    const { data, error } = await adminSupabase
        .from('leads')
        .insert(insertData as unknown as LeadInsert)
        .select()
        .single();

    if (error) {
        console.error('Error saving webhook lead:', error);
        return { error: error.message };
    }

    return { success: true, lead: data };
}
