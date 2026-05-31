'use server'

import { createClient } from '@/core/db/server'

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    return { success: true }
}

export async function signIn(email: string, password: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}
