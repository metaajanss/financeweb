-- GSC Agent: auto-mode settings per connection
ALTER TABLE gsc_connections
    ADD COLUMN IF NOT EXISTS auto_mode       BOOLEAN NOT NULL DEFAULT false,
    -- When true: after each sync, top recommendations are auto-generated
    ADD COLUMN IF NOT EXISTS auto_publish    BOOLEAN NOT NULL DEFAULT false,
    -- When true: generated posts go live immediately (no draft)
    ADD COLUMN IF NOT EXISTS auto_min_score  INT     NOT NULL DEFAULT 60,
    -- Only process recommendations with priority_score >= this value
    ADD COLUMN IF NOT EXISTS auto_max_per_run INT    NOT NULL DEFAULT 3;
    -- Max posts to generate per sync run
