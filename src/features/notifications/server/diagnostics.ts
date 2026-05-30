import { createClient } from '@/core/db/server'
import { getAccountContext } from '@/core/tenancy/account-context'

export async function checkAccountConfig() {
    const context = await getAccountContext()
    if (!context.ok) return { error: 'No context' }
    
    const supabase = await createClient()
    const { data: account } = await supabase
        .from('accounts')
        .select('ai_config, plan_id')
        .eq('id', context.accountId)
        .single()
        
    return {
        accountId: context.accountId,
        email: context.user.email,
        plan_id: account?.plan_id,
        ai_config: account?.ai_config
    }
}
