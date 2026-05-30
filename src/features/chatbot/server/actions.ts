'use server'

import { createAdminClient } from '@/core/db/admin'
import { getProfile } from '@/core/db/server'
import { revalidatePath } from 'next/cache'

export async function getChatbotWidget() {
    const profile = await getProfile()
    if (!profile?.account_id) return null

    const supabase = createAdminClient()
    try {
        const { data, error } = await supabase
            .from('chatbot_widgets')
            .select('id, account_id, name, is_active, config, created_at')
            .eq('account_id', profile.account_id)
            .single()

        // PGRST116 = no rows, which is fine (widget not created yet)
        // Any other error (e.g. table missing) — return null gracefully
        if (error) return null
        return data
    } catch {
        return null
    }
}

export async function saveChatbotWidget(formData: {
    name: string
    is_active: boolean
    config: {
        color: string
        greeting: string
        bot_name: string
        collect_email: boolean
        collect_phone: boolean
        placeholder: string
        form_title: string
    }
}) {
    const profile = await getProfile()
    if (!profile?.account_id) return { error: 'Unauthorized' }

    const supabase = createAdminClient()

    // Check if widget exists
    const { data: existing } = await (supabase as any)
        .from('chatbot_widgets')
        .select('id')
        .eq('account_id', profile.account_id)
        .single()

    if (existing) {
        // Update existing
        const { error } = await (supabase as any)
            .from('chatbot_widgets')
            .update({
                name: formData.name,
                is_active: formData.is_active,
                config: formData.config,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)

        if (error) return { error: error.message }
        revalidatePath('/admin/chatbot')
        return { success: true, id: existing.id }
    } else {
        // Create new
        const { data: newWidget, error } = await (supabase as any)
            .from('chatbot_widgets')
            .insert({
                account_id: profile.account_id,
                name: formData.name,
                is_active: formData.is_active,
                config: formData.config,
            })
            .select('id')
            .single()

        if (error) return { error: error.message }
        revalidatePath('/admin/chatbot')
        return { success: true, id: newWidget?.id }
    }
}
