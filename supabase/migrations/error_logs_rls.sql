-- ============================================
-- ERROR_LOGS RLS POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Super admins can view all error logs" ON error_logs;
DROP POLICY IF EXISTS "Admins can view their tenant error logs" ON error_logs;
DROP POLICY IF EXISTS "Authenticated users can insert error logs" ON error_logs;
DROP POLICY IF EXISTS "Anonymous users can insert error logs" ON error_logs;

-- Super admins (role = 'super_admin' in profiles) can view all error logs
CREATE POLICY "Super admins can view all error logs"
ON error_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

-- Regular admins can only view error logs for their account
CREATE POLICY "Admins can view their account error logs"
ON error_logs
FOR SELECT
TO authenticated
USING (
    account_id IN (
        SELECT account_id FROM profiles
        WHERE id = auth.uid()
    )
);

-- Allow authenticated users to insert error logs
CREATE POLICY "Authenticated users can insert error logs"
ON error_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow anonymous users to insert error logs (for client-side errors before auth)
CREATE POLICY "Anonymous users can insert error logs"
ON error_logs
FOR INSERT
TO anon
WITH CHECK (true);
