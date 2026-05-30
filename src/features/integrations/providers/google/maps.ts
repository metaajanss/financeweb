const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  business_status?: string;
  geometry?: { location: { lat: number; lng: number } };
  opening_hours?: { open_now?: boolean };
  international_phone_number?: string;
}

export interface MapsSearchParams {
  keyword: string;
  location: string;
  maxResults?: number;
  apiKey: string;
}

export interface MapsSearchResult {
  results: PlaceResult[];
  error?: string;
}

export async function searchPlaces(params: MapsSearchParams): Promise<MapsSearchResult> {
  const { keyword, location, maxResults = 20, apiKey } = params;

  const allResults: PlaceResult[] = [];
  let nextPageToken: string | undefined;

  do {
    const urlParams = new URLSearchParams({
      query: `${keyword} ${location}`,
      key: apiKey,
    });
    if (nextPageToken) urlParams.set('pagetoken', nextPageToken);

    const url = `${PLACES_BASE}/textsearch/json?${urlParams}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return { results: allResults, error: `Google API error: ${data.status} — ${data.error_message || ''}` };
    }

    allResults.push(...(data.results || []));
    nextPageToken = data.next_page_token;

    if (allResults.length >= maxResults) break;

    // next_page_token requires a short delay before it becomes valid
    if (nextPageToken) await new Promise(r => setTimeout(r, 2000));
  } while (nextPageToken && allResults.length < maxResults);

  return { results: allResults.slice(0, maxResults) };
}

export async function getPlaceDetails(placeId: string, apiKey: string): Promise<PlaceResult | null> {
  const fields = [
    'place_id', 'name', 'formatted_address', 'formatted_phone_number',
    'international_phone_number', 'website', 'rating', 'user_ratings_total',
    'types', 'business_status', 'geometry', 'opening_hours',
  ].join(',');

  const url = `${PLACES_BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status === 'OK') return data.result as PlaceResult;
  return null;
}
