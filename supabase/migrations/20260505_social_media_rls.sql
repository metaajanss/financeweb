-- ============================================================
-- Social Media Agent — RLS Policies
-- Bu tablolar sadece super-admin (service_role) tarafından kullanılır.
-- Normal kullanıcılar hiçbir şekilde erişemez.
-- ============================================================

-- ─── social_media_accounts ────────────────────────────────────
ALTER TABLE social_media_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_accounts_service_role" ON social_media_accounts;

CREATE POLICY "social_accounts_service_role"
ON social_media_accounts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ─── social_media_channel_settings ────────────────────────────
ALTER TABLE social_media_channel_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_channel_settings_service_role" ON social_media_channel_settings;

CREATE POLICY "social_channel_settings_service_role"
ON social_media_channel_settings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ─── social_media_campaigns ──────────────────────────────────
ALTER TABLE social_media_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_campaigns_service_role" ON social_media_campaigns;

CREATE POLICY "social_campaigns_service_role"
ON social_media_campaigns FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ─── social_media_content_library ─────────────────────────────
ALTER TABLE social_media_content_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_content_library_service_role" ON social_media_content_library;

CREATE POLICY "social_content_library_service_role"
ON social_media_content_library FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ─── social_media_posts ──────────────────────────────────────
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_posts_service_role" ON social_media_posts;

CREATE POLICY "social_posts_service_role"
ON social_media_posts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ─── social_media_run_history ─────────────────────────────────
ALTER TABLE social_media_run_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_run_history_service_role" ON social_media_run_history;

CREATE POLICY "social_run_history_service_role"
ON social_media_run_history FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ─── social_media_oauth_states ────────────────────────────────
ALTER TABLE social_media_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_oauth_states_service_role" ON social_media_oauth_states;

CREATE POLICY "social_oauth_states_service_role"
ON social_media_oauth_states FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
