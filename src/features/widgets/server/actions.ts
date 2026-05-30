'use server'

import { createClient } from '@/core/db/server'
import { revalidatePath } from 'next/cache'

export type WidgetConfig = {
    phone: string
    message: string
    button_text: string
    position: 'bottom-right' | 'bottom-left'
    color: string
    bubble_text: string
}

export type Widget = {
    id: string
    account_id: string
    name: string
    is_active: boolean
    config: WidgetConfig
    created_at: string
}

export async function getWidget() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single()

    if (!profile?.account_id) return null

    const { data: widget, error } = await supabase
        .from('widgets')
        .select('id, account_id, name, is_active, config, created_at')
        .eq('account_id', profile.account_id)
        .single()

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching widget:', error)
        return null
    }

    return widget as Widget | null
}

export async function updateWidget(data: Partial<Widget>) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single()

    if (!profile?.account_id) return { error: 'No account found' }

    // Check if widget exists
    const { data: existing } = await supabase
        .from('widgets')
        .select('id')
        .eq('account_id', profile.account_id)
        .single()

    if (existing) {
        const { error } = await supabase
            .from('widgets')
            .update(data)
            .eq('id', existing.id)

        if (error) return { error: error.message }
    } else {
        const { error } = await supabase
            .from('widgets')
            .insert({
                ...data,
                account_id: profile.account_id
            })

        if (error) return { error: error.message }
    }

    revalidatePath('/admin/leads/widget')
    return { success: true }
}
