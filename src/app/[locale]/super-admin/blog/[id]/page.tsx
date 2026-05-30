import { getPostById } from "@/features/blog";
import { PostForm } from "@/features/blog/components/blog/post-form";

interface PageProps {
    params: Promise<{ id: string; locale: string }>;
}

export default async function BlogPostEditorPage({ params }: PageProps) {
    const { id } = await params;
    let post = null;
    let translations: any[] = [];

    if (id !== "new") {
        post = await getPostById(id) as any;
        if (post) {
            const { getTranslationsForPost } = await import("@/features/blog");
            translations = await getTranslationsForPost(id);
        }
    }

    return <PostForm post={post} translations={translations} />;
}
