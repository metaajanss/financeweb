import { NextRequest } from 'next/server'
import { createClient } from '@/core/db/server'
import { AuthError } from '../errors/AppError'
import type { ApiContext } from './handler'

/**
 * Verify Supabase session and populate ctx.user / ctx.account.
 * Throws AuthError if the required level is not met.
 */
export async function verifyAuth(
    request: NextRequest,
    level: 'user' | 'admin' | 'super-admin',
    ctx: ApiContext
): Promise<void> {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        throw new AuthError('Authentication required')
    }

    ctx.user = { id: user.id, email: user.email ?? '' }

    if (level === 'user') return

    if (level === 'super-admin') {
        const adminEmail = process.env.SUPER_ADMIN_EMAIL
        const isSuperAdmin =
            (adminEmail && user.email === adminEmail) ||
            user.app_metadata?.role === 'super_admin'

        if (!isSuperAdmin) {
            throw new AuthError('Super admin access required')
        }
        return
    }

    if (level === 'admin') {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, account_id')
            .eq('id', user.id)
            .single()

        if (!profile?.account_id) {
            throw new AuthError('Admin access required')
        }

        ctx.account = { id: profile.account_id, name: '' }
        return
    }
}
