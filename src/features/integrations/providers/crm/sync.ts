import { Lead } from '@/features/leads';
import {
    Integration,
    HubspotConfig,
    SalesforceConfig,
    PipedriveConfig,
    ZohoConfig,
    CloseConfig,
    CopperConfig,
} from '@/shared/types';

export async function syncLeadToActiveCRMs(lead: Lead, integrations: Integration[]) {
    const activeCRMs = integrations.filter(i =>
        i.status === 'connected' &&
        ['hubspot', 'salesforce', 'pipedrive', 'zoho', 'close', 'copper'].includes(i.provider)
    );

    const results = await Promise.allSettled(
        activeCRMs.map(async (integration) => {
            try {
                switch (integration.provider) {
                    case 'hubspot':
                        return await syncToHubspot(lead, integration.config as HubspotConfig);
                    case 'salesforce':
                        return await syncToSalesforce(lead, integration.config as SalesforceConfig);
                    case 'pipedrive':
                        return await syncToPipedrive(lead, integration.config as PipedriveConfig);
                    case 'zoho':
                        return await syncToZoho(lead, integration.config as ZohoConfig);
                    case 'close':
                        return await syncToClose(lead, integration.config as CloseConfig);
                    case 'copper':
                        return await syncToCopper(lead, integration.config as CopperConfig);
                    default:
                        return null;
                }
            } catch (error) {
                console.error(`Error syncing lead to ${integration.provider}:`, error);
                throw error;
            }
        })
    );

    return results;
}

async function syncToHubspot(lead: Lead, config: HubspotConfig) {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.access_token}`
        },
        body: JSON.stringify({
            properties: {
                firstname: lead.first_name,
                lastname: lead.last_name,
                email: lead.email,
                phone: lead.phone,
                company: lead.company,
                lead_source: lead.source
            }
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Hubspot Error: ${JSON.stringify(error)}`);
    }

    return await response.json();
}

async function syncToSalesforce(lead: Lead, config: SalesforceConfig) {
    const instanceUrl = config.instance_url?.replace(/\/$/, '');
    const response = await fetch(`${instanceUrl}/services/data/v57.0/sobjects/Lead`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.access_token}`
        },
        body: JSON.stringify({
            FirstName: lead.first_name,
            LastName: lead.last_name,
            Email: lead.email,
            Phone: lead.phone,
            Company: lead.company || 'Not Specified',
            LeadSource: lead.source
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Salesforce Error: ${JSON.stringify(error)}`);
    }

    return await response.json();
}

async function syncToPipedrive(lead: Lead, config: PipedriveConfig) {
    const response = await fetch(`https://api.pipedrive.com/v1/persons?api_token=${config.api_token}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: `${lead.first_name} ${lead.last_name}`,
            email: [{ value: lead.email, primary: true }],
            phone: [{ value: lead.phone, primary: true }],
            org_id: null // Could map lead.company here if org exists
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Pipedrive Error: ${JSON.stringify(error)}`);
    }

    return await response.json();
}

async function syncToZoho(lead: Lead, config: ZohoConfig) {
    const response = await fetch('https://www.zohoapis.com/crm/v2/Leads', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Zoho-oauthtoken ${config.access_token}`
        },
        body: JSON.stringify({
            data: [{
                First_Name: lead.first_name,
                Last_Name: lead.last_name,
                Email: lead.email,
                Phone: lead.phone,
                Company: lead.company || 'Not Specified',
                Lead_Source: lead.source
            }]
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Zoho Error: ${JSON.stringify(error)}`);
    }

    return await response.json();
}

async function syncToClose(lead: Lead, config: CloseConfig) {
    const base64ApiKey = Buffer.from(`${config.api_key}:`).toString('base64');
    const response = await fetch('https://api.close.com/api/v1/lead/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${base64ApiKey}`
        },
        body: JSON.stringify({
            name: lead.company || `${lead.first_name} ${lead.last_name}`,
            contacts: [{
                name: `${lead.first_name} ${lead.last_name}`,
                emails: [{ email: lead.email, type: 'office' }],
                phones: [{ phone: lead.phone, type: 'office' }]
            }]
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Close CRM Error: ${JSON.stringify(error)}`);
    }

    return await response.json();
}

async function syncToCopper(lead: Lead, config: CopperConfig) {
    const response = await fetch('https://api.copper.com/developer_api/v1/people', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': config.api_key,
            'X-Api-Email': config.user_email
        },
        body: JSON.stringify({
            name: `${lead.first_name} ${lead.last_name}`,
            emails: [{ email: lead.email, category: 'work' }],
            phone_numbers: [{ number: lead.phone, category: 'work' }],
            company_name: lead.company
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Copper CRM Error: ${JSON.stringify(error)}`);
    }

    return await response.json();
}
