-- ============================================================
-- RLS POLICIES — Consolidated & Recursion-Safe
-- ============================================================

-- 1. Security Definer Helper Function (Breaks RLS Recursion)
CREATE OR REPLACE FUNCTION public.get_my_account_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id FROM public.profiles WHERE id = auth.uid();
$$;


-- ============================================================
-- PROFILES TABLE
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view team members"  ON profiles;
DROP POLICY IF EXISTS "profiles_owner_select" ON profiles;
DROP POLICY IF EXISTS "profiles_team_select"  ON profiles;

CREATE POLICY "profiles_owner_select"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "profiles_team_select"
ON profiles FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);


-- ============================================================
-- ACCOUNTS TABLE
-- ============================================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own account"   ON accounts;
DROP POLICY IF EXISTS "Admins can update account"    ON accounts;
DROP POLICY IF EXISTS "accounts_select"              ON accounts;

CREATE POLICY "accounts_select"
ON accounts FOR SELECT
USING (id = public.get_my_account_id());

CREATE POLICY "Admins can update account"
ON accounts FOR UPDATE
USING (
  id = public.get_my_account_id() AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ============================================================
-- LEADS TABLE
-- ============================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account leads"   ON leads;
DROP POLICY IF EXISTS "Users can create leads"         ON leads;
DROP POLICY IF EXISTS "Users can update leads"         ON leads;
DROP POLICY IF EXISTS "Users can delete leads"         ON leads;
DROP POLICY IF EXISTS "leads_select"                   ON leads;
DROP POLICY IF EXISTS "leads_insert"                   ON leads;

CREATE POLICY "leads_select"
ON leads FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "leads_insert"
ON leads FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "leads_update"
ON leads FOR UPDATE
USING (account_id = public.get_my_account_id());

CREATE POLICY "leads_delete"
ON leads FOR DELETE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- CONVERSATIONS TABLE
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account conversations"   ON conversations;
DROP POLICY IF EXISTS "Users can create conversations"         ON conversations;
DROP POLICY IF EXISTS "Users can update conversations"         ON conversations;

CREATE POLICY "conversations_select"
ON conversations FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "conversations_insert"
ON conversations FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "conversations_update"
ON conversations FOR UPDATE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- MESSAGES TABLE
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account messages"   ON messages;
DROP POLICY IF EXISTS "Users can create messages"         ON messages;

CREATE POLICY "messages_select"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE account_id = public.get_my_account_id()
  )
);

CREATE POLICY "messages_insert"
ON messages FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations WHERE account_id = public.get_my_account_id()
  )
);


-- ============================================================
-- MEETINGS TABLE
-- ============================================================
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account meetings"   ON meetings;
DROP POLICY IF EXISTS "Users can create meetings"         ON meetings;
DROP POLICY IF EXISTS "Users can update meetings"         ON meetings;
DROP POLICY IF EXISTS "Users can delete meetings"         ON meetings;

CREATE POLICY "meetings_select"
ON meetings FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "meetings_insert"
ON meetings FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "meetings_update"
ON meetings FOR UPDATE
USING (account_id = public.get_my_account_id());

CREATE POLICY "meetings_delete"
ON meetings FOR DELETE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- INTEGRATIONS TABLE
-- ============================================================
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view account integrations"   ON integrations;
DROP POLICY IF EXISTS "Admins can manage integrations"        ON integrations;

CREATE POLICY "integrations_select"
ON integrations FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "integrations_manage"
ON integrations FOR ALL
USING (
  account_id = public.get_my_account_id() AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ============================================================
-- SEQUENCES TABLE
-- ============================================================
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sequences from their account"    ON sequences;
DROP POLICY IF EXISTS "Users can insert sequences to their account"    ON sequences;
DROP POLICY IF EXISTS "Users can update sequences from their account"  ON sequences;
DROP POLICY IF EXISTS "Users can delete sequences from their account"  ON sequences;

CREATE POLICY "sequences_select"
ON sequences FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "sequences_insert"
ON sequences FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "sequences_update"
ON sequences FOR UPDATE
USING (account_id = public.get_my_account_id());

CREATE POLICY "sequences_delete"
ON sequences FOR DELETE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- SEQUENCE_ENROLLMENTS TABLE
-- ============================================================
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view enrollments from their account"    ON sequence_enrollments;
DROP POLICY IF EXISTS "Users can insert enrollments to their account"    ON sequence_enrollments;
DROP POLICY IF EXISTS "Users can update enrollments from their account"  ON sequence_enrollments;
DROP POLICY IF EXISTS "Users can delete enrollments from their account"  ON sequence_enrollments;

CREATE POLICY "enrollments_select"
ON sequence_enrollments FOR SELECT
USING (account_id = public.get_my_account_id());

CREATE POLICY "enrollments_insert"
ON sequence_enrollments FOR INSERT
WITH CHECK (account_id = public.get_my_account_id());

CREATE POLICY "enrollments_update"
ON sequence_enrollments FOR UPDATE
USING (account_id = public.get_my_account_id());

CREATE POLICY "enrollments_delete"
ON sequence_enrollments FOR DELETE
USING (account_id = public.get_my_account_id());


-- ============================================================
-- B2B_COMPANIES TABLE (Lead Database)
-- ============================================================
ALTER TABLE IF EXISTS b2b_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view companies" ON b2b_companies;
DROP POLICY IF EXISTS "Service role only write" ON b2b_companies;

-- Allow all authenticated users to search/view lead database
CREATE POLICY "authenticated_select_companies"
ON b2b_companies FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "notifications_select_own"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);


-- ============================================================
-- POSTS TABLE (Blog)
-- ============================================================
ALTER TABLE IF EXISTS posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published posts" ON posts;
DROP POLICY IF EXISTS "Admins can view all posts"       ON posts;
DROP POLICY IF EXISTS "Admins can insert posts"        ON posts;
DROP POLICY IF EXISTS "Admins can update posts"        ON posts;
DROP POLICY IF EXISTS "Admins can delete posts"        ON posts;

CREATE POLICY "posts_public_select"
ON posts FOR SELECT
USING (published = true);

CREATE POLICY "posts_admin_all"
ON posts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);
