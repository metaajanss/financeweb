/**
 * Lead Intelligence Module
 *
 * Provides intelligent lead analysis including:
 * - Ghost lead detection
 * - Will respond prediction
 * - Engagement pattern analysis
 */

import type { Lead } from '@/features/leads/server/actions';

export interface WillRespondInput {
    lead: Lead;
    lastMessageAt: string | null;
    lastMessageSenderType: 'ai' | 'agent' | 'lead' | null;
    conversationCount: number;
    leadReplyCount: number;
    daysSinceLastContact: number;
    engagementScore?: number;
}

export interface WillRespondResult {
    willRespond: boolean;
    confidence: number;
    reason: string;
    factors: {
        engagementScore: number;
        recencyScore: number;
        responseHistoryScore: number;
        statusScore: number;
    };
}

/**
 * Detects if a lead is a "ghost" (stopped responding)
 */
export function detectGhostLead(
    lead: Lead,
    lastMessageAt: string | null,
    lastMessageSenderType: 'ai' | 'agent' | 'lead' | null,
    silentDays: number = 3
): {
    isGhost: boolean;
    daysSilent: number;
    ghostSince: string | null;
} {
    const metadata = (lead.metadata as Record<string, unknown>) || {};
    const isTaggedGhost = metadata.ghost === true;

    let daysSilent = 0;
    if (lastMessageAt) {
        const lastMsgDate = new Date(lastMessageAt);
        const now = new Date();
        daysSilent = Math.floor((now.getTime() - lastMsgDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const wasLastMessageFromUs = lastMessageSenderType === 'ai' || lastMessageSenderType === 'agent';
    const isRelevantStatus = lead.status === 'contacted' || lead.status === 'qualified' || lead.status === 'new';
    const hasGoneSilent = daysSilent >= silentDays;

    const isGhost = isTaggedGhost || (wasLastMessageFromUs && hasGoneSilent && isRelevantStatus && daysSilent > 0);

    return {
        isGhost,
        daysSilent,
        ghostSince: isGhost && lastMessageAt ? lastMessageAt : null,
    };
}

/**
 * Predicts whether a lead will respond based on various factors
 */
export function detectWillRespond(input: WillRespondInput): WillRespondResult {
    const {
        lead,
        lastMessageAt: _lastMessageAt,
        lastMessageSenderType,
        conversationCount,
        leadReplyCount,
        daysSinceLastContact,
        engagementScore = lead.score ?? 50,
    } = input;

    // Factor 1: Engagement Score (0-40 points)
    let engagementPoints = 0;
    if (engagementScore >= 80) engagementPoints = 40;
    else if (engagementScore >= 60) engagementPoints = 30;
    else if (engagementScore >= 40) engagementPoints = 20;
    else if (engagementScore >= 20) engagementPoints = 10;
    else engagementPoints = 5;

    // Factor 2: Recency (0-25 points)
    let recencyPoints = 0;
    if (daysSinceLastContact <= 1) recencyPoints = 25;
    else if (daysSinceLastContact <= 3) recencyPoints = 20;
    else if (daysSinceLastContact <= 7) recencyPoints = 15;
    else if (daysSinceLastContact <= 14) recencyPoints = 10;
    else if (daysSinceLastContact <= 30) recencyPoints = 5;
    else recencyPoints = 0;

    // Factor 3: Response History (0-25 points)
    let responseHistoryPoints = 0;
    if (leadReplyCount >= 5) responseHistoryPoints = 25;
    else if (leadReplyCount >= 3) responseHistoryPoints = 20;
    else if (leadReplyCount >= 1) responseHistoryPoints = 15;
    else if (conversationCount > 0 && leadReplyCount === 0) responseHistoryPoints = 5;
    else responseHistoryPoints = 0;

    if (lastMessageSenderType === 'lead') {
        responseHistoryPoints = Math.min(25, responseHistoryPoints + 10);
    }

    // Factor 4: Status (0-10 points)
    let statusPoints = 0;
    switch (lead.status) {
        case 'booked': statusPoints = 10; break;
        case 'qualified': statusPoints = 8; break;
        case 'contacted': statusPoints = 6; break;
        case 'new': statusPoints = 4; break;
        default: statusPoints = 2;
    }

    const totalScore = engagementPoints + recencyPoints + responseHistoryPoints + statusPoints;

    let willRespond = false;
    let confidence = 0;
    let reason = '';

    if (totalScore >= 70) {
        willRespond = true;
        confidence = Math.min(100, totalScore);
        reason = leadReplyCount > 0 ? 'Previously engaged lead with high activity' : 'High-quality lead with strong profile';
    } else if (totalScore >= 40) {
        willRespond = true;
        confidence = totalScore;
        reason = 'Moderate engagement - follow-up recommended';
    } else {
        willRespond = false;
        confidence = 100 - totalScore;
        reason = daysSinceLastContact > 14 ? 'Lead has gone cold' : 'Low engagement signals';
    }

    return {
        willRespond,
        confidence,
        reason,
        factors: {
            engagementScore: engagementPoints,
            recencyScore: recencyPoints,
            responseHistoryScore: responseHistoryPoints,
            statusScore: statusPoints,
        },
    };
}

/**
 * Get ghost lead status label and styling
 */
export function getGhostLeadStatus(isGhost: boolean, daysSilent: number): {
    label: string;
    variant: 'ghost' | 'warning' | 'danger' | 'success';
    color: string;
} {
    if (!isGhost) {
        return {
            label: 'Active',
            variant: 'success',
            color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        };
    }

    if (daysSilent >= 14) {
        return {
            label: `Ghost (${daysSilent}d)`,
            variant: 'danger',
            color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        };
    }

    if (daysSilent >= 7) {
        return {
            label: `Ghost (${daysSilent}d)`,
            variant: 'warning',
            color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        };
    }

    return {
        label: `Ghost (${daysSilent}d)`,
        variant: 'ghost',
        color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    };
}

/**
 * Get will respond prediction label and styling
 */
export function getWillRespondStatus(result: WillRespondResult): {
    label: string;
    sublabel: string;
    variant: 'likely' | 'maybe' | 'unlikely';
    color: string;
    icon: string;
} {
    if (result.willRespond && result.confidence >= 70) {
        return {
            label: 'Likely to Respond',
            sublabel: `${result.confidence}% confidence`,
            variant: 'likely',
            color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            icon: '↗️',
        };
    }

    if (result.willRespond && result.confidence >= 40) {
        return {
            label: 'May Respond',
            sublabel: `${result.confidence}% confidence`,
            variant: 'maybe',
            color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            icon: '↔️',
        };
    }

    return {
        label: 'Unlikely to Respond',
        sublabel: `${result.confidence}% confidence`,
        variant: 'unlikely',
        color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        icon: '↘️',
    };
}

