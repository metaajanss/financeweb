'use server'

import { createClient } from '@/core/db/server'
import { createAdminClient } from '@/core/db/admin'
import { getAccountContext } from '@/core/tenancy/account-context'
import { unstable_cache } from 'next/cache'

export type AIPerformanceMetrics = {
    totalConversations: number
    aiRespondedConversations: number
    aiResponseRate: number
    avgConversationLength: number
    totalLeads: number
    qualifiedLeads: number
    qualificationRate: number
    totalMeetings: number
    aiBookedMeetings: number
    bookingRate: number
    totalAiMessages: number
    totalLeadMessages: number
    avgAiResponseTime: number | null
    funnel: { leads: number; contacted: number; qualified: number; booked: number }
    periodChange: { conversations: string; qualificationRate: string; bookingRate: string; responseRate: string }
}

export type AIPerformanceReport = {
    accountId: string
    periodStart: string
    periodEnd: string
    metrics: AIPerformanceMetrics
    score: number
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    insights: string[]
    recommendations: string[]
}

function calculatePerformanceScore(metrics: AIPerformanceMetrics): { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F' } {
    const responseScore = Math.min(metrics.aiResponseRate, 100) * 0.30
    const qualificationScore = Math.min(metrics.qualificationRate, 100) * 0.30
    const bookingScore = Math.min(metrics.bookingRate * 2, 100) * 0.40
    const score = Math.round(responseScore + qualificationScore + bookingScore)
    let grade: 'A' | 'B' | 'C' | 'D' | 'F'
    if (score >= 90) grade = 'A'
    else if (score >= 75) grade = 'B'
    else if (score >= 60) grade = 'C'
    else if (score >= 40) grade = 'D'
    else grade = 'F'
    return { score, grade }
}

function generateInsights(metrics: AIPerformanceMetrics): string[] {
    const insights: string[] = []
    if (metrics.aiResponseRate >= 95) insights.push('Excellent AI response rate! Your AI is engaging with almost all leads.')
    else if (metrics.aiResponseRate < 70) insights.push('AI response rate could be improved. Consider checking AI configuration.')
    if (metrics.qualificationRate >= 40) insights.push('Strong qualification rate. Your AI is effectively identifying qualified leads.')
    else if (metrics.qualificationRate < 20) insights.push('Low qualification rate. Consider refining your lead qualification criteria.')
    if (metrics.bookingRate >= 15) insights.push('Great meeting conversion! Your AI is successfully booking appointments.')
    else if (metrics.bookingRate < 5) insights.push('Meeting booking rate is low. Review your calendar availability and AI prompts.')
    if (metrics.avgConversationLength > 10) insights.push('Leads are highly engaged with longer conversations.')
    else if (metrics.avgConversationLength < 3) insights.push('Conversations are short. Consider improving AI engagement strategies.')
    return insights.length > 0 ? insights : ['Keep monitoring your AI performance to generate insights.']
}

function generateRecommendations(metrics: AIPerformanceMetrics): string[] {
    const recommendations: string[] = []
    if (metrics.aiResponseRate < 90) recommendations.push('Enable instant AI responses for all new conversations.')
    if (metrics.qualificationRate < 30) recommendations.push('Review and update your AI training data with more qualification examples.')
    if (metrics.bookingRate < 10) {
        recommendations.push('Add more available time slots to your calendar.')
        recommendations.push('Review AI prompts for meeting booking effectiveness.')
    }
    if (metrics.totalAiMessages / Math.max(metrics.totalConversations, 1) < 2) recommendations.push('Configure follow-up sequences to increase engagement.')
    return recommendations.length > 0 ? recommendations : ['Your AI is performing well! Continue monitoring for improvements.']
}

function calculateChange(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? '+100%' : '+0%'
    const change = ((current - previous) / previous) * 100
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
}

async function fetchPerformanceData(supabase: any, accountId: string, periodStart: string, previousPeriodStart: string) {
    const periodEnd = periodStart
    return Promise.all([
        supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('account_id', accountId).gte('created_at', periodStart),
        supabase.from('messages').select('*, conversation:conversations!inner(account_id)', { count: 'exact', head: true }).eq('conversation.account_id', accountId).eq('sender_type', 'ai').gte('created_at', periodStart),
        supabase.from('messages').select('*, conversation:conversations!inner(account_id)', { count: 'exact', head: true }).eq('conversation.account_id', accountId).eq('sender_type', 'lead').gte('created_at', periodStart),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('account_id', accountId).gte('created_at', periodStart),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('account_id', accountId).eq('status', 'qualified').gte('created_at', periodStart),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('account_id', accountId).in('status', ['contacted', 'qualified', 'booked']).gte('created_at', periodStart),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('account_id', accountId).eq('status', 'booked').gte('created_at', periodStart),
        supabase.from('meetings').select('*', { count: 'exact', head: true }).eq('account_id', accountId).gte('created_at', periodStart),
        supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('account_id', accountId).gte('created_at', previousPeriodStart).lt('created_at', periodEnd),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('account_id', accountId).eq('status', 'qualified').gte('created_at', previousPeriodStart).lt('created_at', periodEnd),
        supabase.from('meetings').select('*', { count: 'exact', head: true }).eq('account_id', accountId).gte('created_at', previousPeriodStart).lt('created_at', periodEnd),
    ])
}

function buildReport(accountId: string, periodStart: string, periodEnd: string, results: any[]): AIPerformanceReport {
    const [conversationsResult, aiMessagesResult, leadMessagesResult, totalLeadsResult, qualifiedLeadsResult, contactedLeadsResult, bookedLeadsResult, totalMeetingsResult, prevConversationsResult, prevQualifiedLeadsResult, prevMeetingsResult] = results

    const totalConversations = conversationsResult.count || 0
    const totalAiMessages = aiMessagesResult.count || 0
    const totalLeadMessages = leadMessagesResult.count || 0
    const totalLeads = totalLeadsResult.count || 0
    const qualifiedLeads = qualifiedLeadsResult.count || 0
    const contactedLeads = contactedLeadsResult.count || 0
    const bookedLeads = bookedLeadsResult.count || 0
    const totalMeetings = totalMeetingsResult.count || 0
    const prevConversations = prevConversationsResult.count || 0
    const prevQualifiedLeads = prevQualifiedLeadsResult.count || 0
    const prevMeetings = prevMeetingsResult.count || 0

    const aiRespondedConversations = totalAiMessages > 0 ? Math.min(totalConversations, Math.round(totalAiMessages / 2)) : 0
    const aiResponseRate = totalConversations > 0 ? Math.round((aiRespondedConversations / totalConversations) * 100) : 0
    const qualificationRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0
    const bookingRate = totalLeads > 0 ? Math.round((bookedLeads / totalLeads) * 100) : 0
    const avgConversationLength = totalConversations > 0 ? Math.round((totalAiMessages + totalLeadMessages) / totalConversations) : 0

    const prevQualificationRate = prevConversations > 0 ? Math.round((prevQualifiedLeads / prevConversations) * 100) : 0
    const prevBookingRate = prevConversations > 0 ? Math.round((prevMeetings / prevConversations) * 100) : 0

    const metrics: AIPerformanceMetrics = {
        totalConversations, aiRespondedConversations, aiResponseRate, avgConversationLength,
        totalLeads, qualifiedLeads, qualificationRate, totalMeetings, aiBookedMeetings: bookedLeads, bookingRate,
        totalAiMessages, totalLeadMessages, avgAiResponseTime: null,
        funnel: { leads: totalLeads, contacted: contactedLeads, qualified: qualifiedLeads, booked: bookedLeads },
        periodChange: {
            conversations: calculateChange(totalConversations, prevConversations),
            qualificationRate: calculateChange(qualificationRate, prevQualificationRate),
            bookingRate: calculateChange(bookingRate, prevBookingRate),
            responseRate: '+0%',
        },
    }

    const { score, grade } = calculatePerformanceScore(metrics)
    return { accountId, periodStart, periodEnd, metrics, score, grade, insights: generateInsights(metrics), recommendations: generateRecommendations(metrics) }
}


export async function getAIPerformanceReport(
    days: number = 7,
    providedSupabase?: any,
    providedAccountId?: string
): Promise<AIPerformanceReport | null> {
    const supabase = providedSupabase || await createClient()
    let accountId = providedAccountId
    if (!accountId) {
        const ctx = await getAccountContext()
        if (!ctx.ok) return null
        accountId = ctx.accountId
    }
    const now = new Date()
    const periodEnd = now.toISOString()
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
    const previousPeriodStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000).toISOString()
    try {
        const results = await fetchPerformanceData(supabase, accountId, periodStart, previousPeriodStart)
        return buildReport(accountId, periodStart, periodEnd, results)
    } catch (error) {
        console.error('Error generating AI performance report:', error)
        return null
    }
}

function _fetchCachedAIReport(accountId: string, days: number = 7) {
    return unstable_cache(
        async (): Promise<AIPerformanceReport | null> => {
            const supabase = createAdminClient()
            return getAIPerformanceReport(days, supabase, accountId)
        },
        [`ai-performance-${accountId}-${days}`],
        { revalidate: 300, tags: [`ai-performance-${accountId}`] }
    )()
}

export async function getCachedAIPerformanceReport(days: number = 7): Promise<AIPerformanceReport | null> {
    const context = await getAccountContext()
    if (!context.ok) return null
    return _fetchCachedAIReport(context.accountId, days)
}

export async function getAllAccountsAIReports(days: number = 7): Promise<AIPerformanceReport[]> {
    const supabase = createAdminClient()
    const { data: accounts, error } = await supabase.from('accounts').select('id').not('subscription_status', 'eq', 'canceled')
    if (error || !accounts || accounts.length === 0) {
        console.error('Error fetching accounts for AI reports:', error)
        return []
    }
    const reports = await Promise.all(accounts.map(account => getAIPerformanceReport(days, supabase, account.id)))
    return reports.filter((r): r is AIPerformanceReport => r !== null)
}


