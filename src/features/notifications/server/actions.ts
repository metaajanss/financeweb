'use server'

import { createClient } from '@/core/db/server'
import { revalidatePath } from 'next/cache'

export type Notification = {
    id: string
    user_id: string
    account_id: string | null
    title: string
    message: string | null
    type: 'info' | 'success' | 'warning' | 'error'
    read: boolean
    link: string | null
    created_at: string
}

export async function getNotifications() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: notifications, error } = await supabase
        .from('notifications')
        .select('id, user_id, account_id, title, message, type, read, link, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Error fetching notifications:', error)
        return []
    }

    return (notifications || []) as Notification[]
}

export async function markNotificationAsRead(id: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        console.error('Error marking notification as read:', error)
        return { error: error.message }
    }

    revalidatePath('/')
    return { success: true }
}

export async function markAllNotificationsAsRead() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

    if (error) {
        console.error('Error marking all notifications as read:', error)
        return { error: error.message }
    }

    revalidatePath('/')
    return { success: true }
}

export async function createNotification(data: {
    user_id: string,
    account_id?: string,
    title: string,
    message?: string,
    type?: 'info' | 'success' | 'warning' | 'error',
    link?: string
}) {
    const supabase = await createClient()

    const { error } = await supabase.from('notifications').insert({
        user_id: data.user_id,
        account_id: data.account_id || null,
        title: data.title,
        message: data.message || '',
        type: data.type || 'info',
        link: data.link || null,
        read: false
    })

    if (error) {
        console.error('Error creating notification:', error)
        return { error: error.message }
    }

    revalidatePath('/')
    return { success: true }
}

export async function notifyAdmins(accountId: string, data: {
    title: string,
    message?: string,
    type?: 'info' | 'success' | 'warning' | 'error',
    link?: string
}) {
    const supabase = await createClient()

    // Find all admins for this account
    const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('account_id', accountId)
        .eq('role', 'admin')

    if (!admins || admins.length === 0) return

    const notifications = admins.map(admin => ({
        user_id: admin.id,
        account_id: accountId,
        title: data.title,
        message: data.message || '',
        type: data.type || 'info',
        link: data.link || null,
        read: false
    }))

    const { error } = await supabase.from('notifications').insert(notifications)

    if (error) {
        console.error('Error batch creating notifications:', error)
        return { error: error.message }
    }

    // revalidatePath('/') - Removed to prevent crash during render\n    return { success: true }
}
