import { createClient } from '@supabase/supabase-js';
import { Database } from '@/shared/types';
import { env } from '@/config/env';

/**
 * Creates a Supabase client with the service role key to bypass RLS.
 * USE WITH CAUTION: This client has full administrative access to the database.
 * Never expose this client or its key to the client side.
 */
export const createAdminClient = () => {
    return createClient<Database>(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
};
