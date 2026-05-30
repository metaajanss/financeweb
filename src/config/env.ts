import { z } from 'zod'

const serverEnvSchema = z.object({
  // Supabase — zorunlu
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL geçerli bir URL olmalı'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY eksik'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY eksik'),

  // Webhook secrets — isteğe bağlı (sadece ilgili provider aktifse gerekli)
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  PADDLE_API_KEY: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  SVIX_WEBHOOK_SECRET: z.string().optional(),
  CRM_WEBHOOK_SECRET: z.string().optional(),
  RECALL_WEBHOOK_SECRET: z.string().optional(),
  SHEETS_WEBHOOK_SECRET: z.string().optional(),

  // AI
  GEMINI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  ANAM_API_KEY: z.string().optional(),
  ANAM_PERSONA_ID: z.string().optional(),

  // Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().optional(),
  GOOGLE_SHEETS_REDIRECT_URI: z.string().optional(),
  GOOGLE_GSC_REDIRECT_URI: z.string().optional(),

  // Social
  META_APP_ID: z.string().optional(),
  META_WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  INSTAGRAM_VERIFY_TOKEN: z.string().optional(),
  TWITTER_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_SECRET: z.string().optional(),
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),

  // Recall.ai
  RECALL_API_KEY: z.string().optional(),
  RECALL_BASE_URL: z.string().optional(),
  RECALL_WEBHOOK_USE_HMAC: z.string().optional(),

  // Anam
  ANAM_BASE_URL: z.string().url().optional(),

  // Avatar feature flags / tuning
  AVATAR_FEATURE_ENABLED: z.string().optional(),
  PRESENTATION_BUS_MAX_LISTENERS: z.string().optional(),

  // Redis
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Auth
  AVATAR_TOKEN_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  ALLOWED_ADMIN_IPS: z.string().optional(),

  // Cloudflare Turnstile
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  AVATAR_RENDERER_BASE_URL: z.string().optional(),

  // Paddle public
  NEXT_PUBLIC_PADDLE_ENVIRONMENT: z.enum(['sandbox', 'production']).optional(),
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: z.string().optional(),
  NEXT_PUBLIC_PADDLE_PRICE_STARTER: z.string().optional(),
  NEXT_PUBLIC_PADDLE_PRICE_GROWTH: z.string().optional(),
  NEXT_PUBLIC_PADDLE_PRICE_PRO: z.string().optional(),
  NEXT_PUBLIC_PADDLE_PRICE_BUSINESS: z.string().optional(),

  // Feature flags
  FORCE_WEEKLY_REPORT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
})

// Yalnızca sunucu tarafında çalıştır — istemci bundle'ına dahil edilmemeli
// Build sırasında (Docker/Vercel) server-only secret'lar mevcut olmayabilir.
// next build "Collecting page data" aşamasında API route'larını değerlendirir,
// bu yüzden build ortamında da fallback sağlıyoruz.
const isTest = process.env.NODE_ENV === 'test'
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
  || (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV === 'production')
const shouldUseFallback = isTest || isBuild

const envToParse = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || (shouldUseFallback ? 'https://placeholder.supabase.co' : undefined),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (shouldUseFallback ? 'placeholder-anon-key' : undefined),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || (shouldUseFallback ? 'placeholder-service-role-key' : undefined),
}

const _parsed = serverEnvSchema.safeParse(envToParse)

if (!_parsed.success) {
  const formatted = _parsed.error.issues
    .map(e => `  • ${e.path.join('.')}: ${e.message}`)
    .join('\n')
  throw new Error(`Eksik veya hatalı ortam değişkenleri:\n${formatted}`)
}

export const env = _parsed.data

