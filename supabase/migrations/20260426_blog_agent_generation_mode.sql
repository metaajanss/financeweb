-- Blog Agent: generation_mode and keyword rotation tracking

ALTER TABLE blog_generation_topics
    ADD COLUMN IF NOT EXISTS generation_mode TEXT NOT NULL DEFAULT 'combined',
    -- 'combined'    → all keywords merged into one post per run
    -- 'per_keyword' → one keyword per run, cycling in order
    ADD COLUMN IF NOT EXISTS last_keyword_index INT NOT NULL DEFAULT 0;
    -- tracks which keyword index was last used for per_keyword mode
