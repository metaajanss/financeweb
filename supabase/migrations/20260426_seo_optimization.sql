-- SEO Optimization System: GSC connections, raw data, recommendations

-- GSC OAuth connections (per super-admin, not per tenant)
CREATE TABLE IF NOT EXISTS gsc_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_url        TEXT NOT NULL,
    email           TEXT,
    access_token    TEXT,
    refresh_token   TEXT,
    expiry_date     BIGINT,
    status          TEXT NOT NULL DEFAULT 'connected', -- connected | disconnected | error
    last_synced_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Raw GSC search analytics data (rolling 90 days)
CREATE TABLE IF NOT EXISTS gsc_raw_data (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES gsc_connections(id) ON DELETE CASCADE,
    query       TEXT NOT NULL,
    page        TEXT,
    clicks      INT NOT NULL DEFAULT 0,
    impressions INT NOT NULL DEFAULT 0,
    ctr         FLOAT NOT NULL DEFAULT 0,
    position    FLOAT NOT NULL DEFAULT 0,
    date_range  TEXT NOT NULL DEFAULT '90d',
    synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gsc_raw_query     ON gsc_raw_data (query);
CREATE INDEX IF NOT EXISTS idx_gsc_raw_synced    ON gsc_raw_data (synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_raw_position  ON gsc_raw_data (position);

-- SEO recommendations derived from GSC analysis
CREATE TABLE IF NOT EXISTS gsc_recommendations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id    UUID NOT NULL REFERENCES gsc_connections(id) ON DELETE CASCADE,
    query            TEXT NOT NULL,
    category         TEXT NOT NULL,
    -- 'quick_win' | 'ctr_crisis' | 'content_gap' | 'decay' | 'cannibalization' | 'featured_snippet'
    intent           TEXT NOT NULL DEFAULT 'informational',
    -- 'informational' | 'commercial' | 'transactional' | 'navigational'
    priority_score   FLOAT NOT NULL DEFAULT 0,
    recommended_action TEXT NOT NULL,
    -- 'create' | 'update' | 'optimize_title' | 'merge' | 'add_snippet_format'
    matched_post_id  UUID REFERENCES posts(id) ON DELETE SET NULL,
    topic_id         UUID,  -- filled when accepted → blog_generation_topics
    status           TEXT NOT NULL DEFAULT 'pending',
    -- 'pending' | 'accepted' | 'dismissed' | 'in_progress' | 'completed'
    -- Raw metrics
    impressions      INT NOT NULL DEFAULT 0,
    clicks           INT NOT NULL DEFAULT 0,
    ctr              FLOAT NOT NULL DEFAULT 0,
    position         FLOAT NOT NULL DEFAULT 0,
    -- Trend vs previous period (positive = improvement)
    impressions_trend FLOAT DEFAULT 0,
    clicks_trend      FLOAT DEFAULT 0,
    position_trend    FLOAT DEFAULT 0,
    synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gsc_rec_status    ON gsc_recommendations (status, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_rec_category  ON gsc_recommendations (category);

-- Posts table additions for SEO lifecycle tracking
ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS content_type        TEXT DEFAULT 'standalone',
    -- 'pillar' | 'cluster' | 'standalone'
    ADD COLUMN IF NOT EXISTS pillar_post_id      UUID REFERENCES posts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cluster_topic       TEXT,
    ADD COLUMN IF NOT EXISTS needs_update        BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS freshness_score     INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_seo_audit_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rank_at_30d         FLOAT,
    ADD COLUMN IF NOT EXISTS rank_at_60d         FLOAT,
    ADD COLUMN IF NOT EXISTS rank_at_90d         FLOAT;

-- RLS
ALTER TABLE gsc_connections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_raw_data       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gsc_connections" ON gsc_connections
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "admin_gsc_raw_data" ON gsc_raw_data
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

CREATE POLICY "admin_gsc_recommendations" ON gsc_recommendations
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));
