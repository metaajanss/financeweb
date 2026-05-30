'use client';

import { createPost, updatePost, upsertTranslation, translateContentAction, PostData, PostTranslationData } from "@/features/blog";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useToast } from "@/shared/components/ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ACTIVE_LOCALES, LOCALES_CONFIG } from "@/config/locales";
import { Loader2, Languages, Sparkles } from "lucide-react";

interface PostFormProps {
    post?: any;
    translations?: any[];
}

export function PostForm({ post, translations = [] }: PostFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [translating, setTranslating] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>("en");
    
    // Main post state (English)
    const [formData, setFormData] = useState<PostData>({
        title: post?.title || "",
        slug: post?.slug || "",
        content: post?.content || "",
        excerpt: post?.excerpt || "",
        cover_image: post?.cover_image || "",
        published: post?.published || false,
    });

    // Translations state
    const [translationData, setTranslationData] = useState<Record<string, Partial<PostTranslationData>>>({});

    useEffect(() => {
        if (translations.length > 0) {
            const initialTranslations: Record<string, Partial<PostTranslationData>> = {};
            translations.forEach(t => {
                initialTranslations[t.language] = t;
            });
            setTranslationData(initialTranslations);
        }
    }, [translations]);

    const handleMainChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === "title" && !post) {
            const slug = value
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)+/g, "");
            setFormData((prev) => ({ ...prev, slug }));
        }
    };

    const handleTranslationChange = (lang: string, field: string, value: string) => {
        setTranslationData(prev => ({
            ...prev,
            [lang]: {
                ...prev[lang],
                [field]: value
            }
        }));

        if (field === "title" && !translationData[lang]?.slug) {
            const slug = value
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)+/g, "");
            setTranslationData(prev => ({
                ...prev,
                [lang]: { ...prev[lang], slug }
            }));
        }
    };

    const handleTranslate = async (targetLang: string) => {
        if (!formData.title || !formData.content) {
            showToast("Please enter English title and content first", "error");
            return;
        }

        setTranslating(targetLang);
        try {
            const [tTitle, tContent, tExcerpt] = await Promise.all([
                translateContentAction(formData.title, targetLang),
                translateContentAction(formData.content, targetLang),
                translateContentAction(formData.excerpt || formData.content.substring(0, 150), targetLang)
            ]);

            setTranslationData(prev => ({
                ...prev,
                [targetLang]: {
                    ...prev[targetLang],
                    title: tTitle,
                    content: tContent,
                    excerpt: tExcerpt,
                    slug: formData.slug + "-" + targetLang
                }
            }));
            showToast(`Translated to ${LOCALES_CONFIG[targetLang as keyof typeof LOCALES_CONFIG].name}`, "success");
        } catch (error: any) {
            showToast(`Translation failed: ${error.message}`, "error");
        } finally {
            setTranslating(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const currentPostId = post?.id;

            // 1. Save main post
            if (post) {
                await updatePost(post.id, formData);
                showToast("Main post updated", "success");
            } else {
                // For new post, we'd need the ID back to save translations
                // Since createPost doesn't return ID in current mock, let's assume we redirect or the action handles it
                // In a real app, I'd update createPost to return the new post
                await createPost(formData);
                showToast("Post created. Please edit to add translations.", "success");
                router.push("/super-admin/blog");
                return;
            }

            // 2. Save translations
            if (currentPostId) {
                for (const lang of ACTIVE_LOCALES) {
                    if (lang === 'en') continue;
                    const t = translationData[lang];
                    if (t?.title && t?.content) {
                        await upsertTranslation({
                            post_id: currentPostId,
                            language: lang,
                            title: t.title,
                            content: t.content,
                            excerpt: t.excerpt || "",
                            slug: t.slug || ""
                        });
                    }
                }
                showToast("Translations saved", "success");
            }

            router.refresh();
        } catch (error: any) {
            showToast(error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
            <form onSubmit={handleSubmit}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">{post ? "Edit Post" : "New Post"}</h1>
                        <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                            <Languages className="h-4 w-4" /> Multi-language blog support enabled
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.published}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))}
                            />
                            <Label>Published</Label>
                        </div>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Saving..." : "Save All Changes"}
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid grid-cols-4 md:grid-cols-9 lg:grid-cols-11 mb-8">
                        {ACTIVE_LOCALES.map((locale) => (
                            <TabsTrigger key={locale} value={locale} className="relative">
                                {LOCALES_CONFIG[locale].flag} {locale.toUpperCase()}
                                {locale !== 'en' && translationData[locale]?.title && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Main Content (English) */}
                    <TabsContent value="en">
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>English Content (Original)</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="title">Title</Label>
                                            <Input
                                                id="title"
                                                name="title"
                                                value={formData.title}
                                                onChange={handleMainChange}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="content">Content (Markdown)</Label>
                                            <Textarea
                                                id="content"
                                                className="min-h-[500px] font-mono"
                                                value={formData.content}
                                                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Post Settings</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="slug">Slug</Label>
                                            <Input
                                                id="slug"
                                                name="slug"
                                                value={formData.slug}
                                                onChange={handleMainChange}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="excerpt">Excerpt</Label>
                                            <Textarea
                                                id="excerpt"
                                                name="excerpt"
                                                value={formData.excerpt}
                                                onChange={handleMainChange}
                                                rows={4}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="cover_image">Cover Image URL</Label>
                                            <Input
                                                id="cover_image"
                                                name="cover_image"
                                                value={formData.cover_image}
                                                onChange={handleMainChange}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                                
                                <Card className="bg-primary/5 border-primary/20">
                                    <CardContent className="pt-6">
                                        <p className="text-sm mb-4">You can use AI to instantly translate this post to all active languages after saving the English version.</p>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/10"
                                            onClick={() => {
                                                const nextLocale = ACTIVE_LOCALES.find(l => l !== 'en' && !translationData[l]?.title);
                                                if (nextLocale) {
                                                    setActiveTab(nextLocale);
                                                    handleTranslate(nextLocale);
                                                } else {
                                                    showToast("All translations complete!", "success");
                                                }
                                            }}
                                        >
                                            <Sparkles className="h-4 w-4" /> Auto-Translate Missing
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Translation Content */}
                    {ACTIVE_LOCALES.filter(l => l !== 'en').map((locale) => (
                        <TabsContent key={locale} value={locale}>
                             <div className="grid md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-6">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <CardTitle>{LOCALES_CONFIG[locale].name} Translation</CardTitle>
                                            <Button 
                                                type="button" 
                                                variant="secondary" 
                                                size="sm" 
                                                onClick={() => handleTranslate(locale)}
                                                disabled={translating === locale}
                                            >
                                                {translating === locale ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                                {translating === locale ? "Translating..." : "Auto-Translate"}
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label>Title ({locale})</Label>
                                                <Input
                                                    value={translationData[locale]?.title || ""}
                                                    onChange={(e) => handleTranslationChange(locale, "title", e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Content ({locale})</Label>
                                                <Textarea
                                                    className="min-h-[500px] font-mono"
                                                    value={translationData[locale]?.content || ""}
                                                    onChange={(e) => handleTranslationChange(locale, "content", e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Localized SEO</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label>Slug ({locale})</Label>
                                                <Input
                                                    value={translationData[locale]?.slug || ""}
                                                    onChange={(e) => handleTranslationChange(locale, "slug", e.target.value)}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Excerpt ({locale})</Label>
                                                <Textarea
                                                    value={translationData[locale]?.excerpt || ""}
                                                    onChange={(e) => handleTranslationChange(locale, "excerpt", e.target.value)}
                                                    rows={4}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </form>
        </div>
    );
}
