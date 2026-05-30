import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/shared/types'

export function createClient(): SupabaseClient<Database> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase Env Vars Missing!', {
            url: supabaseUrl,
            key: supabaseAnonKey ? 'Set' : 'Missing'
        });
        // Return a client that will fail if used, but won't crash on initialization
        return createBrowserClient<Database>(
            supabaseUrl || 'https://placeholder.supabase.co',
            supabaseAnonKey || 'placeholder'
        )
    }

    return createBrowserClient<Database>(
        supabaseUrl,
        supabaseAnonKey
    )
}
