"use server"

import { createAdminClient } from '@/core/db/admin'
import { getAccountContext } from '@/core/tenancy/account-context'
import { unstable_cache } from 'next/cache'
import { calculatePerformanceScore } from '@/features/sequences/services/utils';

export type GlobalSequenceAnalytics = {
    totals: {
        enrolled: number;
        active: number;
        completed: number;
        email: { sent: number; opened: number; replied: number };
        whatsapp: { sent: number; opened: number; replied: number };
        revenue: number;
    };
    daily: {
        date: string;
        sent: number;
        opened: number;
        replied: number;
    }[];
};

export type SequencePerformanceReport = {
    sequenceId: string;
    sequenceName: string;
    performanceScore: number;
    totals: {
        sent: number;
        opened: number;
        replied: number;
        failed: number;
        enrolled: number;
        active: number;
        completed: number;
    };
    rates: {
        openRate: number;
        replyRate: number;
        completionRate: number;
    };
    daily: {
        date: string;
        sent: number;
        opened: number;
        replied: number;
    }[];
};

/**
 * Internal function to fetch global analytics data
 * Separated for caching
 */
async function fetchGlobalAnalyticsData(accountId: string, days: number = 30): Promise<GlobalSequenceAnalytics | null> {
    const supabase = createAdminClient()

    // 1. Fetch totals and daily stats in parallel
    const [
        { data: globalMetrics, error: metricsError },
        { data: dailyStats, error: statsError }
    ] = await Promise.all([
        (supabase as any).rpc('get_global_sequence_metrics', { p_account_id: accountId }),
        (supabase as any).rpc('get_sequence_daily_stats', { 
            p_account_id: accountId, 
            p_days: days 
        })
    ]);

    if (statsError) {
        console.error('Error fetching global stats:', statsError);
    }
    if (metricsError) {
        console.error('Error fetching global metrics:', metricsError);
    }

    const metrics = globalMetrics?.[0] || { total_enrolled: 0, total_active: 0, total_completed: 0 };

    const totals = {
        enrolled: Number(metrics.total_enrolled || 0),
        active: Number(metrics.total_active || 0),
        completed: Number(metrics.total_completed || 0),
        email: { sent: 0, opened: 0, replied: 0 },
        whatsapp: { sent: 0, opened: 0, replied: 0 },
        revenue: 0
    }

    // Process daily stats and calculate totals from them
    const dailyMap: Record<string, { sent: number, opened: number, replied: number }> = {}
    
    // Initialize with zeros for all days in range
    for (let i = 0; i < days; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        dailyMap[dateStr] = { sent: 0, opened: 0, replied: 0 }
    }

    if (dailyStats) {
        (dailyStats as { event_date: string; sent_count: number; opened_count: number; replied_count: number; failed_count: number }[]).forEach((row) => {
            const dateStr = row.event_date;
            const entry = {
                sent: Number(row.sent_count || 0),
                opened: Number(row.opened_count || 0),
                replied: Number(row.replied_count || 0),
                failed: Number(row.failed_count || 0)
            };
            
            dailyMap[dateStr] = {
                sent: entry.sent,
                opened: entry.opened,
                replied: entry.replied
            };
            
            totals.email.sent += entry.sent;
            totals.email.opened += entry.opened;
            totals.email.replied += entry.replied;
        });
    }

    const daily = Object.entries(dailyMap)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date))

    return { totals, daily }
}

/**
 * Get global sequence analytics with caching
 */
export async function getSequenceAnalytics(days: number = 30): Promise<GlobalSequenceAnalytics | null> {
    const context = await getAccountContext()
    if (!context.ok) return null

    const accountId = context.accountId

    // Use unstable_cache to persist analytics for 5 minutes
    const cachedFetch = unstable_cache(
        async (accId: string, d: number) => fetchGlobalAnalyticsData(accId, d),
        [`global-sequence-analytics-${accountId}-${days}`],
        { revalidate: 300, tags: [`analytics-${accountId}`] }
    );

    return cachedFetch(accountId, days);
}

/**
 * Internal function to fetch per-sequence performance report
 */
async function fetchSequencePerformanceData(
    accountId: string,
    sequenceId: string,
    days: number = 30
): Promise<SequencePerformanceReport | null> {
    const supabase = createAdminClient()

    // 1. Fetch metadata and daily stats in parallel
    const [
        { data: sequence },
        { data: enrollmentCounts },
        { data: dailyStats, error: statsError }
    ] = await Promise.all([
        supabase.from('sequences').select('id, name').eq('id', sequenceId).eq('account_id', accountId).single(),
        (supabase as any).rpc('get_sequence_enrollment_counts', { p_sequence_ids: [sequenceId] }),
        (supabase as any).rpc('get_sequence_daily_stats', {
            p_account_id: accountId,
            p_days: days,
            p_sequence_id: sequenceId
        })
    ]);

    if (!sequence) return null;
    if (statsError) console.error('Error fetching sequence stats:', statsError);

    const counts = (enrollmentCounts || []) as { status: string; cnt: number }[];
    const enrolledCount = counts.reduce((acc, row) => acc + Number(row.cnt), 0);
    const activeCount = Number(counts.find(row => row.status === 'active')?.cnt || 0);
    const completedCount = Number(counts.find(row => row.status === 'completed')?.cnt || 0);

    const dailyMap: Record<string, { sent: number; opened: number; replied: number }> = {}
    for (let i = 0; i < days; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        dailyMap[dateStr] = { sent: 0, opened: 0, replied: 0 }
    }

    const totals = {
        sent: 0,
        opened: 0,
        replied: 0,
        failed: 0, // Failed is not currently tracked via RPC for speed, but could be added
        enrolled: enrolledCount,
        active: activeCount,
        completed: completedCount
    }

    if (dailyStats) {
        (dailyStats as { event_date: string; sent_count: number; opened_count: number; replied_count: number; failed_count: number }[]).forEach((row) => {
            const dateStr = row.event_date;
            const entry = {
                sent: Number(row.sent_count || 0),
                opened: Number(row.opened_count || 0),
                replied: Number(row.replied_count || 0),
                failed: Number(row.failed_count || 0)
            };
            
            if (dailyMap[dateStr]) {
                dailyMap[dateStr] = {
                    sent: entry.sent,
                    opened: entry.opened,
                    replied: entry.replied
                };
            }
            
            totals.sent += entry.sent;
            totals.opened += entry.opened;
            totals.replied += entry.replied;
            totals.failed += entry.failed;
        });
    }

    const openRate = totals.sent > 0 ? totals.opened / totals.sent : 0
    const replyRate = totals.sent > 0 ? totals.replied / totals.sent : 0
    const completionRate = totals.enrolled > 0 ? totals.completed / totals.enrolled : 0
    const performanceScore = calculatePerformanceScore(openRate, replyRate)

    const daily = Object.entries(dailyMap)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date))

    return {
        sequenceId: sequence.id,
        sequenceName: sequence.name,
        performanceScore,
        totals,
        rates: {
            openRate: Math.round(openRate * 100),
            replyRate: Math.round(replyRate * 100),
            completionRate: Math.round(completionRate * 100)
        },
        daily
    }
}

/**
 * Get per-sequence performance report with caching
 */
export async function getSequencePerformanceReport(
    sequenceId: string,
    days: number = 30
): Promise<SequencePerformanceReport | null> {
    const context = await getAccountContext()
    if (!context.ok) return null

    const accountId = context.accountId

    const cachedFetch = unstable_cache(
        async (accId: string, seqId: string, d: number) => fetchSequencePerformanceData(accId, seqId, d),
        [`sequence-performance-${sequenceId}-${days}`],
        { revalidate: 300, tags: [`sequence-analytics-${sequenceId}`] }
    );

    return cachedFetch(accountId, sequenceId, days);
}

