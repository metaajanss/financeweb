import type {
    PlatformAdapter,
    PlatformCredentials,
    PublishResult,
    SocialMediaPost,
    TwitterPostMetadata,
} from '@/shared/types/social-media.types'
import { createAdminClient } from '@/core/db/admin'

const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize'
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token'
const TWITTER_API_BASE  = 'https://api.twitter.com/2'
const MAX_TWEET_CHARS   = 280
const THREAD_CHAR_LIMIT = 270  // biraz boşluk bırak (N/N için)

export class TwitterAdapter implements PlatformAdapter {
    readonly platform    = 'twitter' as const
    readonly maxChars    = MAX_TWEET_CHARS
    readonly supportsMedia   = false  // şimdilik
    readonly supportsThreads = true

    getOAuthUrl(state: string): string {
        const params = new URLSearchParams({
            response_type:         'code',
            client_id:             process.env.TWITTER_CLIENT_ID!,
            redirect_uri:          `${process.env.NEXT_PUBLIC_APP_URL}/api/social-media/auth/twitter/callback`,
            scope:                 'tweet.read tweet.write users.read offline.access',
            state,
            code_challenge:        state,  // simplified PKCE: state = verifier (production'da crypto.subtle kullan)
            code_challenge_method: 'plain',
        })
        return `${TWITTER_AUTH_URL}?${params}`
    }

    async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<PlatformCredentials> {
        const body = new URLSearchParams({
            grant_type:    'authorization_code',
            code,
            redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/social-media/auth/twitter/callback`,
            code_verifier: codeVerifier ?? code,
            client_id:     process.env.TWITTER_CLIENT_ID!,
        })

        const res = await fetch(TWITTER_TOKEN_URL, {
            method:  'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(
                    `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
                ).toString('base64')}`,
            },
            body,
        })

        if (!res.ok) {
            const err = await res.text()
            throw new Error(`Twitter token exchange failed: ${err}`)
        }

        const data = await res.json()
        return {
            access_token:  data.access_token,
            refresh_token: data.refresh_token,
            expires_at:    data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
            scope:         data.scope,
        }
    }

    async getUserInfo(creds: PlatformCredentials): Promise<{ id: string; username: string }> {
        const res = await fetch(`${TWITTER_API_BASE}/users/me`, {
            headers: { Authorization: `Bearer ${creds.access_token}` },
        })
        if (!res.ok) throw new Error('Twitter getUserInfo failed')
        const data = await res.json()
        return { id: data.data.id, username: data.data.username }
    }

    async validateCredentials(creds: PlatformCredentials): Promise<boolean> {
        try {
            await this.getUserInfo(creds)
            return true
        } catch {
            return false
        }
    }

    async refreshToken(creds: PlatformCredentials): Promise<PlatformCredentials> {
        if (!creds.refresh_token) throw new Error('No refresh token available')

        const body = new URLSearchParams({
            grant_type:    'refresh_token',
            refresh_token: creds.refresh_token,
            client_id:     process.env.TWITTER_CLIENT_ID!,
        })

        const res = await fetch(TWITTER_TOKEN_URL, {
            method:  'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(
                    `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
                ).toString('base64')}`,
            },
            body,
        })

        if (!res.ok) throw new Error('Twitter token refresh failed')

        const data = await res.json()
        return {
            ...creds,
            access_token:  data.access_token,
            refresh_token: data.refresh_token ?? creds.refresh_token,
            expires_at:    data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
        }
    }

    async publishPost(post: SocialMediaPost, creds: PlatformCredentials): Promise<PublishResult> {
        const activeCreds = await this.ensureFreshToken(creds)
        const meta = post.metadata as TwitterPostMetadata | undefined

        try {
            if (meta?.is_thread && meta.thread_parts && meta.thread_parts.length > 1) {
                return await this.publishThread(meta.thread_parts, activeCreds)
            }
            return await this.publishSingleTweet(post.content, activeCreds)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err)
            if (message.includes('429')) {
                const reset = this.parseRateLimitReset(message)
                return { success: false, error: 'Rate limit', rate_limit_reset: reset }
            }
            return { success: false, error: message }
        }
    }

    async deletePost(postId: string, creds: PlatformCredentials): Promise<void> {
        const activeCreds = await this.ensureFreshToken(creds)
        await fetch(`${TWITTER_API_BASE}/tweets/${postId}`, {
            method:  'DELETE',
            headers: { Authorization: `Bearer ${activeCreds.access_token}` },
        })
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    private async publishSingleTweet(text: string, creds: PlatformCredentials): Promise<PublishResult> {
        const res = await fetch(`${TWITTER_API_BASE}/tweets`, {
            method:  'POST',
            headers: {
                Authorization:  `Bearer ${creds.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        })

        const data = await res.json()

        if (!res.ok) {
            if (res.status === 429) throw new Error(`429 rate limit: ${JSON.stringify(data)}`)
            throw new Error(data?.detail ?? JSON.stringify(data))
        }

        const tweetId = data.data?.id
        return {
            success:          true,
            platform_post_id: tweetId,
            platform_url:     tweetId ? `https://x.com/i/web/status/${tweetId}` : undefined,
        }
    }

    private async publishThread(parts: string[], creds: PlatformCredentials): Promise<PublishResult> {
        let replyToId: string | undefined
        let firstUrl:  string | undefined

        for (const part of parts) {
            const body: Record<string, unknown> = { text: part }
            if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId }

            const res = await fetch(`${TWITTER_API_BASE}/tweets`, {
                method:  'POST',
                headers: {
                    Authorization:  `Bearer ${creds.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data?.detail ?? JSON.stringify(data))

            replyToId = data.data?.id
            if (!firstUrl && replyToId) {
                firstUrl = `https://x.com/i/web/status/${replyToId}`
            }

            // Twitter rate limit koruması: thread parçaları arasında kısa bekleme
            await new Promise(r => setTimeout(r, 500))
        }

        return { success: true, platform_post_id: replyToId, platform_url: firstUrl }
    }

    private async ensureFreshToken(creds: PlatformCredentials): Promise<PlatformCredentials> {
        if (!creds.expires_at || Date.now() < creds.expires_at - 60_000) return creds

        const fresh = await this.refreshToken(creds)

        // DB'yi güncelle
        const supabase = createAdminClient()
        await supabase
            .from('social_media_accounts')
            .update({ credentials: fresh as any, updated_at: new Date().toISOString() })
            .eq('platform', 'twitter')

        return fresh
    }

    private parseRateLimitReset(message: string): number {
        const match = message.match(/x-rate-limit-reset[": ]+(\d+)/)
        return match ? parseInt(match[1]) * 1000 : Date.now() + 15 * 60 * 1000
    }
}

// 280 karakteri aşan içeriği thread parçalarına böler
export function splitToThreadParts(content: string, maxChars = THREAD_CHAR_LIMIT): string[] {
    if (content.length <= maxChars) return [content]

    const sentences = content.match(/[^.!?]+[.!?]+\s*/g) ?? [content]
    const parts: string[] = []
    let current = ''

    for (const sentence of sentences) {
        if ((current + sentence).length > maxChars) {
            if (current.trim()) {
                parts.push(current.trim())
                current = sentence
            } else {
                // tek cümle limitten uzun: kelime bazında böl
                const words = sentence.split(' ')
                for (const word of words) {
                    if ((current + ' ' + word).length > maxChars) {
                        if (current.trim()) parts.push(current.trim())
                        current = word
                    } else {
                        current = current ? `${current} ${word}` : word
                    }
                }
            }
        } else {
            current += sentence
        }
    }

    if (current.trim()) parts.push(current.trim())

    // Her parçaya sıralama ekle
    return parts.map((p, i) => `${p} (${i + 1}/${parts.length})`)
}
