import { cache } from 'react'
import { createClient, getUser } from '@/core/db/server'
import { ensureProfileForUser } from '@/core/db/profile-bootstrap'
import type { Database } from '@/shared/types'

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type AccountRow = Database['public']['Tables']['accounts']['Row']

export type AccountContext =
  | {
      ok: true
      user: NonNullable<Awaited<ReturnType<typeof getUser>>>
      profile: ProfileRow
      accountId: string
      account: AccountRow | null
    }
  | {
      ok: false
      error: 'Unauthorized' | 'Account context missing'
    }

export type AccountContextData = {
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>
  profile: ProfileRow
  accountId: string
  account: AccountRow | null
  unreadTicketCount: number
}

/**
 * Optimized Account Context fetcher.
 * Reduces round-trips by joining profiles and accounts in a single query.
 */
export const getAccountContext = cache(async (): Promise<AccountContext | (AccountContextData & { ok: true })> => {
  try {
    // 1. Get user (Cached across the request)
    const user = await getUser()
    if (!user) {
      return { ok: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // 2. Optimized: Fetch Profile and Ticket count in parallel
    const [profileResult, ticketResult] = await Promise.allSettled([
      // Profile and Account in one round-trip
      supabase
        .from('profiles')
        .select('*, accounts(*)')
        .eq('id', user.id)
        .maybeSingle(),
      // Unread ticket count query (non-critical)
      supabase
        .from('ticket_messages')
        .select('id, tickets!inner(user_id, status)', { count: 'exact', head: true })
        .eq('is_admin_reply', true)
        .eq('is_read', false)
        .eq('tickets.user_id', user.id)
        .in('tickets.status', ['open', 'in_progress'])
    ])

    let profile = profileResult.status === 'fulfilled'
      ? (profileResult.value.data as (ProfileRow & { accounts: AccountRow | null }) | null)
      : null
    let account = profile?.accounts ?? null

    let unreadTicketCount = 0;
    if (ticketResult.status === 'fulfilled' && !ticketResult.value.error) {
      unreadTicketCount = ticketResult.value.count || 0;
    } else if (ticketResult.status === 'rejected') {
      console.warn('[getAccountContext] Ticket count query exception (non-fatal):', ticketResult.reason);
    } else if (ticketResult.value?.error) {
      console.warn('[getAccountContext] Ticket count query error (non-fatal):', ticketResult.value.error);
    }

    // 4. Fallback: If profile or account_id is missing, use the bootstrap logic
    if (!profile || !profile.account_id) {
      const hydratedProfile = await ensureProfileForUser(user)
      if (!hydratedProfile?.account_id) {
        return { ok: false, error: 'Account context missing' }
      }

      // Use the bootstrapped profile directly and fetch only the account (avoids a second profiles join)
      const { data: accountData } = await supabase
        .from('accounts')
        .select('id, name, plan_id, metadata, created_at, ai_config')
        .eq('id', hydratedProfile.account_id)
        .maybeSingle()

      profile = hydratedProfile as unknown as (ProfileRow & { accounts: AccountRow | null })
      account = (accountData as AccountRow | null) ?? null
    }

    if (!profile) {
      return { ok: false, error: 'Account context missing' }
    }

    // 5. Special Admin Logic
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
    if (account && user.email === adminEmail) {
      account.plan_id = 'business';
    }

    return {
      ok: true,
      user,
      profile: profile as ProfileRow,
      accountId: profile.account_id!,
      account: account as AccountRow | null,
      unreadTicketCount,
    }
  } catch (error) {
    console.error('[getAccountContext] Fatal Error:', error);
    return { ok: false, error: 'Account context missing' };
  }
})
