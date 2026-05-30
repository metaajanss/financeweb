'use server'

import { createClient, getUser, getProfile } from '@/core/db/server'
import { revalidatePath } from 'next/cache'
import { processMessage } from '@/features/conversations/services/message-processor'
import { sendViaChannel } from '@/core/channels'

export type Message = {
    id: string
    conversation_id: string
    sender_type: 'lead' | 'agent' | 'ai' | 'system'
    content: string
    created_at?: string | null
    metadata?: Record<string, unknown>
}

export type Conversation = {
    id: string
    lead_id: string
    status: 'active' | 'paused' | 'closed'
    last_message_at: string
    is_ai_active: boolean
    integration_id?: string
    integration?: {
        id: string
        config?: { email?: string }
        is_primary?: boolean
        label?: string
    }
    lead: {
        first_name: string
        last_name: string
        email: string
        source: string
        status?: string
    }
    messages: Message[]
    conversations?: Array<{ id: string; channel: string; created_at: string }> // All conversations for this lead
}

const CONVERSATIONS_PAGE_SIZE = 50
const MESSAGES_PAGE_SIZE = 100

export async function getConversations(cursor?: string) {
    try {
        const supabase = await createClient()

        const [user, profile] = await Promise.all([getUser(), getProfile()])
        if (!user || !profile?.account_id) return { data: [], hasMore: false }

        let query = supabase
            .from('conversations')
            .select(`
                id,
                lead_id,
                channel,
                status,
                last_message_at,
                is_ai_active,
                integration_id,
                created_at,
                integration:integrations(id, config, is_primary, label),
                lead:leads(first_name, last_name, email, source, status)
            `)
            .eq('account_id', profile.account_id)
            .order('last_message_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(CONVERSATIONS_PAGE_SIZE * 2) // Fetch more since we'll group them

        if (cursor) {
            // cursor format: "ISO_TIMESTAMP|UUID_ID" — composite keyset prevents duplicate/skip on ties
            const [ts, id] = cursor.split('|')
            if (ts && id) {
                query = query.or(`last_message_at.lt.${ts},and(last_message_at.eq.${ts},id.lt.${id})`)
            } else {
                query = query.lt('last_message_at', cursor)
            }
        }

        const { data: conversations, error } = await query

        if (error) {
            console.error('Error fetching conversations:', error)
            return { data: [], hasMore: false }
        }

        // Group conversations by lead_id
        const grouped = new Map<string, any>()
        const allConversations = (conversations || []) as any[]

        for (const conv of allConversations) {
            if (!grouped.has(conv.lead_id)) {
                grouped.set(conv.lead_id, {
                    ...conv,
                    conversations: [{ id: conv.id, channel: conv.channel, created_at: conv.created_at }]
                })
            } else {
                const existing = grouped.get(conv.lead_id)
                // Keep the most recent conversation as primary, but store all
                if (new Date(conv.last_message_at) > new Date(existing.last_message_at)) {
                    existing.last_message_at = conv.last_message_at
                    existing.id = conv.id
                    existing.integration_id = conv.integration_id
                    existing.is_ai_active = conv.is_ai_active
                }
                existing.conversations.push({ id: conv.id, channel: conv.channel, created_at: conv.created_at })
            }
        }

        const mergedData = Array.from(grouped.values())
            .slice(0, CONVERSATIONS_PAGE_SIZE)

        const hasMore = allConversations.length > (CONVERSATIONS_PAGE_SIZE * 2)
        const lastItem = mergedData[mergedData.length - 1]
        const nextCursor = hasMore && lastItem ? `${lastItem.last_message_at}|${lastItem.id}` : undefined

        return { data: mergedData as Conversation[], hasMore: hasMore || allConversations.length > CONVERSATIONS_PAGE_SIZE, nextCursor }
    } catch (error) {
        console.error('[getConversations] Fatal Error:', error);
        return { data: [], hasMore: false };
    }
}

export async function getUnreadConversationsCount() {
    try {
        const supabase = await createClient()

        const [user, profile] = await Promise.all([getUser(), getProfile()])
        if (!user || !profile?.account_id) return 0

        // Uses DB RPC with EXISTS to count unique conversations (not message rows).
        // The previous INNER JOIN query inflated the count when a conversation had multiple lead messages.
        const { data, error } = await supabase
            .rpc('get_unread_conversations_count', { p_account_id: profile.account_id })

        if (error) {
            console.error('Error fetching unread count:', error)
            return 0
        }

        return (data as number) || 0
    } catch (error) {
        console.error('[getUnreadConversationsCount] Fatal Error:', error);
        return 0;
    }
}

export async function getMessages(conversationId: string, before?: string) {
    try {
        const supabase = await createClient()
        const [user, profile] = await Promise.all([getUser(), getProfile()])
        if (!user || !profile?.account_id) return { data: [], hasMore: false }

        // RLS handles the account_id security check, but we add an explicit join
        // to conversations to satisfy security audit tests and ensure multi-tenancy.
        let query = supabase
            .from('messages')
            .select(`
                id,
                conversation_id,
                sender_type,
                content,
                created_at,
                metadata,
                conversations!inner(account_id)
            `)
            .eq('conversation_id', conversationId)
            .eq('conversations.account_id', profile.account_id)
            .order('created_at', { ascending: false })
            .limit(MESSAGES_PAGE_SIZE + 1)

        if (before) {
            query = query.lt('created_at', before)
        }

        const { data: messages, error } = await query

        if (error) {
            console.error('Error fetching messages:', error);
            return { data: [], hasMore: false };
        }

        const hasMore = (messages?.length ?? 0) > MESSAGES_PAGE_SIZE
        const data = (hasMore ? messages!.slice(0, MESSAGES_PAGE_SIZE) : messages || [])
            .reverse() as Message[]

        return { data, hasMore }
    } catch (error) {
        console.error('[getMessages] Fatal Error:', error);
        return { data: [], hasMore: false };
    }
}

export async function getMessagesForLead(leadId: string, before?: string) {
    try {
        const supabase = await createClient()
        const [user, profile] = await Promise.all([getUser(), getProfile()])
        if (!user || !profile?.account_id) return { data: [], hasMore: false }

        // Get all conversation IDs for this lead
        const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('id')
            .eq('lead_id', leadId)
            .eq('account_id', profile.account_id)

        if (convError || !conversations?.length) {
            console.error('Error fetching conversations for lead:', convError);
            return { data: [], hasMore: false };
        }

        const conversationIds = conversations.map(c => c.id)

        // Fetch messages from all conversations for this lead
        let query = supabase
            .from('messages')
            .select(`
                id,
                conversation_id,
                sender_type,
                content,
                created_at,
                metadata,
                conversations!inner(account_id)
            `)
            .in('conversation_id', conversationIds)
            .eq('conversations.account_id', profile.account_id)
            .order('created_at', { ascending: false })
            .limit(MESSAGES_PAGE_SIZE + 1)

        if (before) {
            query = query.lt('created_at', before)
        }

        const { data: messages, error } = await query

        if (error) {
            console.error('Error fetching messages:', error);
            return { data: [], hasMore: false };
        }

        const hasMore = (messages?.length ?? 0) > MESSAGES_PAGE_SIZE
        const data = (hasMore ? messages!.slice(0, MESSAGES_PAGE_SIZE) : messages || [])
            .reverse() as Message[]

        return { data, hasMore }
    } catch (error) {
        console.error('[getMessagesForLead] Fatal Error:', error);
        return { data: [], hasMore: false };
    }
}

export async function sendMessage(conversationId: string, content: string): Promise<{ success?: boolean, message?: Message, error?: string, channelError?: string | null }> {
    const supabase = await createClient()
    const [user, profile] = await Promise.all([getUser(), getProfile()])
    if (!user) return { error: 'Unauthorized' }
    if (!profile?.account_id) return { error: 'No account found' }

    // 1. Verify conversation ownership and get lead_id + integration_id in one go
    const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('id, lead_id, integration_id')
        .eq('id', conversationId)
        .eq('account_id', profile.account_id)
        .single()

    if (convError || !conv) return { error: 'Conversation not found or access denied' }

    // 2. Insert message and update conversation timestamp concurrently if possible,
    // but message insert should be returned.
    const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_type: 'agent' as any,
            content,
        })
        .select()
        .single()

    if (messageError) return { error: messageError.message }

    // 3. Fire-and-forget: timestamp update runs in background; channel delivery errors are surfaced.
    // Pass conversation's integration_id so reply goes from the same Gmail account that received the email
    const channelResult = await Promise.allSettled([
        supabase.from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversationId),
        conv.lead_id ? sendViaChannel(conv.lead_id, content, undefined, undefined, undefined, (conv as any).integration_id ?? undefined) : Promise.resolve(),
    ])

    const channelError = channelResult[1].status === 'rejected'
        ? (channelResult[1].reason as Error)?.message ?? 'Channel delivery failed'
        : null

    revalidatePath('/admin/conversations')
    return { success: true, message: message as unknown as Message, channelError }
}

export async function toggleAIForConversation(conversationId: string, isActive: boolean) {
    const supabase = await createClient()
    const profile = await getProfile()
    if (!profile?.account_id) return { error: 'No account' }

    const { error } = await supabase
        .from('conversations')
        .update({ is_ai_active: isActive })
        .eq('id', conversationId)
        .eq('account_id', profile.account_id)
    if (error) return { error: error.message }
    revalidatePath('/admin/conversations')
    return { success: true }
}

const demoMessages = [
    "Fiyatlarınız hakkında bilgi alabilir miyim?",
    "Hangi ödeme seçeneklerini sunuyorsunuz?",
    "Sizinle bir toplantı yapmak istiyorum, yarın saat 14:00 uygun mu?",
    "Ürünlerinizin kurulum süreci ne kadar sürüyor?",
    "Gelecek Salı günü saat 10:00'da bir görüşme ayarlayabilir miyiz?",
    "Referanslarınızdan bazılarını paylaşabilir misiniz?",
    "Kurumsal müşteriler için özel fiyat var mı?",
]

/**
 * SIMULATE LEAD MESSAGE (REFACTORED)
 * Now uses the central AI service for all processing
 */
export async function simulateLeadMessage(conversationId: string) {
    const message = demoMessages[Math.floor(Math.random() * demoMessages.length)]
    
    // All the heavy logic (Intent, Calendar, Gemini) is now in the service layer
    const result = await processMessage(conversationId, message)
    
    revalidatePath('/admin/conversations')
    return result
}

export async function createConversation(leadId: string, channel: 'whatsapp' | 'email' | 'widget' | 'instagram' | 'tiktok' | 'web_chatbot' = 'widget') {
    const supabase = await createClient()
    const profile = await getProfile()
    if (!profile?.account_id) return { error: 'No account' }

    const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
            account_id: profile.account_id,
            lead_id: leadId,
            status: 'active',
            channel,
            last_message_at: new Date().toISOString()
        })
        .select('id')
        .single()

    if (error) return { error: error.message }

    revalidatePath('/admin/conversations')
    return { id: newConv.id }
}

// Demo seeder stays here as it's an action-exclusive helper
export async function seedDemoConversations() {
    const supabase = await createClient()
    const profile = await getProfile()
    if (!profile?.account_id) throw new Error('Account not found')
    const account_id = profile.account_id

    const suffix = Math.floor(Math.random() * 9000) + 1000 
    const demoLeads = [
        { account_id, first_name: `John #${suffix}`, last_name: 'Doe', email: `john.doe.${suffix}@example.com`, status: 'booked', source: 'WhatsApp' },
        { account_id, first_name: `Jane #${suffix}`, last_name: 'Smith', email: `jane.smith.${suffix}@example.com`, status: 'contacted', source: 'E-mail' }
    ]

    const { data: leads } = await supabase.from('leads').insert(demoLeads as any[]).select()
    if (!leads) return { error: 'Lead seeding failed' }

    for (const lead of leads) {
        const { data: conv } = await supabase.from('conversations').insert({
            account_id, 
            lead_id: (lead as any).id, 
            status: 'active', 
            channel: (lead as any).source || 'unknown',
            last_message_at: new Date().toISOString()
        } as any).select().single()

        if (conv) {
            await supabase.from('messages').insert([
                { conversation_id: (conv as any).id, sender_type: 'lead', content: 'Hi, I need help!' },
                { conversation_id: (conv as any).id, sender_type: 'ai', content: 'Sure, how can I assist you today?' }
            ] as any[])
        }
    }

    revalidatePath('/admin/conversations')
    return { success: true }
}

export async function updateConversationStatus(conversationId: string, status: 'active' | 'paused' | 'closed') {
    const supabase = await createClient()
    const profile = await getProfile()
    if (!profile?.account_id) return { error: 'No account' }

    const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', conversationId)
        .eq('account_id', profile.account_id)

    if (error) return { error: error.message }
    
    revalidatePath('/admin/conversations')
    return { success: true }
}
export async function markConversationRead(conversationId: string) {
    const supabase = await createClient()
    const profile = await getProfile()
    if (!profile?.account_id) return { error: 'No account' }

    const { error } = await supabase
        .from('conversations')
        .update({ metadata: { last_read_at: new Date().toISOString() } } as any)
        .eq('id', conversationId)
        .eq('account_id', profile.account_id)

    if (error) return { error: error.message }
    return { success: true }
}

export async function deleteConversation(conversationId: string) {
    const supabase = await createClient()
    const profile = await getProfile()
    if (!profile?.account_id) return { error: 'No account' }

    const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('account_id', profile.account_id)

    if (error) return { error: error.message }
    
    revalidatePath('/admin/conversations')
    return { success: true }
}
