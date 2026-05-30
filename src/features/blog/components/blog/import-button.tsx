'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/shared/components/ui/toast';
import { importBlogPostsFromSheetsAction } from '@/features/blog';
import { useRouter } from '@/i18n/navigation';

export default function ImportBlogButton() {
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    const router = useRouter();

    const handleImport = async () => {
        setLoading(true);
        try {
            const result = await importBlogPostsFromSheetsAction();
            if (result.success) {
                showToast(`Successfully imported ${result.count} blog posts`, 'success');
                router.refresh();
            } else {
                showToast(result.error || 'Failed to import blog posts', 'error');
            }
        } catch (error: any) {
            showToast(error.message || 'An unexpected error occurred', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handleImport} 
            disabled={loading}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <FileDown className="h-4 w-4" />
            )}
            {loading ? 'Importing...' : 'Import from Sheets'}
        </Button>
    );
}
