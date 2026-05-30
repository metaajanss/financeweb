'use server';

import { createClient } from '@/core/db/server';
import { revalidatePath } from 'next/cache';

export async function importBlogPostsFromSheetsAction() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('Unauthorized');

        // Find any connected Google Sheets integration
        const { data: integrations } = await supabase
            .from('integrations')
            .select('id, config')
            .eq('provider', 'google_sheets')
            .eq('status', 'connected')
            .limit(1);

        if (!integrations || integrations.length === 0) {
            throw new Error('No connected Google Sheets integration found. Please connect Google Sheets in Settings first.');
        }

        const { importBlogPostsFromSheets } = await import('@/features/integrations/providers/google/sheets');
        const { importedCount } = await importBlogPostsFromSheets(integrations[0].id);

        revalidatePath('/super-admin/blog');
        return { success: true, count: importedCount };
    } catch (error: any) {
        console.error('Import from Sheets failed:', error);
        return { success: false, error: error.message };
    }
}
