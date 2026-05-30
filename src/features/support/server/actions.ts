'use server'

import { createClient, getUser } from '@/core/db/server'
import { revalidatePath } from 'next/cache'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export type Ticket = {
    id: string
    created_at: string
    updated_at: string
    user_id: string
    subject: string
    description: string | null
    status: TicketStatus
    priority: TicketPriority
}

export type TicketMessage = {
    id: string
    ticket_id: string
    user_id: string
    message: string
    created_at: string
    is_admin_reply: boolean
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@admin.com'

export async function createTicket(data: { subject: string; description: string; priority: TicketPriority }) {
    const user = await getUser()
    if (!user) return { error: 'Unauthorized' }

    const supabase = await createClient()
    const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
            user_id: user.id,
            subject: data.subject,
            description: data.description,
            priority: data.priority,
            status: 'open'
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating ticket:', error)
        return { error: error.message }
    }

    revalidatePath('/admin/support/tickets')
    revalidatePath('/super-admin/tickets')
    return { data: ticket }
}

export async function getUserTickets() {
    const user = await getUser()
    if (!user) return []

    const supabase = await createClient()
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('id, created_at, updated_at, user_id, subject, description, status, priority')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

    if (error) {
        console.error('Error fetching user tickets:', error)
        return []
    }

    return tickets as Ticket[]
}

export async function getTicketById(id: string) {
    const user = await getUser()
    if (!user) return null

    const supabase = await createClient()
    const { data: ticket, error } = await supabase
        .from('tickets')
        .select('id, created_at, updated_at, user_id, subject, description, status, priority')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching ticket:', error)
        return null
    }

    return ticket as Ticket
}

export async function getTicketMessages(ticketId: string) {
    const user = await getUser()
    if (!user) return []

    const supabase = await createClient()
    const { data: messages, error } = await supabase
        .from('ticket_messages')
        .select('id, ticket_id, user_id, message, created_at, is_admin_reply')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching ticket messages:', error)
        return []
    }

    return messages as TicketMessage[]
}

export async function addTicketMessage(ticketId: string, message: string) {
    const user = await getUser()
    if (!user) return { error: 'Unauthorized' }

    const isAdmin = user.email === ADMIN_EMAIL

    const supabase = await createClient()
    const { data: newMessage, error } = await supabase
        .from('ticket_messages')
        .insert({
            ticket_id: ticketId,
            user_id: user.id,
            message,
            is_admin_reply: isAdmin
        })
        .select()
        .maybeSingle()

    if (error) {
        console.error('Error adding message:', error)
        return { error: error.message }
    }

    await supabase.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticketId)

    revalidatePath(`/admin/support/tickets/${ticketId}`)
    revalidatePath(`/super-admin/tickets/${ticketId}`)
    revalidatePath('/super-admin/tickets')
    revalidatePath('/admin/support/tickets')

    return { data: newMessage }
}

export async function markTicketMessagesAsRead(ticketId: string) {
    const user = await getUser()
    if (!user) return { error: 'Unauthorized' }

    const supabase = await createClient()
    const { error } = await supabase
        .from('ticket_messages')
        .update({ is_read: true })
        .eq('ticket_id', ticketId)
        .eq('is_admin_reply', true)

    if (error) {
        console.error('Error marking messages as read:', error)
        return { error: error.message }
    }

    revalidatePath('/admin/support/tickets')
    revalidatePath(`/admin/support/tickets/${ticketId}`)

    return { success: true }
}

export async function getAllTickets() {
    try {
        const user = await getUser()
        if (!user) return []

        const isAdmin = user.email === ADMIN_EMAIL || user.app_metadata?.role === 'super_admin'
        if (!isAdmin) return []

        const supabase = await createClient()
        const { data: tickets, error } = await supabase
            .from('tickets')
            .select('*, profiles(full_name)')
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('Error fetching all tickets from DB:', error)
            const { data: simpleTickets, error: simpleError } = await supabase
                .from('tickets')
                .select('id, created_at, updated_at, user_id, subject, description, status, priority')
                .order('updated_at', { ascending: false })

            if (simpleError) {
                console.error('Error fetching simple tickets:', simpleError)
                return []
            }
            return simpleTickets || []
        }

        return tickets || []
    } catch (e) {
        console.error('Critical error in getAllTickets server action:', e)
        return []
    }
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
    const user = await getUser()
    if (!user) return { error: 'Unauthorized' }

    if (user.email !== ADMIN_EMAIL) return { error: 'Forbidden' }

    const supabase = await createClient()
    const { error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', ticketId)

    if (error) {
        console.error('Error updating ticket status:', error)
        return { error: error.message }
    }

    revalidatePath(`/admin/support/tickets/${ticketId}`)
    revalidatePath(`/super-admin/tickets/${ticketId}`)
    revalidatePath('/super-admin/tickets')

    return { success: true }
}

export async function getUnreadTicketCount() {
    const user = await getUser()
    if (!user) return 0

    const supabase = await createClient()

    // Optimized: Single query with inner join to tickets to filter by user and status
    const { count, error } = await supabase
        .from('ticket_messages')
        .select('id, tickets!inner(user_id, status)', { count: 'exact', head: true })
        .eq('is_admin_reply', true)
        .eq('is_read', false)
        .eq('tickets.user_id', user.id)
        .in('tickets.status', ['open', 'in_progress'])


    if (error) {
        // Fallback to simpler version if join fails (schema might vary)
        console.warn('Optimized ticket count failed, falling back:', error.message)
        const { data: tickets } = await supabase
            .from('tickets')
            .select('id')
            .eq('user_id', user.id)
            .in('status', ['open', 'in_progress'])

        if (!tickets || tickets.length === 0) return 0

        const { count: fallbackCount } = await supabase
            .from('ticket_messages')
            .select('id', { count: 'exact', head: true })
            .eq('is_admin_reply', true)
            .eq('is_read', false)
            .in('ticket_id', tickets.map(t => t.id))

        return fallbackCount || 0
    }

    return count || 0
}

