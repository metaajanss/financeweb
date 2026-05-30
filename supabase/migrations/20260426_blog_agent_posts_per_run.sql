-- Blog Agent: how many posts to generate per scheduled run
ALTER TABLE blog_generation_topics
    ADD COLUMN IF NOT EXISTS posts_per_run INT NOT NULL DEFAULT 1;
-- max enforced in application layer (capped at 10)
