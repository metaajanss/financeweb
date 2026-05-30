'use client';

import { Ghost, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { detectGhostLead, getGhostLeadStatus, detectWillRespond, getWillRespondStatus } from '@/features/leads/services/intelligence';
import type { Lead } from '@/features/leads/server/actions';

interface GhostLeadBadgeProps {
    lead: Lead;
    lastMessageAt: string | null;
    lastMessageSenderType: 'ai' | 'agent' | 'lead' | null;
    size?: 'sm' | 'md';
}

export function GhostLeadBadge({ lead, lastMessageAt, lastMessageSenderType, size = 'sm' }: GhostLeadBadgeProps) {
    const ghostInfo = detectGhostLead(lead, lastMessageAt, lastMessageSenderType);
    const status = getGhostLeadStatus(ghostInfo.isGhost, ghostInfo.daysSilent);

    if (!ghostInfo.isGhost) return null;

    const sizeClasses = {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-1'
    };

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wider ${status.color} ${sizeClasses[size]}`}
            title={ghostInfo.daysSilent > 0 ? `No response for ${ghostInfo.daysSilent} days` : 'Tagged as ghost lead'}
        >
            <Ghost size={size === 'sm' ? 10 : 12} />
            {status.label}
        </span>
    );
}

interface WillRespondBadgeProps {
    lead: Lead;
    lastMessageAt: string | null;
    lastMessageSenderType: 'ai' | 'agent' | 'lead' | null;
    conversationCount: number;
    leadReplyCount: number;
    daysSinceLastContact: number;
    size?: 'sm' | 'md';
}

export function WillRespondBadge({
    lead,
    lastMessageAt,
    lastMessageSenderType,
    conversationCount,
    leadReplyCount,
    daysSinceLastContact,
    size = 'sm'
}: WillRespondBadgeProps) {
    const result = detectWillRespond({
        lead,
        lastMessageAt,
        lastMessageSenderType,
        conversationCount,
        leadReplyCount,
        daysSinceLastContact,
    });

    const status = getWillRespondStatus(result);

    const sizeClasses = {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-1'
    };

    const Icon = result.willRespond && result.confidence >= 70 ? TrendingUp :
                 !result.willRespond && result.confidence >= 60 ? TrendingDown : Minus;

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border font-semibold ${status.color} ${sizeClasses[size]}`}
            title={`${result.reason} (Confidence: ${result.confidence}%)`}
        >
            <Icon size={size === 'sm' ? 10 : 12} />
            {status.label}
        </span>
    );
}

interface LeadIntelligenceBadgesProps {
    lead: Lead;
    conversation?: {
        last_message_at: string | null;
        last_message_sender_type: 'ai' | 'agent' | 'lead' | null;
    } | null;
    engagement?: {
        replyCount: number;
        conversationCount: number;
    };
}

export function LeadIntelligenceBadges({ lead, conversation, engagement }: LeadIntelligenceBadgesProps) {
    const daysSinceLastContact = conversation?.last_message_at
        ? Math.floor((Date.now() - new Date(conversation.last_message_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <GhostLeadBadge
                lead={lead}
                lastMessageAt={conversation?.last_message_at || null}
                lastMessageSenderType={conversation?.last_message_sender_type || null}
            />
            <WillRespondBadge
                lead={lead}
                lastMessageAt={conversation?.last_message_at || null}
                lastMessageSenderType={conversation?.last_message_sender_type || null}
                conversationCount={engagement?.conversationCount || 0}
                leadReplyCount={engagement?.replyCount || 0}
                daysSinceLastContact={daysSinceLastContact}
            />
        </div>
    );
}
