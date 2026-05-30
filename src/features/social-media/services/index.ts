import type { SocialPlatform, PlatformAdapter } from '@/shared/types/social-media.types'
import { TwitterAdapter } from './twitter'
import { RedditAdapter } from './reddit'

// ─── Platform registry ────────────────────────────────────────────────────────
// Yeni platform eklemek için sadece buraya bir satır ekle:
// adapters.set('linkedin', new LinkedInAdapter())

const adapters = new Map<SocialPlatform, PlatformAdapter>([
    ['twitter', new TwitterAdapter()],
    ['reddit',  new RedditAdapter()],
])

export function getAdapter(platform: SocialPlatform): PlatformAdapter {
    const adapter = adapters.get(platform)
    if (!adapter) throw new Error(`Platform adapter bulunamadı: ${platform}`)
    return adapter
}

export function getSupportedPlatforms(): SocialPlatform[] {
    return Array.from(adapters.keys())
}

// Re-export scheduler fonksiyonları — cron bunları kullanır
export { processScheduledPosts, processSocialMediaCampaigns, publishPostById } from './scheduler'
export { syncAIConfigToContentLibrary } from './context-sync'
export { generateMarketingPost, selectNextContentType } from './content-generator'
