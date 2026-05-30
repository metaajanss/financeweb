'use server'

import { createClient } from '@/core/db/server'

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    return { success: true }
}
