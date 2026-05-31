import type {
    PlatformAdapter,
    PlatformCredentials,
    PublishResult,
    SocialMediaPost,
    RedditPostMetadata,
} from '@/shared/types/social-media.types'
import { createAdminClient } from '@/core/db/admin'

const REDDIT_AUTH_URL  = 'https://www.reddit.com/api/v1/authorize'
const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token'
const REDDIT_API_BASE  = 'https://oauth.reddit.com'

export class RedditAdapter implements PlatformAdapter {
    readonly platform        = 'reddit' as const
    readonly maxChars        = null
    readonly supportsMedia   = false
    readonly supportsThreads = false

    getOAuthUrl(state: string): string {
        const params = new URLSearchParams({
            client_id:     process.env.REDDIT_CLIENT_ID!,
            response_type: 'code',
            state,
            redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/social-media/auth/reddit/callback`,
            duration:      'permanent',
            scope:         'submit identity read',
        })
        return `${REDDIT_AUTH_URL}?${params}`
    }

    async exchangeCodeForToken(code: string): Promise<PlatformCredentials> {
        const body = new URLSearchParams({
            grant_type:   'authorization_code',
            code,
            redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social-media/auth/reddit/callback`,
        })

        const res = await fetch(REDDIT_TOKEN_URL, {
            method:  'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(
                    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
                ).toString('base64')}`,
                'User-Agent': 'Payoff Lab/1.0',
            },
            body,
        })

        if (!res.ok) {
            const err = await res.text()
            throw new Error(`Reddit token exchange failed: ${err}`)
        }

        const data = await res.json()
        return {
            access_token:  data.access_token,
            refresh_token: data.refresh_token,
            expires_at:    data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
            token_type:    data.token_type,
            scope:         data.scope,
        }
    }

    async getUserInfo(creds: PlatformCredentials): Promise<{ id: string; username: string }> {
        const res = await fetch(`${REDDIT_API_BASE}/api/v1/me`, {
            headers: {
                Authorization: `Bearer ${creds.access_token}`,
                'User-Agent':  'Payoff Lab/1.0',
            },
        })
        if (!res.ok) throw new Error('Reddit getUserInfo failed')
        const data = await res.json()
        return { id: data.id, username: data.name }
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
        })

        const res = await fetch(REDDIT_TOKEN_URL, {
            method:  'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(
                    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
                ).toString('base64')}`,
                'User-Agent': 'Payoff Lab/1.0',
            },
            body,
        })

        if (!res.ok) throw new Error('Reddit token refresh failed')

        const data = await res.json()
        return {
            ...creds,
            access_token: data.access_token,
            expires_at:   data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
        }
    }

    async publishPost(post: SocialMediaPost, creds: PlatformCredentials): Promise<PublishResult> {
        const activeCreds = await this.ensureFreshToken(creds)
        const meta = post.metadata as RedditPostMetadata

        if (!meta?.subreddit) {
            return { success: false, error: 'Subreddit belirtilmedi' }
        }

        try {
            const params = new URLSearchParams({
                sr:        meta.subreddit,
                kind:      meta.post_type === 'link' ? 'link' : 'self',
                title:     post.title ?? post.content.slice(0, 100),
                resubmit:  'true',
                nsfw:      String(meta.nsfw ?? false),
                api_type:  'json',
            })

            if (meta.post_type === 'link' && meta.link_url) {
                params.set('url', meta.link_url)
            } else {
                params.set('text', post.content)
            }

            if (meta.flair_id) params.set('flair_id', meta.flair_id)

            const res = await fetch(`${REDDIT_API_BASE}/api/submit`, {
                method:  'POST',
                headers: {
                    Authorization:  `Bearer ${activeCreds.access_token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent':   'Payoff Lab/1.0',
                },
                body: params,
            })

            const data = await res.json()

            if (!res.ok || data.json?.errors?.length) {
                const errorMsg = data.json?.errors?.[0]?.[1] ?? JSON.stringify(data)
                if (res.status === 429) {
                    return { success: false, error: 'Rate limit', rate_limit_reset: Date.now() + 10 * 60 * 1000 }
                }
                return { success: false, error: errorMsg }
            }

            const postUrl = data.json?.data?.url
            const postId  = data.json?.data?.id

            return {
                success:          true,
                platform_post_id: postId,
                platform_url:     postUrl,
            }
        } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : String(err) }
        }
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    private async ensureFreshToken(creds: PlatformCredentials): Promise<PlatformCredentials> {
        if (!creds.expires_at || Date.now() < creds.expires_at - 60_000) return creds

        const fresh = await this.refreshToken(creds)

        const supabase = createAdminClient()
        await supabase
            .from('social_media_accounts')
            .update({ credentials: fresh as any, updated_at: new Date().toISOString() })
            .eq('platform', 'reddit')

        return fresh
    }
}

// Reddit için değer-önce içerik yeniden yazımı
// Promosyon içeriğini Reddit kültürüne uygun formata dönüştürür
export function adaptContentForReddit(content: string, title: string): { title: string; content: string } {
    // Başlık çok açıkça promosyon ise yeniden çerçevele
    const promoPatterns = [/^check out/i, /^introducing/i, /^buy/i, /^get \d+% off/i]
    let adaptedTitle = title

    for (const pattern of promoPatterns) {
        if (pattern.test(title)) {
            adaptedTitle = `How we built ${title.replace(pattern, '').trim()}`
            break
        }
    }

    return { title: adaptedTitle, content }
}
