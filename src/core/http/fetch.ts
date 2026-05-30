export type FetchWithRetryOptions = RequestInit & {
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
  /** Retry when response has one of these HTTP status codes (e.g. 429, 500, 502, 503, 504) */
  retryOnStatuses?: number[]
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  options: FetchWithRetryOptions = {}
) {
  const {
    timeoutMs = 10000,
    retries = 1,
    retryDelayMs = 500,
    retryOnStatuses,
    signal,
    ...init
  } = options

  let attempt = 0
  let lastError: unknown
  let lastResponse: Response | null = null

  while (attempt <= retries) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const abortListener = () => controller.abort()
    signal?.addEventListener('abort', abortListener)

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })

      // Retry on configured status codes (exponential backoff)
      if (retryOnStatuses?.includes(response.status) && attempt < retries) {
        lastResponse = response
        await sleep(retryDelayMs * Math.pow(2, attempt))
        attempt += 1
        continue
      }

      return response
    } catch (error) {
      lastError = error
      if (attempt === retries) {
        throw error
      }
      await sleep(retryDelayMs * (attempt + 1))
    } finally {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', abortListener)
    }

    attempt += 1
  }

  if (lastResponse) return lastResponse
  throw lastError instanceof Error ? lastError : new Error('Request failed')
}

