import { createServerClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import { cache } from 'react'
import { Database } from '@/shared/types'
import { ensureProfileForUser } from '@/core/db/profile-bootstrap'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

/**
 * Returns a NO-OP Supabase client for use during build/SSG when environment variables are missing.
 * This prevents the build from crashing while allowing code that expects a client to initialize.
 */
function createNoopClient<T>(): SupabaseClient<T> {
    const mockQuery = () => ({
        select: mockQuery,
        eq: mockQuery,
        neq: mockQuery,
        gt: mockQuery,
        gte: mockQuery,
        lt: mockQuery,
        lte: mockQuery,
        like: mockQuery,
        ilike: mockQuery,
        is: mockQuery,
        in: mockQuery,
        contains: mockQuery,
        containedBy: mockQuery,
        rangeGt: mockQuery,
        rangeGte: mockQuery,
        rangeLt: mockQuery,
        rangeLte: mockQuery,
        rangeAdjacent: mockQuery,
        overlaps: mockQuery,
        textSearch: mockQuery,
        match: mockQuery,
        not: mockQuery,
        or: mockQuery,
        filter: mockQuery,
        order: mockQuery,
        limit: mockQuery,
        range: mockQuery,
        abortSignal: mockQuery,
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        csv: mockQuery,
        then: (cb: (value: { data: unknown[]; error: unknown }) => unknown) => cb({ data: [], error: null }),
    });

    return {
        from: () => ({
            select: mockQuery,
            insert: () => Promise.resolve({ data: null, error: null }),
            update: mockQuery,
            upsert: () => Promise.resolve({ data: null, error: null }),
            delete: mockQuery,
        }),
        auth: {
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        },
    } as unknown as SupabaseClient<T>;
}

export const createClient = cache(async (): Promise<SupabaseClient<Database>> => {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[Supabase] Missing environment variables. Returning NO-OP client for build compatibility.');
        return createNoopClient<Database>();
    }

    return createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                    }
                },
            },
        }
    )
})

/**
 * Helper to get the current user with request-level caching.
 */
export const getUser = cache(async () => {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.getUser()
        if (error || !data?.user) return null
        return data.user
    } catch (e) {
        console.error('[Supabase Server] getUser fatal error:', e)
        return null
    }
})

/**
 * Helper to get the current user's profile with request-level caching.
 * Includes explicit return type narrowing for ProfileRow.
 */
export const getProfile = cache(async (): Promise<ProfileRow | null> => {
    const user = await getUser()
    if (!user) return null

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    const profile = (data ?? null) as ProfileRow | null

    if (error) {
        console.error('[getProfile] Failed to load profile:', error)
    }

    if (profile?.account_id) {
        return profile as ProfileRow
    }

    const hydratedProfile = await ensureProfileForUser(user)
    if (!hydratedProfile) return null
    
    return hydratedProfile
})

/**
 * Helper to create a Supabase client without cookies.
 * Used for static generation (like sitemap) to avoid "Dynamic Server Usage" errors.
 */
export const createClientForSitemap = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return createNoopClient<Database>();
    }

    return createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() { return [] },
                setAll() { },
            },
        }
    )
}
