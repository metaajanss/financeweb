'use server';

import { createClient } from '@/core/db/server';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/shared/types';

export interface B2BLeadFilters {
    query?: string;
    company_name?: string;
    location?: string;
    industry?: string;
    company_type?: string;
    keywords?: string;
    size?: string[];
    limit?: number;
}

export type B2BCompany = {
    id: string;
    name: string;
    domain: string | null;
    logo_url: string | null;
    description: string | null;
    hq_location: string | null;
    industry: string | null;
    size: string | null;
    company_type: string | null;
    keywords: string[] | null;
    founded_year: number | null;
    technologies: string[] | null;
    funding_amount: string | null;
    created_at: string;
    unlocked?: boolean;
};

export async function getB2BCredits() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data } = await supabase
        .from('profiles')
        .select('b2b_credits')
        .eq('id', user.id)
        .single();

    return data?.b2b_credits || 0;
}

export async function searchB2BCompanies(filters: {
    query?: string,
    company_name?: string,
    location?: string,
    industry?: string,
    company_type?: string,
    keywords?: string,
    size?: string[],
    limit?: number
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase.from('b2b_companies').select('id, name, domain, logo_url, description, hq_location, industry, size, company_type, keywords, founded_year, technologies, funding_amount, created_at');

    // Combine all text filters into a single FTS query on the generated `fts` column (GIN index)
    const ftsTerms = [filters.query, filters.company_name, filters.location, filters.industry, filters.company_type]
        .filter(Boolean) as string[];
    if (ftsTerms.length > 0) {
        query = (query as any).textSearch('fts', ftsTerms.join(' '), { type: 'websearch', config: 'english' });
    }
    if (filters.keywords) {
        query = query.contains('keywords', [filters.keywords.toLowerCase()]);
    }
    if (filters.size && filters.size.length > 0) {
        query = query.in('size', filters.size);
    }

    const searchLimit = filters.limit && filters.limit > 0 ? filters.limit : 20;

    // Run search and unlocked-IDs fetch in parallel to avoid serial round-trips
    const [{ data: companies, error }, { data: unlocked }] = await Promise.all([
        query.limit(searchLimit),
        supabase
            .from('b2b_unlocked_leads')
            .select('company_id')
            .eq('user_id', user.id),
    ]);

    if (error) {
        console.error('Error searching B2B database:', error);
        return [];
    }

    const unlockedIds = new Set(unlocked?.map(u => u.company_id) || []);

    return ((companies as any[]) || []).map(c => ({
        ...c,
        unlocked: unlockedIds.has(c.id as string),
    })) as B2BCompany[];
}

export async function getB2BCompanyCount(filters: {
    query?: string,
    company_name?: string,
    location?: string,
    industry?: string,
    company_type?: string,
    keywords?: string,
    size?: string[]
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    let query = supabase.from('b2b_companies').select('id', { count: 'exact', head: true });

    const ftsTermsCount = [filters.query, filters.company_name, filters.location, filters.industry, filters.company_type]
        .filter(Boolean) as string[];
    if (ftsTermsCount.length > 0) {
        query = (query as any).textSearch('fts', ftsTermsCount.join(' '), { type: 'websearch', config: 'english' });
    }
    if (filters.keywords) query = query.contains('keywords', [filters.keywords.toLowerCase()]);
    if (filters.size && filters.size.length > 0) query = query.in('size', filters.size);

    // Fetch unlocked IDs in parallel with a preliminary count to avoid serial round-trips
    const { data: existing } = await supabase
        .from('b2b_unlocked_leads')
        .select('company_id')
        .eq('user_id', user.id);

    const unlockedIds = existing?.map(e => e.company_id) || [];
    if (unlockedIds.length > 0) {
        query = query.not('id', 'in', unlockedIds);
    }

    const { count, error } = await query;
    if (error) {
        console.error('Error getting B2B count:', error);
        return 0;
    }

    return count || 0;
}

export async function unlockB2BLead(companyId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    // 1. Check credits
    const { data: profile } = await supabase
        .from('profiles')
        .select('b2b_credits, account_id')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.b2b_credits || 0) <= 0) {
        return { error: 'Not enough credits' };
    }

    // 2. Check if already unlocked
    const { data: existing } = await supabase
        .from('b2b_unlocked_leads')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single();

    if (existing) {
        return { error: 'Lead already unlocked' };
    }

    // 3. Deduct credit and unlock in a transaction if possible, or sequentially
    const currentCredits = profile.b2b_credits || 0;
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ b2b_credits: currentCredits - 1 })
        .eq('id', user.id);

    if (updateError) {
        return { error: 'Failed to deduct credit' };
    }

    const { error: unlockError } = await supabase
        .from('b2b_unlocked_leads')
        .insert({
            user_id: user.id,
            company_id: companyId
        });

    if (unlockError) {
        // Rollback credit (best effort)
        await supabase.from('profiles').update({ b2b_credits: profile.b2b_credits }).eq('id', user.id);
        return { error: 'Failed to unlock lead' };
    }

    // Optional: Auto-add to CRM leads?
    const accountId = profile.account_id;
    if (accountId) {
        const { data: company } = await supabase.from('b2b_companies').select('id, name, domain, logo_url, description, hq_location, industry, size, company_type, keywords, founded_year, technologies, funding_amount, created_at').eq('id', companyId).single();
        if (company) {
            const companyData = company as B2BCompany;
            // We can add them to our leads table
            await supabase.from('leads').insert({
                account_id: accountId,
                first_name: 'Contact at',
                last_name: companyData.name,
                email: `info@${companyData.domain || 'example.com'}`,
                company: companyData.name,
                source: 'b2b_database',
                status: 'new'
            });
        }
    }

    return { success: true };
}

export async function unlockBulkB2BLeads(filters: B2BLeadFilters, limit: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    // 1. Get user profile for credits
    const { data: profile } = await supabase
        .from('profiles')
        .select('b2b_credits, account_id')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.b2b_credits || 0) < limit) {
        return { error: `Not enough credits. You need ${limit} credits.` };
    }

    // 2. Fetch companies matching filters
    let query = supabase.from('b2b_companies').select('id, name, domain');

    const ftsTermsBulk = [filters.query, filters.company_name, filters.location, filters.industry, filters.company_type]
        .filter(Boolean) as string[];
    if (ftsTermsBulk.length > 0) {
        query = (query as any).textSearch('fts', ftsTermsBulk.join(' '), { type: 'websearch', config: 'english' });
    }
    if (filters.keywords) query = query.contains('keywords', [filters.keywords.toLowerCase()]);
    if (filters.size && filters.size.length > 0) query = query.in('size', filters.size);

    // Filter out already unlocked ones
    const { data: existing } = await supabase
        .from('b2b_unlocked_leads')
        .select('company_id')
        .eq('user_id', user.id);

    const unlockedIds = existing?.map(e => e.company_id) || [];
    if (unlockedIds.length > 0) {
        query = query.not('id', 'in', unlockedIds);
    }

    // Limit to the desired number
    const { data: companiesToUnlock, error: searchError } = await query.limit(limit);

    if (searchError || !companiesToUnlock || companiesToUnlock.length === 0) {
        return { error: 'No new leads found matching your criteria.' };
    }

    const actualLimit = companiesToUnlock.length;

    // 3. Deduct credits
    const currentCredits = profile.b2b_credits || 0;
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ b2b_credits: currentCredits - actualLimit })
        .eq('id', user.id);

    if (updateError) {
        return { error: 'Failed to deduct credits.' };
    }

    // 4. Mark as unlocked
    const unlockData = companiesToUnlock.map(c => ({
        user_id: user.id,
        company_id: c.id
    }));

    const { error: unlockError } = await supabase
        .from('b2b_unlocked_leads')
        .insert(unlockData);

    if (unlockError) {
        // Rollback attempt
        await supabase.from('profiles').update({ b2b_credits: profile.b2b_credits }).eq('id', user.id);
        return { error: 'Failed to unlock leads.' };
    }

    // 5. Add all to CRM in a dynamically created group
    let createdLeads: Database['public']['Tables']['leads']['Row'][] = [];
    const accountId = profile.account_id;
    if (accountId) {
        let groupId = null;

        // Create a lead group dynamically based on filters
        const filterNames = [];
        if (filters.industry) filterNames.push(filters.industry);
        if (filters.company_type) filterNames.push(filters.company_type);
        if (filters.location) filterNames.push(filters.location);
        if (filters.query) filterNames.push(filters.query);

        let groupName = `B2B Extraction: ${filterNames.length > 0 ? filterNames.join(', ') : 'All Companies'} (${actualLimit})`;
        if (groupName.length > 40) groupName = groupName.substring(0, 37) + '...';

        const { data: group } = await supabase.from('lead_groups').insert({
            account_id: accountId,
            name: groupName,
            description: `Auto-generated from B2B Database on ${new Date().toLocaleDateString()}`
        }).select().single();

        if (group) {
            groupId = (group as any).id;
        }

        const crmLeads = (companiesToUnlock || []).map(company => ({
            account_id: accountId,
            group_id: groupId as string | null,
            first_name: 'Contact at',
            last_name: (company as any).name || 'Unknown',
            email: `info@${(company as any).domain || 'example.com'}`,
            company: (company as any).name || 'Unknown',
            source: 'b2b_database',
            status: 'new'
        }));

        const { data: insertedLeads } = await supabase.from('leads').insert(crmLeads as any[]).select();
        if (insertedLeads) {
            createdLeads = insertedLeads as any[];

            // Enroll leads in sequences
            const { enrollLeadInSequences } = await import('@/features/sequences/services/enroll');
            Promise.allSettled(
                createdLeads.map(lead =>
                    enrollLeadInSequences((lead as any).id, accountId, 'b2b_database', groupId as string | null)
                )
            ).catch(e => console.error('Enrollment failed for B2B leads:', e));
        }
    }

    return { success: true, count: actualLimit, leads: createdLeads };
}

export async function unlockSelectedB2BLeads(companyIds: string[], customGroupName?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    if (companyIds.length === 0) return { error: 'No leads selected' };

    // 1. Get user profile for credits
    const { data: profile } = await supabase
        .from('profiles')
        .select('b2b_credits, account_id')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.b2b_credits || 0) < companyIds.length) {
        return { error: `Not enough credits. You need ${companyIds.length} credits.` };
    }

    // 2. Fetch companies to get their details
    const { data: companiesToUnlock, error: searchError } = await supabase
        .from('b2b_companies')
        .select('id, name, domain')
        .in('id', companyIds);

    if (searchError || !companiesToUnlock || companiesToUnlock.length === 0) {
        return { error: 'Failed to fetch selected lead details.' };
    }

    const countToUnlock = companiesToUnlock.length;

    // 3. Deduct credits
    const currentCredits = profile.b2b_credits || 0;
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ b2b_credits: currentCredits - countToUnlock })
        .eq('id', user.id);

    if (updateError) {
        return { error: 'Failed to deduct credits.' };
    }

    // 4. Mark as unlocked
    const unlockData = companiesToUnlock.map(c => ({
        user_id: user.id,
        company_id: c.id
    }));

    const { error: unlockError } = await supabase
        .from('b2b_unlocked_leads')
        .insert(unlockData);

    if (unlockError) {
        // Rollback attempt
        await supabase.from('profiles').update({ b2b_credits: profile.b2b_credits }).eq('id', user.id);
        return { error: 'Failed to unlock leads.' };
    }

    // 5. Add all to CRM
    let createdLeads: Database['public']['Tables']['leads']['Row'][] = [];
    const accountId = profile.account_id;
    if (accountId) {
        let groupId = null;

        // Create or get lead group
        let groupName = customGroupName || `B2B Selection: ${new Date().toLocaleDateString()} (${countToUnlock})`;
        if (groupName.length > 40) groupName = groupName.substring(0, 37) + '...';

        const { data: group } = await supabase.from('lead_groups').insert({
            account_id: accountId,
            name: groupName,
            description: `Manually selected from B2B Database on ${new Date().toLocaleDateString()}`
        }).select().single();

        if (group) {
            groupId = (group as any).id;
        }

        const crmLeads = (companiesToUnlock || []).map(company => ({
            account_id: accountId,
            group_id: groupId as string | null,
            first_name: 'Contact at',
            last_name: (company as any).name || 'Unknown',
            email: `info@${(company as any).domain || 'example.com'}`,
            company: (company as any).name || 'Unknown',
            source: 'b2b_database',
            status: 'new'
        }));

        const { data: insertedLeads } = await supabase.from('leads').insert(crmLeads as any[]).select();
        if (insertedLeads) {
            createdLeads = insertedLeads as any[];

            // Enroll leads in sequences
            const { enrollLeadInSequences } = await import('@/features/sequences/services/enroll');
            Promise.allSettled(
                createdLeads.map(lead =>
                    enrollLeadInSequences((lead as any).id, accountId, 'b2b_database', groupId as string | null)
                )
            ).catch(e => console.error('Enrollment failed for B2B leads:', e));
        }
    }

    revalidatePath('/admin/b2b-database');
    return { success: true, count: countToUnlock, leads: createdLeads };
}
