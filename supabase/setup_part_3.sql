

-- FILE: 20240324_fix_infinite_recursion.sql

-- Fix Infinite Recursion introduced in the previous support tickets migration

-- 1. Create a SECURITY DEFINER function to get the current user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Drop the recursive policy on profiles
DROP POLICY IF EXISTS "Platform Admins can view all profiles" ON public.profiles;

-- 3. Recreate the policy using the non-recursive helper function
CREATE POLICY "Platform Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
    (id = auth.uid()) 
    OR (public.get_my_role() = 'admin') 
    OR (auth.jwt() ->> 'email' = 'admin@admin.com')
);

-- 4. Update the tickets policy to use the non-recursive helper
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
CREATE POLICY "Users can view their own tickets"
ON public.tickets FOR SELECT
USING (
    auth.uid() = user_id 
    OR (public.get_my_role() = 'admin')
    OR (auth.jwt() ->> 'email' = 'admin@admin.com')
);

-- 5. Update the ticket_messages select policy to use the non-recursive helper
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.ticket_messages;
CREATE POLICY "Users can view messages for their tickets"
ON public.ticket_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_messages.ticket_id
        AND (
            tickets.user_id = auth.uid() 
            OR (public.get_my_role() = 'admin')
            OR (auth.jwt() ->> 'email' = 'admin@admin.com')
        )
    )
);

-- 6. Update the ticket_messages insert policy to use the non-recursive helper
DROP POLICY IF EXISTS "Users can insert messages to their own tickets" ON public.ticket_messages;
CREATE POLICY "Users can insert messages to their own tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_id
        AND (
            tickets.user_id = auth.uid() 
            OR (public.get_my_role() = 'admin')
            OR (auth.jwt() ->> 'email' = 'admin@admin.com')
        )
    )
);


-- FILE: 20240325_add_is_read_to_support.sql

-- Add is_read column to ticket_messages to track read status of admin replies
ALTER TABLE public.ticket_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Update existing messages: assume everything in the past is read to avoid mass notifications
UPDATE public.ticket_messages SET is_read = TRUE WHERE is_admin_reply = TRUE AND is_read = FALSE;

-- RLS should already cover this table, but ensure users can update their own messages' read status
-- Actually, the user needs to update messages where is_admin_reply = TRUE for their OWN tickets.
CREATE POLICY "Users can mark admin replies as read"
ON public.ticket_messages
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_messages.ticket_id
        AND tickets.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_messages.ticket_id
        AND tickets.user_id = auth.uid()
    )
);


-- FILE: 20240406_cascading_deletes.sql

-- Faz 4: Data Retention ve Cascading Deletes (Veri Tutma ve Kademeli Silme PolitikalarÄ±)
-- Bu migrasyon, bir ana kayÄ±t (Account veya Lead) silindiÄŸinde iliÅŸkili tÃ¼m alt verilerin 
-- otomatik ve temiz bir ÅŸekilde silinmesini saÄŸlar.

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 1. ACCOUNTS silindiÄŸinde silinecekler
    -- Profiles
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_account_id_fkey') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_account_id_fkey;
    END IF;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Leads
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'leads_account_id_fkey') THEN
        ALTER TABLE public.leads DROP CONSTRAINT leads_account_id_fkey;
    END IF;
    ALTER TABLE public.leads ADD CONSTRAINT leads_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Integrations
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'integrations_account_id_fkey') THEN
        ALTER TABLE public.integrations DROP CONSTRAINT integrations_account_id_fkey;
    END IF;
    ALTER TABLE public.integrations ADD CONSTRAINT integrations_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Sequences
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sequences_account_id_fkey') THEN
        ALTER TABLE public.sequences DROP CONSTRAINT sequences_account_id_fkey;
    END IF;
    ALTER TABLE public.sequences ADD CONSTRAINT sequences_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Sequences Enrollments (Account ID part)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sequence_enrollments_account_id_fkey') THEN
        ALTER TABLE public.sequence_enrollments DROP CONSTRAINT sequence_enrollments_account_id_fkey;
    END IF;
    ALTER TABLE public.sequence_enrollments ADD CONSTRAINT sequence_enrollments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Webhooks
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'webhooks_account_id_fkey') THEN
        ALTER TABLE public.webhooks DROP CONSTRAINT webhooks_account_id_fkey;
    END IF;
    ALTER TABLE public.webhooks ADD CONSTRAINT webhooks_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

    -- Event Logs
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'event_logs_account_id_fkey') THEN
        ALTER TABLE public.event_logs DROP CONSTRAINT event_logs_account_id_fkey;
    END IF;
    ALTER TABLE public.event_logs ADD CONSTRAINT event_logs_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


    -- 2. LEADS silindiÄŸinde silinecekler
    -- Conversations
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'conversations_lead_id_fkey') THEN
        ALTER TABLE public.conversations DROP CONSTRAINT conversations_lead_id_fkey;
    END IF;
    ALTER TABLE public.conversations ADD CONSTRAINT conversations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

    -- Meetings
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'meetings_lead_id_fkey') THEN
        ALTER TABLE public.meetings DROP CONSTRAINT meetings_lead_id_fkey;
    END IF;
    ALTER TABLE public.meetings ADD CONSTRAINT meetings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

    -- Sequence Enrollments (Lead ID part)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sequence_enrollments_lead_id_fkey') THEN
        ALTER TABLE public.sequence_enrollments DROP CONSTRAINT sequence_enrollments_lead_id_fkey;
    END IF;
    ALTER TABLE public.sequence_enrollments ADD CONSTRAINT sequence_enrollments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


    -- 3. CONVERSATIONS silindiÄŸinde silinecekler
    -- Messages
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_conversation_id_fkey') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_conversation_id_fkey;
    END IF;
    ALTER TABLE public.messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

    -- 4. WEBHOOKS silindiÄŸinde silinecekler
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'webhook_logs_webhook_id_fkey') THEN
        ALTER TABLE public.webhook_logs DROP CONSTRAINT webhook_logs_webhook_id_fkey;
    END IF;
    ALTER TABLE public.webhook_logs ADD CONSTRAINT webhook_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id) ON DELETE CASCADE;

END $$;

-- Rapor: Bu politikalar sayesinde 'supabase.from('leads').delete().eq('id', ...)' komutu Ã§alÄ±ÅŸtÄ±rÄ±ldÄ±ÄŸÄ±nda
-- lead'e ait tÃ¼m konuÅŸmalar, mesajlar ve otomasyon kayÄ±tlarÄ± otomatik olarak temizlenecektir.


-- FILE: 20240406_storage_rls.sql

-- Phase 3: Supabase Storage Security Hardening
-- This migration ensures that storage buckets are protected by RLS and strictly isolated.

-- 1. Ensure buckets exist
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('chatbot', 'chatbot', true)
on conflict (id) do update set public = true;

-- 2. Enable RLS on storage.objects
-- alter table storage.objects enable row level security;

-- 3. PROFILES BUCKET POLICIES

-- Allow public read access to avatars
create policy "Public Access to Avatars"
on storage.objects for select
using ( bucket_id = 'profiles' );

-- Allow users to upload their own avatar
-- Path format: avatars/{user_id}-{random}.ext
create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = split_part((storage.foldername(name))[2], '-', 1)
);

-- Allow users to delete their own avatar
create policy "Users can delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = split_part((storage.foldername(name))[2], '-', 1)
);


-- 4. CHATBOT BUCKET POLICIES (Admin Only)

-- Allow public read access to chatbot assets
create policy "Public Access to Chatbot Assets"
on storage.objects for select
using ( bucket_id = 'chatbot' );

-- Allow admins to upload chatbot assets
-- Path format: {account_id}/logos/{filename}
create policy "Admins can upload chatbot assets"
on storage.objects for insert
with check (
  bucket_id = 'chatbot' AND
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and account_id::text = (storage.foldername(name))[1]
    and (role = 'admin' or role = 'super_admin')
  )
);

-- Allow admins to delete chatbot assets
create policy "Admins can delete chatbot assets"
on storage.objects for delete
using (
  bucket_id = 'chatbot' AND
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and account_id::text = (storage.foldername(name))[1]
    and (role = 'admin' or role = 'super_admin')
  )
);


-- FILE: 20250502000000_add_ai_training_wizard.sql

-- Add AI Training Setup Wizard columns to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS setup_wizard_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS setup_wizard_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS setup_wizard_data JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN accounts.setup_wizard_completed IS 'Whether the AI training setup wizard has been completed';
COMMENT ON COLUMN accounts.setup_wizard_step IS 'Current step (1-6) of the AI training setup wizard';
COMMENT ON COLUMN accounts.setup_wizard_data IS 'Temporary storage for wizard data during setup process';


-- FILE: 20260226_paddle_migration.sql

-- Rename Stripe columns to Paddle columns
ALTER TABLE public.accounts
RENAME COLUMN stripe_customer_id TO paddle_customer_id;

ALTER TABLE public.accounts
RENAME COLUMN stripe_subscription_id TO paddle_subscription_id;


-- FILE: 20260319_performance_indexes.sql

-- ============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================

-- 1. Profiles Table
CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON public.profiles(account_id);

-- 2. Leads Table
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON public.leads(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);

-- 3. Conversations Table
CREATE INDEX IF NOT EXISTS idx_conversations_account_id ON public.conversations(account_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- 4. Messages Table
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON public.messages(sender_type);

-- 5. Meetings Table
CREATE INDEX IF NOT EXISTS idx_meetings_account_id ON public.meetings(account_id);
CREATE INDEX IF NOT EXISTS idx_meetings_lead_id ON public.meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON public.meetings(start_time DESC);

-- 6. Integrations Table
CREATE INDEX IF NOT EXISTS idx_integrations_account_id ON public.integrations(account_id);


-- FILE: 20260329_additional_performance_indexes.sql

-- ============================================
-- ADDITIONAL PERFORMANCE INDEXES
-- Tarih: 2026-03-29
-- ============================================

-- 1. Leads Table - Composite indexes for common query patterns
-- getLeads() sorgusunda account_id + ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_leads_account_created
    ON public.leads(account_id, created_at DESC);

-- Grup bazlÄ± filtreleme (LeadsClient filteredLeads)
CREATE INDEX IF NOT EXISTS idx_leads_group_id
    ON public.leads(group_id);

-- Status bazlÄ± filtreleme
CREATE INDEX IF NOT EXISTS idx_leads_account_status
    ON public.leads(account_id, status);

-- Source bazlÄ± filtreleme
CREATE INDEX IF NOT EXISTS idx_leads_account_source
    ON public.leads(account_id, source);

-- 2. Lead Groups Table
-- getLeadGroups() sorgusunda account_id + folder_id
CREATE INDEX IF NOT EXISTS idx_lead_groups_account_folder
    ON public.lead_groups(account_id, folder_id);

-- 3. Lead Folders Table
CREATE INDEX IF NOT EXISTS idx_lead_folders_account
    ON public.lead_folders(account_id, created_at DESC);

-- 4. Meetings Table - Cron job sorgusu (yaklaÅŸan toplantÄ±lar)
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_status
    ON public.meetings(scheduled_at, status)
    WHERE status = 'scheduled';

-- 5. Conversations Table - Cron job sorgusu (eski konuÅŸmalar)
CREATE INDEX IF NOT EXISTS idx_conversations_status_last_msg
    ON public.conversations(status, last_message_at DESC)
    WHERE status = 'open';

-- 6. Sequence Enrollments - Lead enrollment sorgularÄ±nda
CREATE INDEX IF NOT EXISTS idx_seq_enrollments_lead_account
    ON public.sequence_enrollments(lead_id, account_id);

CREATE INDEX IF NOT EXISTS idx_seq_enrollments_status
    ON public.sequence_enrollments(status)
    WHERE status = 'active';



-- FILE: 20260329_chatbot_widgets.sql

-- Web AI Chatbot Widget table
-- One widget per account but can be embedded on unlimited websites via the same script ID

CREATE TABLE IF NOT EXISTS chatbot_widgets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name        VARCHAR NOT NULL DEFAULT 'Web Chatbot',
    is_active   BOOLEAN DEFAULT true,
    config      JSONB NOT NULL DEFAULT '{
        "color": "#7c3aed",
        "position": "bottom-right",
        "greeting": "Hi! I''m your AI assistant. How can I help you today?",
        "collect_email": true,
        "collect_phone": false,
        "bot_name": "AI Assistant",
        "bot_avatar": null,
        "placeholder": "Type your message...",
        "form_title": "Start a conversation"
    }',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id)
);

-- Enable RLS
ALTER TABLE chatbot_widgets ENABLE ROW LEVEL SECURITY;

-- Accounts can only access their own widget
CREATE POLICY "accounts_own_chatbot_widget" ON chatbot_widgets
    FOR ALL USING (account_id = (
        SELECT account_id FROM profiles WHERE id = auth.uid()
    ));

-- Public read (for the embeddable script CORS requests)
CREATE POLICY "public_read_active_chatbot_widget" ON chatbot_widgets
    FOR SELECT USING (is_active = true);

-- Index
CREATE INDEX IF NOT EXISTS idx_chatbot_widgets_account_id ON chatbot_widgets(account_id);


-- FILE: 20260330_add_metadata_to_conversations.sql

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;


-- FILE: 20260330_add_web_chatbot_channel.sql

-- Update the check constraint on conversations table for channel to include web_chatbot
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_channel_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_channel_check 
CHECK (channel IN ('whatsapp', 'email', 'widget', 'instagram', 'tiktok', 'web_chatbot'));

-- Also update the leads source check if it exists (Optional step if it fails just ignore)
DO $$
BEGIN
    ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;
    ALTER TABLE public.leads ADD CONSTRAINT leads_source_check 
    CHECK (source IN ('whatsapp', 'email', 'widget', 'manual', 'import', 'api', 'web_chatbot'));
EXCEPTION
    WHEN undefined_object THEN null;
END $$;


-- FILE: 20260404_add_sequence_reporting.sql

-- Migration: Add Sequence Reporting Table and Settings Config
-- Date: 2026-04-04

-- 1. Create sequence_events table
CREATE TABLE IF NOT EXISTS sequence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES sequence_enrollments(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'sent' | 'opened' | 'clicked' | 'replied' | 'failed' | 'unsubscribed'
    channel TEXT NOT NULL,    -- 'email' | 'whatsapp'
    step_index INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protect against existing RLS policy if running idempotently
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'sequence_events' AND policyname = 'Tenant isolation for sequence_events'
    ) THEN
        ALTER TABLE sequence_events ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Tenant isolation for sequence_events" ON sequence_events
          USING (account_id IN (SELECT account_id FROM profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- Drop and recreate indexes
DROP INDEX IF EXISTS idx_sequence_events_account_time;
DROP INDEX IF EXISTS idx_sequence_events_sequence;
CREATE INDEX idx_sequence_events_account_time ON sequence_events(account_id, created_at DESC);
CREATE INDEX idx_sequence_events_sequence ON sequence_events(sequence_id);

-- 2. Add sequence_settings to accounts table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'sequence_settings'
    ) THEN
        ALTER TABLE accounts ADD COLUMN sequence_settings JSONB DEFAULT '{
            "dailyEmailLimit": 200,
            "dailyWhatsappLimit": 100,
            "blackoutStartHour": 22,
            "blackoutEndHour": 8,
            "blackoutAction": "delay",
            "defaultTimezone": "Europe/Istanbul",
            "respectUnsubscribes": true
        }'::jsonb;
    END IF;
END $$;


-- FILE: 20260404_blog_translations.sql

-- Blog Ã§evirileri iÃ§in tablo ekleme
CREATE TABLE IF NOT EXISTS public.post_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    language TEXT NOT NULL, -- 'en', 'tr', 'de', vb.
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT,
    excerpt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, language),
    UNIQUE(slug, language)
);

-- RLS (Row Level Security) EtkinleÅŸtirme
ALTER TABLE public.post_translations ENABLE ROW LEVEL SECURITY;

-- Politikalar: Herkes okuyabilir (Blog makaleleri halka aÃ§Ä±ktÄ±r)
CREATE POLICY "Allow public read for post translations"
ON public.post_translations
FOR SELECT
USING (true);

-- Politikalar: Sadece adminler ve yetkili profiller ekleyebilir/dÃ¼zenleyebilir
CREATE POLICY "Allow admin to manage post translations"
ON public.post_translations
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

-- Updated_at tetikleyicisi ekleyelim
CREATE TRIGGER update_post_translations_updated_at
BEFORE UPDATE ON public.post_translations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- FILE: 20260405_add_blog_posts_columns.sql

-- Migration: Add missing columns to posts table for blog system
-- Task: 1.1 Create blog_posts table with all required columns
-- Requirement: 10.1
-- Note: The posts table already exists. This migration adds 6 missing columns.

-- Add missing columns to existing posts table
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT[],
  ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add indexes for query performance (as specified in design document)
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON public.posts(author_id);

-- Add comment to document the table purpose
COMMENT ON TABLE public.posts IS 'Blog posts table with multi-language support. Source content is in English, translations stored in post_translations table.';
COMMENT ON COLUMN public.posts.featured_image_url IS 'URL of the featured/hero image for SEO and blog cards (og:image)';
COMMENT ON COLUMN public.posts.seo_title IS 'Custom meta title for SEO (50-60 characters optimal). Falls back to title if not set.';
COMMENT ON COLUMN public.posts.seo_description IS 'Custom meta description for SEO (150-160 characters optimal). Falls back to excerpt if not set.';
COMMENT ON COLUMN public.posts.seo_keywords IS 'Array of keywords for SEO analysis and optimization';
COMMENT ON COLUMN public.posts.reading_time_minutes IS 'Estimated reading time based on word count (200-250 words/minute)';
COMMENT ON COLUMN public.posts.view_count IS 'Cached count of total page views, aggregated from blog_analytics table';


-- FILE: 20260406_add_seo_columns_to_post_translations.sql

-- Add missing SEO columns to post_translations table
-- Task 1.2: Create blog_post_translations table (modified to add columns to existing table)
-- Requirement 10.2: Blog post translations table with SEO fields

-- Add translated_seo_title column
ALTER TABLE public.post_translations 
ADD COLUMN IF NOT EXISTS translated_seo_title TEXT;

-- Add translated_seo_description column
ALTER TABLE public.post_translations 
ADD COLUMN IF NOT EXISTS translated_seo_description TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.post_translations.translated_seo_title IS 'Translated SEO meta title for search engines (50-60 characters recommended)';
COMMENT ON COLUMN public.post_translations.translated_seo_description IS 'Translated SEO meta description for search engines (150-160 characters recommended)';


-- FILE: 20260407_create_blog_categories.sql

-- Migration: Create blog_categories and blog_category_translations tables
-- Task: 1.3 Create blog_categories and blog_category_translations tables
-- Requirement: 10.3
-- Date: 2026-04-07

-- ============================================================================
-- Table: blog_categories
-- ============================================================================
-- Stores blog post categories with English as the source language
-- Translations are stored in blog_category_translations table

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for slug lookups (used in category filtering)
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON public.blog_categories(slug);

-- Add comments for documentation
COMMENT ON TABLE public.blog_categories IS 'Blog post categories. Source content is in English, translations stored in blog_category_translations table.';
COMMENT ON COLUMN public.blog_categories.slug IS 'URL-safe unique identifier for the category (e.g., "marketing", "sales")';
COMMENT ON COLUMN public.blog_categories.name IS 'Category name in English (source language)';
COMMENT ON COLUMN public.blog_categories.description IS 'Optional category description in English';

-- ============================================================================
-- Table: blog_category_translations
-- ============================================================================
-- Stores translated category names and descriptions for all active locales

CREATE TABLE IF NOT EXISTS public.blog_category_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  translated_name TEXT NOT NULL,
  translated_description TEXT,
  UNIQUE(category_id, locale)
);

-- Add index for efficient translation lookups
CREATE INDEX IF NOT EXISTS idx_blog_category_translations_category_locale 
  ON public.blog_category_translations(category_id, locale);

-- Add comments for documentation
COMMENT ON TABLE public.blog_category_translations IS 'Translated category names and descriptions for all supported locales (tr, de, fr, es, hi, zh, ar, ru, id)';
COMMENT ON COLUMN public.blog_category_translations.locale IS 'Locale code (e.g., "tr", "de", "ar"). Must match locales defined in src/config/locales.ts';
COMMENT ON COLUMN public.blog_category_translations.translated_name IS 'Category name translated into the target locale';
COMMENT ON COLUMN public.blog_category_translations.translated_description IS 'Optional category description translated into the target locale';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_category_translations ENABLE ROW LEVEL SECURITY;

-- Public read access (categories are public information)
CREATE POLICY "Allow public read for blog categories"
ON public.blog_categories
FOR SELECT
USING (true);

CREATE POLICY "Allow public read for blog category translations"
ON public.blog_category_translations
FOR SELECT
USING (true);

-- Admin write access (only super admins can manage categories)
CREATE POLICY "Allow admin to manage blog categories"
ON public.blog_categories
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

CREATE POLICY "Allow admin to manage blog category translations"
ON public.blog_category_translations
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================

-- Insert sample categories
INSERT INTO public.blog_categories (slug, name, description) VALUES
  ('marketing', 'Marketing', 'Marketing strategies and best practices'),
  ('sales', 'Sales', 'Sales techniques and lead generation'),
  ('automation', 'Automation', 'Business process automation and AI'),
  ('product-updates', 'Product Updates', 'Latest features and improvements')
ON CONFLICT (slug) DO NOTHING;

-- Note: Translations will be added by the Gemini translation service
-- when categories are synced from Google Sheets or created via the admin UI


-- FILE: 20260408_create_blog_tags.sql

-- Migration: Create blog_tags and blog_tag_translations tables
-- Date: 2026-04-08
-- Description: Creates tables for blog tags with multi-language support

-- Create blog_tags table
CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);

-- Add comment to table
COMMENT ON TABLE blog_tags IS 'Stores blog tags (English names as source)';
COMMENT ON COLUMN blog_tags.slug IS 'URL-friendly unique identifier for the tag';
COMMENT ON COLUMN blog_tags.name IS 'English name of the tag';

-- Create blog_tag_translations table
CREATE TABLE IF NOT EXISTS blog_tag_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  translated_name TEXT NOT NULL,
  CONSTRAINT unique_tag_locale UNIQUE(tag_id, locale)
);

-- Create index on (tag_id, locale) for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_tag_translations_tag_locale ON blog_tag_translations(tag_id, locale);

-- Add comments to table
COMMENT ON TABLE blog_tag_translations IS 'Stores translated tag names for all supported locales';
COMMENT ON COLUMN blog_tag_translations.tag_id IS 'Foreign key to blog_tags table';
COMMENT ON COLUMN blog_tag_translations.locale IS 'Locale code (e.g., tr, de, fr, es, hi, zh, ar, ru, id)';
COMMENT ON COLUMN blog_tag_translations.translated_name IS 'Translated tag name for the locale';


-- FILE: 20260409_blog_system_queue_and_sync.sql

-- Migration: Blog System Queue and Sync Tracking
-- Date: 2026-04-09
-- Description: Adds translation queue, redirect management, and sync metadata.

-- 1. Add metadata column to posts table if missing
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Create blog_translation_queue table
CREATE TABLE IF NOT EXISTS public.blog_translation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    target_locale TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, target_locale)
);

-- 3. Create blog_redirects table (Requirement 4.23)
CREATE TABLE IF NOT EXISTS public.blog_redirects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE, -- Usually global for blog, but keeping account_id for consistency
    old_slug TEXT NOT NULL,
    new_slug TEXT NOT NULL,
    locale TEXT NOT NULL,
    status_code INTEGER DEFAULT 301, -- 301 Permanent, 302 Temporary
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(old_slug, locale)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_translation_queue_status ON public.blog_translation_queue(status);
CREATE INDEX IF NOT EXISTS idx_blog_redirects_old_slug ON public.blog_redirects(old_slug, locale);

-- RLS Enforcement
ALTER TABLE public.blog_translation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_redirects ENABLE ROW LEVEL SECURITY;

-- Policies for Translation Queue (Admin only)
CREATE POLICY "Allow admin to manage translation queue"
ON public.blog_translation_queue
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

-- Policies for Redirects (Public read, Admin manage)
CREATE POLICY "Allow public read for redirects"
ON public.blog_redirects
FOR SELECT
USING (true);

CREATE POLICY "Allow admin to manage redirects"
ON public.blog_redirects
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

-- Updated_at trigger for queue
CREATE TRIGGER update_blog_translation_queue_updated_at
BEFORE UPDATE ON public.blog_translation_queue
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.blog_translation_queue IS 'Queue for background blog translations using Gemini';
COMMENT ON TABLE public.blog_redirects IS 'Handles 301/302 redirects for changed blog slugs to preserve SEO';


-- FILE: 20260409_create_blog_analytics.sql

-- Migration: Create blog_analytics table
-- Task: 1.6 Create blog_analytics table
-- Requirements: 10.9
-- Date: 2026-04-09

-- ============================================================================
-- Table: blog_analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  country_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_analytics_post ON public.blog_analytics(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_analytics_locale ON public.blog_analytics(locale, created_at DESC);

COMMENT ON TABLE public.blog_analytics IS 'Tracks page views for blog posts per locale';
COMMENT ON COLUMN public.blog_analytics.post_id IS 'FK to posts table (ON DELETE CASCADE)';
COMMENT ON COLUMN public.blog_analytics.locale IS 'Locale of the visitor (e.g., en, tr, de)';
COMMENT ON COLUMN public.blog_analytics.referrer IS 'HTTP Referer header value';
COMMENT ON COLUMN public.blog_analytics.user_agent IS 'HTTP User-Agent header value';
COMMENT ON COLUMN public.blog_analytics.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., US, TR)';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.blog_analytics ENABLE ROW LEVEL SECURITY;

-- Public insert (anyone can record a view)
CREATE POLICY "Allow public insert for blog_analytics"
ON public.blog_analytics FOR INSERT WITH CHECK (true);

-- Admin read access only
CREATE POLICY "Allow admin to read blog_analytics"
ON public.blog_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
  )
);


-- FILE: 20260409_create_blog_junction_tables.sql

-- Migration: Create junction tables for blog post categories and tags
-- Task: 1.5 Create junction tables for categories and tags
-- Requirements: 10.5, 10.6
-- Date: 2026-04-09

-- ============================================================================
-- Table: blog_post_categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_post_categories (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_categories_post ON public.blog_post_categories(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_categories_category ON public.blog_post_categories(category_id);

COMMENT ON TABLE public.blog_post_categories IS 'Junction table linking blog posts to categories (many-to-many)';

-- ============================================================================
-- Table: blog_post_tags
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post ON public.blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON public.blog_post_tags(tag_id);

COMMENT ON TABLE public.blog_post_tags IS 'Junction table linking blog posts to tags (many-to-many)';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.blog_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read for blog_post_categories"
ON public.blog_post_categories FOR SELECT USING (true);

CREATE POLICY "Allow public read for blog_post_tags"
ON public.blog_post_tags FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Allow admin to manage blog_post_categories"
ON public.blog_post_categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
  )
);

CREATE POLICY "Allow admin to manage blog_post_tags"
ON public.blog_post_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
  )
);
