-- Blog çevirileri için tablo ekleme
CREATE TABLE IF NOT EXISTS public.post_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    language TEXT NOT NULL, -- 'en', 'tr', 'de', vb.
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT,
    excerpt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, language),
    UNIQUE(slug, language)
);

-- RLS (Row Level Security) Etkinleştirme
ALTER TABLE public.post_translations ENABLE ROW LEVEL SECURITY;

-- Politikalar: Herkes okuyabilir (Blog makaleleri halka açıktır)
CREATE POLICY "Allow public read for post translations"
ON public.post_translations
FOR SELECT
USING (true);

-- Politikalar: Sadece adminler ve yetkili profiller ekleyebilir/düzenleyebilir
CREATE POLICY "Allow admin to manage post translations"
ON public.post_translations
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.email = 'admin@admin.com')
    )
);

-- Updated_at tetikleyicisi ekleyelim
CREATE TRIGGER update_post_translations_updated_at
BEFORE UPDATE ON public.post_translations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
