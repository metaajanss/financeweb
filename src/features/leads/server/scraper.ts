'use server'

import { createClient } from '@/core/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getAccountContext } from '@/core/tenancy/account-context'
import { searchPlaces, getPlaceDetails } from '@/features/integrations/providers/google/maps'
import { logEvent } from '@/features/notifications/server/activity-log'
import { syncLeadToActiveCRMs } from '@/features/integrations/providers/crm/sync'
import { enrollLeadInSequences } from '@/features/sequences/services/enroll'
import { getIntegrations } from '@/features/settings'
import { appendLeadToSheet } from '@/features/integrations/providers/google/sheets'
import { calculateLeadScore } from '@/features/leads/services/scoring'
import type { PlaceResult } from '@/features/integrations/providers/google/maps'

export interface MapsLeadImport {
  place_id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  selected: boolean;
}

async function getMapsApiKey(accountId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('integrations')
    .select('config')
    .eq('account_id', accountId)
    .eq('provider', 'google_maps')
    .eq('status', 'connected')
    .single()

  return (data?.config as any)?.api_key ?? null
}

export async function searchGoogleMaps(keyword: string, location: string, maxResults: number) {
  const context = await getAccountContext()
  if (!context.ok) return { error: context.error }

  const apiKey = await getMapsApiKey(context.accountId)
  if (!apiKey) return { error: 'Google Maps API key not configured. Please add it in Settings → Integrations.' }

  const result = await searchPlaces({ keyword, location, maxResults, apiKey })
  if (result.error) return { error: result.error }

  const leads: MapsLeadImport[] = result.results.map((p: PlaceResult) => ({
    place_id: p.place_id,
    name: p.name,
    address: p.formatted_address,
    phone: p.formatted_phone_number || p.international_phone_number,
    website: p.website,
    rating: p.rating,
    user_ratings_total: p.user_ratings_total,
    types: p.types,
    selected: true,
  }))

  return { results: leads }
}

export async function enrichPlaceDetails(placeId: string) {
  const context = await getAccountContext()
  if (!context.ok) return { error: context.error }

  const apiKey = await getMapsApiKey(context.accountId)
  if (!apiKey) return { error: 'API key not configured' }

  const detail = await getPlaceDetails(placeId, apiKey)
  if (!detail) return { error: 'Could not fetch details' }

  return { result: detail }
}

export async function importMapsLeads(places: MapsLeadImport[], groupId?: string | null) {
  const supabase = await createClient()
  const context = await getAccountContext()
  if (!context.ok) return { error: context.error }

  const toImport = places.filter(p => p.selected)
  if (toImport.length === 0) return { error: 'No places selected' }

  const rows = toImport.map(place => {
    const nameParts = place.name.split(' ')
    const firstName = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ')
    const lastName = nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ') || ''

    const score = calculateLeadScore({
      email: null,
      phone: place.phone ?? null,
      company: place.name,
      source: 'google_maps',
      status: 'new',
      conversationCount: 0,
      leadReplyCount: 0,
      enrollmentCount: 0,
      createdAt: new Date().toISOString(),
    }).total

    return {
      account_id: context.accountId,
      first_name: firstName,
      last_name: lastName || null,
      email: null,
      phone: place.phone || null,
      company: place.name,
      source: 'google_maps',
      status: 'new' as const,
      group_id: groupId || null,
      score,
      metadata: {
        google_place_id: place.place_id,
        address: place.address,
        website: place.website,
        maps_rating: place.rating,
        maps_review_count: place.user_ratings_total,
        place_types: place.types,
        tags: ['Google Maps'],
        imported_from_maps: true,
        import_date: new Date().toISOString(),
      },
    }
  })

  const { data: inserted, error } = await supabase
    .from('leads')
    .insert(rows)
    .select()

  if (error) return { error: error.message }

  // Background tasks
  try {
    const integrations = await getIntegrations()
    if (inserted?.length) {
      for (const lead of inserted) {
        logEvent('lead.created', 'lead', lead.id, { source: 'google_maps', company: lead.company }).catch(() => {})
        enrollLeadInSequences(lead.id, context.accountId, 'google_maps', lead.group_id).catch(() => {})
      }
      if (integrations?.length) {
        syncLeadToActiveCRMs(inserted[0] as any, integrations as any).catch(() => {})
      }
      const sheetsProvider = integrations?.find(i => i.provider === 'google_sheets' && i.status === 'connected' && (i.config as any)?.autoExport)
      if (sheetsProvider) {
        for (const lead of inserted) appendLeadToSheet(sheetsProvider.id, lead as any).catch(() => {})
      }
    }
  } catch {}

  revalidatePath('/admin/leads')
  revalidateTag(`leads-${context.accountId}`)
  revalidateTag(`dashboard-${context.accountId}`)

  return { success: true, count: inserted?.length ?? 0 }
}
