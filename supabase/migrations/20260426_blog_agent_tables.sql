-- Blog Agent: keyword-driven AI content generation tables

CREATE TABLE IF NOT EXISTS blog_generation_topics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keywords    TEXT[]          NOT NULL DEFAULT '{}',
    tone        TEXT            NOT NULL DEFAULT 'informative',  -- informative | persuasive | casual
    length_words INT            NOT NULL DEFAULT 1200,
    target_locale TEXT          NOT NULL DEFAULT 'en',
    auto_publish BOOLEAN        NOT NULL DEFAULT false,
    schedule_type TEXT          NOT NULL DEFAULT 'manual',       -- manual | daily | weekly
    status      TEXT            NOT NULL DEFAULT 'active',       -- active | paused
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_generation_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id        UUID NOT NULL REFERENCES blog_generation_topics(id) ON DELETE CASCADE,
    post_id         UUID REFERENCES posts(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'pending',             -- pending | processing | completed | failed
    generated_title TEXT,
    error_message   TEXT,
    triggered_by    TEXT NOT NULL DEFAULT 'cron',               -- cron | manual
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- Track last-run time per topic so cron can respect schedule_type
ALTER TABLE blog_generation_topics
    ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;

-- Index for queue processing (status + created_at lookup)
CREATE INDEX IF NOT EXISTS idx_blog_gen_queue_status
    ON blog_generation_queue (status, created_at);

-- Index for topic list ordering
CREATE INDEX IF NOT EXISTS idx_blog_gen_topics_created
    ON blog_generation_topics (created_at DESC);

-- RLS: super-admin only (service role bypasses RLS, so client-side calls need policies)
ALTER TABLE blog_generation_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_generation_queue  ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with admin role to read/write
CREATE POLICY "admin_all_generation_topics" ON blog_generation_topics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "admin_all_generation_queue" ON blog_generation_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
