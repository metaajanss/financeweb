"use server"

import { createClient } from '@/core/db/server'
import { revalidatePath } from 'next/cache'
import { getAccountPlan } from '@/core/tenancy/get-account-plan'
import { getPlanLimits } from '@/config/plans'

export type SequenceSettingsPayload = {
    dailyEmailLimit: number;
    monthlyWhatsappLimit: number;
    blackoutStartHour: number;
    blackoutEndHour: number;
    blackoutAction: 'delay' | 'skip';
    defaultTimezone: string;
    respectUnsubscribes: boolean;
}

export async function fetchSequenceSettings(): Promise<SequenceSettingsPayload | null> {
    try {
        const supabase = await createClient()

        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user) return null

        const { data: profile } = await supabase
            .from('profiles')
            .select('account_id')
            .eq('id', user.id)
            .single()

        if (!profile?.account_id) return null

        const { data: account } = await supabase
            .from('accounts')
            .select('sequence_settings')
            .eq('id', profile.account_id)
            .single()

        if (account?.sequence_settings) {
            return typeof account.sequence_settings === 'string' 
                ? JSON.parse(account.sequence_settings)
                : account.sequence_settings as any;
        }

        return null
    } catch (error) {
        console.error('Error in fetchSequenceSettings:', error)
        return null
    }
}

export async function saveSequenceSettings(settings: SequenceSettingsPayload): Promise<{ success?: boolean; error?: string }> {
    try {
        const supabase = await createClient()

        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user) return { error: 'Unauthorized' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('account_id')
            .eq('id', user.id)
            .single()

        if (!profile?.account_id) return { error: 'No account found' }

        const plan = await getAccountPlan()
        const planLimits = getPlanLimits(plan)
        const cappedSettings: SequenceSettingsPayload = {
            ...settings,
            monthlyWhatsappLimit: Math.min(settings.monthlyWhatsappLimit, planLimits.monthlyWhatsappMessages),
            dailyEmailLimit: Math.min(settings.dailyEmailLimit, planLimits.dailyEmailMessages),
        }

        const { error } = await supabase
            .from('accounts')
            .update({ sequence_settings: cappedSettings })
            .eq('id', profile.account_id)

        if (error) {
            console.error('Error updating settings:', error)
            return { error: error.message }
        }

        revalidatePath('/admin/settings/sequences', 'page')
        return { success: true }
    } catch (err: any) {
        console.error('Fatal error in saveSequenceSettings:', err)
        return { error: err.message || 'Fatal error saving settings' }
    }
}
