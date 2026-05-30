'use server'

import { createClient } from '@/core/db/server'
import { createAdminClient } from '@/core/db/admin'
import { getAccountContext } from '@/core/tenancy/account-context'
import { unstable_cache } from 'next/cache'

const PIPELINE_STAGES = [
    { key: 'new', label: 'New', color: '#6366f1' },
    { key: 'contacted', label: 'Contacted', color: '#8b5cf6' },
    { key: 'qualified', label: 'Qualified', color: '#f59e0b' },
    { key: 'booked', label: 'Booked', color: '#10b981' },
    { key: 'unqualified', label: 'Unqualified', color: '#64748b' },
] as const


export type DashboardMetrics = {
    totalLeads: number
    bookedMeetings: number
    responseRate: number
    successRate: number // Replaced estimatedRevenue
    leadsChange: string
    meetingsChange: string
    responseChange: string
    successRateChange: string // Replaced revenueChange
}

export type ActivityItem = {
    title: string
    time: string
    icon: string
}

export type PerformanceDataPoint = {
    day: string
    value: number
}

/**
 * Get dashboard metrics with comparison to previous period
 */
// ─── OPTIMIZED: Dashboard Metrics ────────────────────────────────────
export async function getDashboardMetrics(providedSupabase?: any, providedAccountId?: string): Promise<DashboardMetrics> {
    const supabase = providedSupabase || await createClient()
    let accountId = providedAccountId
    if (!accountId) {
        const ctx = await getAccountContext()
        if (ctx.ok) accountId = ctx.accountId
    }
    if (!accountId) {
        return {
            totalLeads: 0,
            bookedMeetings: 0,
            responseRate: 0,
            successRate: 0,
            leadsChange: '+0%',
            meetingsChange: '+0%',
            responseChange: '+0%',
            successRateChange: '+0%'
        }
    }

    // Get current period (last 30 days)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const thirtyDaysIso = thirtyDaysAgo.toISOString()
    const sixtyDaysIso = sixtyDaysAgo.toISOString()

    // Parallel execution for all metrics
    const [
        currentLeadsResult,
        previousLeadsResult,
        currentMeetingsResult,
        previousMeetingsResult,
        totalConversationsResult,
        respondedConversationsResult,
        previousTotalConversationsResult,
        previousRespondedConversationsResult,
    ] = await Promise.all([
        // 1. Current Leads
        supabase.from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', accountId)
            .gte('created_at', thirtyDaysIso),
        // 2. Previous Leads
        supabase.from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', accountId)
            .gte('created_at', sixtyDaysIso)
            .lt('created_at', thirtyDaysIso),
        // 3. Current Meetings
        supabase.from('meetings')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', accountId)
            .gte('created_at', thirtyDaysIso),
        // 4. Previous Meetings
        supabase.from('meetings')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', accountId)
            .gte('created_at', sixtyDaysIso)
            .lt('created_at', thirtyDaysIso),
        // 5. Total Conversations (for response rate)
        supabase.from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', accountId)
            .gte('created_at', thirtyDaysIso),
        // 6. Responded Conversations
        supabase.from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', accountId)
            .gte('created_at', thirtyDaysIso)
            .not('last_message_at', 'is', null),
        // 7. Previous conversations
        supabase.from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', accountId)
            .gte('created_at', sixtyDaysIso)
            .lt('created_at', thirtyDaysIso),
        // 8. Previous responded conversations
        supabase.from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', accountId)
            .gte('created_at', sixtyDaysIso)
            .lt('created_at', thirtyDaysIso)
            .not('last_message_at', 'is', null)
    ])

    const currentLeads = currentLeadsResult.count || 0
    const previousLeads = previousLeadsResult.count || 0
    const currentMeetings = currentMeetingsResult.count || 0
    const previousMeetings = previousMeetingsResult.count || 0
    const totalConversations = totalConversationsResult.count || 0
    const respondedConversations = respondedConversationsResult.count || 0
    const previousTotalConversations = previousTotalConversationsResult.count || 0
    const previousRespondedConversations = previousRespondedConversationsResult.count || 0

    const responseRate = totalConversations ? Math.round((respondedConversations / totalConversations) * 100) : 0
    const previousResponseRate = previousTotalConversations
        ? Math.round((previousRespondedConversations / previousTotalConversations) * 100)
        : null

    // Success Rate (meetings / total conversations * 100)
    const successRate = totalConversations ? Math.round((currentMeetings / totalConversations) * 100) : 0
    const previousSuccessRate = previousTotalConversations 
        ? Math.round((previousMeetings / previousTotalConversations) * 100) 
        : 0

    // Calculate percentage changes
    const leadsChange = calculateChange(currentLeads, previousLeads)
    const meetingsChange = calculateChange(currentMeetings, previousMeetings)
    const responseChange = previousResponseRate === null
        ? 'Insufficient data'
        : calculateChange(responseRate, previousResponseRate)
    const successRateChange = calculateChange(successRate, previousSuccessRate)

    return {
        totalLeads: currentLeads,
        bookedMeetings: currentMeetings,
        responseRate,
        successRate,
        leadsChange,
        meetingsChange,
        responseChange,
        successRateChange
    }
}

/**
 * Get recent activity feed from event logs
 */
export async function getActivityFeed(providedSupabase?: any, providedAccountId?: string): Promise<ActivityItem[]> {
    const supabase = providedSupabase || await createClient()
    let accountId = providedAccountId
    if (!accountId) {
        const ctx = await getAccountContext()
        if (ctx.ok) accountId = ctx.accountId
    }
    if (!accountId) return []

    const { data: events } = await supabase
        .from('event_logs')
        .select('event_type, created_at')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(4)

    if (!events) return []

    return events.map((event: any) => ({
        title: formatEventTitle(event.event_type),
        time: formatTimeAgo(event.created_at ?? ''),
        icon: getEventIcon(event.event_type)
    }))
}

// ─── OPTIMIZED: Performance Data ─────────────────────────────────────
export async function getPerformanceData(days: number = 7, providedSupabase?: any, providedAccountId?: string): Promise<PerformanceDataPoint[]> {
    const supabase = providedSupabase || await createClient()
    let accountId = providedAccountId
    if (!accountId) {
        const ctx = await getAccountContext()
        if (ctx.ok) accountId = ctx.accountId
    }
    if (!accountId) return []

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Build day boundaries for the last N days
    const dayRanges = Array.from({ length: days }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (days - 1 - i))
        const start = new Date(date)
        start.setUTCHours(0, 0, 0, 0)
        const end = new Date(date)
        end.setUTCHours(23, 59, 59, 999)
        return { date, start: start.toISOString(), end: end.toISOString() }
    })

    // Parallel COUNT queries — no row data transferred, all aggregation in DB
    const counts = await Promise.all(
        dayRanges.map(({ start, end }) =>
            supabase
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('account_id', accountId)
                .gte('created_at', start)
                .lte('created_at', end)
        )
    )

    return dayRanges.map(({ date }, i) => ({
        day: dayNames[date.getDay()],
        value: counts[i].count ?? 0,
    }))
}

// Helper functions
function calculateChange(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? '+100%' : '+0%'
    const change = ((current - previous) / previous) * 100
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
}

function formatEventTitle(eventType: string): string {
    const titles: Record<string, string> = {
        'lead.created': 'New Lead Captured',
        'lead.qualified': 'Lead Qualified',
        'meeting.scheduled': 'Meeting Scheduled',
        'conversation.started': 'New Conversation',
        'ai.response.generated': 'AI Response Sent',
        'integration.connected': 'Integration Connected'
    }
    return titles[eventType] || 'System Event'
}

function formatTimeAgo(timestamp: string): string {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hr ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

function getEventIcon(eventType: string): string {
    const icons: Record<string, string> = {
        'lead.created': 'Users',
        'lead.qualified': 'Target',
        'meeting.scheduled': 'Calendar',
        'conversation.started': 'MessageSquare',
        'ai.response.generated': 'Zap',
        'integration.connected': 'Star'
    }
    return icons[eventType] || 'Activity'
}

// ─── OPTIMIZED: Pipeline Distribution ────────────────────────────────

export type PipelineStage = {
    stage: string
    count: number
    percentage: number
    color: string
}

export async function getPipelineDistribution(providedSupabase?: any, providedAccountId?: string): Promise<PipelineStage[]> {
    const supabase = providedSupabase || await createClient()
    let accountId = providedAccountId
    if (!accountId) {
        const ctx = await getAccountContext()
        if (ctx.ok) accountId = ctx.accountId
    }
    if (!accountId) return []

    // Parallel COUNT queries per status — DB-side aggregation, no row data transferred
    const stageResults = await Promise.all(
        PIPELINE_STAGES.map(stage =>
            supabase
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('account_id', accountId)
                .eq('status', stage.key)
        )
    )

    const stageCounts = PIPELINE_STAGES.map((stage, i) => ({
        stage: stage.label,
        count: stageResults[i].count ?? 0,
        color: stage.color,
    }))

    const total = stageCounts.reduce((sum, s) => sum + s.count, 0)

    return stageCounts.map(s => ({
        ...s,
        percentage: total > 0 ? Math.round((s.count / total) * 100) : 0,
    }))
}

// ─── OPTIMIZED: Conversion Funnel ────────────────────────────────────

export type FunnelStep = {
    label: string
    value: number
    percentage: number
    color: string
}

export async function getConversionFunnel(providedSupabase?: any, providedAccountId?: string): Promise<FunnelStep[]> {
    const supabase = providedSupabase || await createClient()
    let accountId = providedAccountId
    if (!accountId) {
        const ctx = await getAccountContext()
        if (ctx.ok) accountId = ctx.accountId
    }
    if (!accountId) return []

    // Parallel fetch: 
    // 1. Total Leads
    // 2. Leads that are at least 'contacted' (contacted, qualified, meeting, closed)
    // 3. Leads that are at least 'qualified' (qualified, meeting, closed)
    // 4. Meetings count (from meetings table)

    const [
        totalLeadsResult,
        contactedResult,
        qualifiedResult,
        meetingsResult
    ] = await Promise.all([
        // 1. Total Leads
        supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', accountId),

        // 2. Contacted+ (filter by list)
        supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', accountId)
            .in('status', ['contacted', 'qualified', 'booked', 'unqualified'] as ('new' | 'contacted' | 'qualified' | 'booked' | 'unqualified')[]),

        // 3. Qualified+ (filter by list)
        supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', accountId)
            .in('status', ['qualified', 'booked'] as ('new' | 'contacted' | 'qualified' | 'booked' | 'unqualified')[]),

        // 4. Meetings (direct from meetings table)
        supabase
            .from('meetings')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', accountId)
    ])

    const totalLeads = totalLeadsResult.count || 0
    const contacted = contactedResult.count || 0
    const qualified = qualifiedResult.count || 0
    const meetingsCount = meetingsResult.count || 0

    const steps: FunnelStep[] = [
        { label: 'Leads', value: totalLeads, percentage: 100, color: '#6366f1' },
        { label: 'Contacted', value: contacted, percentage: totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0, color: '#8b5cf6' },
        { label: 'Qualified', value: qualified, percentage: totalLeads > 0 ? Math.round((qualified / totalLeads) * 100) : 0, color: '#f59e0b' },
        { label: 'Meetings', value: meetingsCount, percentage: totalLeads > 0 ? Math.round((meetingsCount / totalLeads) * 100) : 0, color: '#10b981' },
    ]

    return steps
}

// ─── NEW: Top Leads (Kept same) ──────────────────────────────────────

export type TopLead = {
    id: string
    name: string
    email: string
    company: string | null
    status: string
    created_at: string
}

export async function getTopLeads(limit: number = 5, providedSupabase?: any, providedAccountId?: string): Promise<TopLead[]> {
    const supabase = providedSupabase || await createClient()
    let accountId = providedAccountId
    if (!accountId) {
        const ctx = await getAccountContext()
        if (ctx.ok) accountId = ctx.accountId
    }
    if (!accountId) return []

    const { data: leads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, company, status, created_at')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (!leads) return []

    return leads.map((lead: any) => ({
        id: lead.id,
        name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown',
        email: lead.email || '',
        company: lead.company || null,
        status: lead.status || 'new',
        created_at: lead.created_at ?? ''
    }))
}

// ─── NEW: Dashboard Insights (Kept same) ─────────────────────────────

export type DashboardInsight = {
    id: string
    title: string
    description: string
    type: 'success' | 'warning' | 'info' | 'tip'
    action?: string
    actionRoute?: string
}

export async function getDashboardInsights(metrics: DashboardMetrics): Promise<DashboardInsight[]> {
    const insights: DashboardInsight[] = []

    // Response rate insight
    if (metrics.responseRate > 80) {
        insights.push({
            id: 'response-high',
            title: 'Excellent Response Rate',
            description: `Your response rate is ${metrics.responseRate}%. Your AI agents are performing above average.`,
            type: 'success',
        })
    } else if (metrics.responseRate < 50) {
        insights.push({
            id: 'response-low',
            title: 'Response Rate Needs Attention',
            description: `At ${metrics.responseRate}%, response rate could be improved. Consider refining AI training data.`,
            type: 'warning',
            action: 'Optimize AI',
            actionRoute: '/admin/ai-training'
        })
    }

    // Lead velocity insight
    if (metrics.leadsChange.startsWith('+')) {
        const pct = parseFloat(metrics.leadsChange.replace('+', '').replace('%', ''))
        if (pct > 20) {
            insights.push({
                id: 'leads-growing',
                title: 'Lead Volume Surging',
                description: `Leads up ${metrics.leadsChange} this period. Consider scaling your sequence automation.`,
                type: 'success',
                action: 'View Sequences',
                actionRoute: '/admin/settings/sequences'
            })
        }
    } else if (metrics.leadsChange.startsWith('-')) {
        insights.push({
            id: 'leads-declining',
            title: 'Lead Volume Declining',
            description: `Lead generation is down ${metrics.leadsChange}. Review your lead sources and integrations.`,
            type: 'warning',
            action: 'Check Integrations',
            actionRoute: '/admin/settings/integrations'
        })
    }

    // Meeting conversion
    if (metrics.bookedMeetings > 0 && metrics.totalLeads > 0) {
        const convRate = Math.round((metrics.bookedMeetings / metrics.totalLeads) * 100)
        insights.push({
            id: 'conversion',
            title: `${convRate}% Lead-to-Meeting Conversion`,
            description: convRate > 15
                ? 'Strong conversion rate. Your pipeline is healthy.'
                : 'There is room to improve. Focus on lead qualification.',
            type: convRate > 15 ? 'success' : 'info',
            action: 'View Pipeline',
            actionRoute: '/admin/pipeline'
        })
    }

    // Success rate insight
    if (metrics.successRate > 0) {
        insights.push({
            id: 'success-rate',
            title: `${metrics.successRate}% AI Win Rate`,
            description: `Based on ${metrics.bookedMeetings} meetings from ${metrics.totalLeads} leads. Keep the momentum going.`,
            type: 'tip',
        })
    }

    // Always have at least one insight
    if (insights.length === 0) {
        insights.push({
            id: 'getting-started',
            title: 'Getting Started',
            description: 'Start capturing leads and training your AI to see personalized insights here.',
            type: 'info',
            action: 'Setup Wizard',
            actionRoute: '/onboarding'
        })
    }

    return insights
}
// ─── OPTIMIZED: Aggregate Dashboard Data ─────────────────────────────
export type DashboardData = {
    metrics: DashboardMetrics
    insights: DashboardInsight[]
    activities: ActivityItem[]
    performance: PerformanceDataPoint[]
    pipeline: PipelineStage[]
    funnel: FunnelStep[]
    topLeads: TopLead[]
}
// Per-account cached fetch — survives across requests for 60 seconds
function _fetchDashboardData(accountId: string) {
    return unstable_cache(
        async (): Promise<DashboardData | null> => {
            const supabase = createAdminClient()
            // Run all independent fetches in parallel
            const results = await Promise.allSettled([
                getDashboardMetrics(supabase, accountId),
                getActivityFeed(supabase, accountId),
                getPerformanceData(7, supabase, accountId),
                getPipelineDistribution(supabase, accountId),
                getConversionFunnel(supabase, accountId),
                getTopLeads(5, supabase, accountId)
            ])

            const getVal = <T>(res: PromiseSettledResult<T>, def: T): T =>
                res.status === 'fulfilled' ? res.value : def

            const metrics = getVal(results[0], {
                totalLeads: 0, bookedMeetings: 0, responseRate: 0, successRate: 0,
                leadsChange: '+0%', meetingsChange: '+0%', responseChange: '+0%', successRateChange: '+0%'
            } as DashboardMetrics)

            const activities = getVal(results[1], [])
            const performance = getVal(results[2], [])
            const pipeline = getVal(results[3], [])
            const funnel = getVal(results[4], [])
            const topLeads = getVal(results[5], [])

            let insights: DashboardInsight[] = []
            try {
                insights = await getDashboardInsights(metrics)
            } catch (err) {
                console.error('Failed to get dashboard insights:', err)
            }

            return { metrics, insights, activities, performance, pipeline, funnel, topLeads }
        },
        [`dashboard-data-${accountId}`],
        { revalidate: 300, tags: [`dashboard-${accountId}`] }
    )()
}

export async function getDashboardData(): Promise<DashboardData | null> {
    try {
        const context = await getAccountContext()
        if (!context.ok) {
            console.warn('[getDashboardData] Account context not OK:', context.error);
            return null
        }

        return await _fetchDashboardData(context.accountId)
    } catch (error) {
        console.error('[getDashboardData] Fatal Error:', error);
        return null;
    }
}
