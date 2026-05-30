import { createAdminClient } from '@/core/db/admin'

/**
 * Downloads an image from a URL and uploads it to Supabase Storage
 * @param url The external image URL
 * @param bucket The Supabase Storage bucket name (default: 'blog')
 * @returns The public URL of the uploaded image
 */
export async function uploadImageFromUrl(url: string, bucket: string = 'blog'): Promise<string | null> {
    if (!url || !url.startsWith('http')) return null;

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);
        let response: Response;
        try {
            response = await fetch(url, { signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }
        if (!response.ok) {
            console.error(`[ImageUploader] Failed to fetch image: ${url}`, response.statusText);
            return null;
        }
        
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Detect file extension and content type
        const contentType = blob.type || 'image/jpeg';
        let extension = 'jpg';
        if (contentType === 'image/png') extension = 'png';
        if (contentType === 'image/gif') extension = 'gif';
        if (contentType === 'image/webp') extension = 'webp';
        if (contentType === 'image/svg+xml') extension = 'svg';

        // Generate unique filename
        const fileName = `${crypto.randomUUID()}.${extension}`;
        const filePath = `${fileName}`; // For now, store in root of bucket

        const supabase = createAdminClient();
        
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, buffer, {
                contentType,
                upsert: true
            });

        if (uploadError) {
            console.error(`[ImageUploader] Supabase storage upload error:`, uploadError);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error(`[ImageUploader] Critical error uploading image from ${url}:`, error);
        return null;
    }
}

/**
 * Processes content and replaces external image URLs with Supabase Storage URLs
 * @param content Markdown or HTML content
 * @returns Processed content with local image URLs
 */
export async function processContentImages(content: string): Promise<string> {
    if (!content) return content;

    // Regex to find image URLs in Markdown: ![alt](url)
    const markdownRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/g;
    let processedContent = content;
    const matches = [...content.matchAll(markdownRegex)];

    for (const match of matches) {
        const [fullMatch, alt, url] = match;
        const localUrl = await uploadImageFromUrl(url);
        if (localUrl) {
            processedContent = processedContent.replace(fullMatch, `![${alt}](${localUrl})`);
        }
    }

    return processedContent;
}
