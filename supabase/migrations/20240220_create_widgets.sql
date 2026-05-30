-- Create widgets table
CREATE TABLE IF NOT EXISTS public.widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'WhatsApp Widget',
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{
        "phone": "",
        "message": "Hello, I am interested in your services.",
        "button_text": "Chat with us",
        "position": "bottom-right",
        "color": "#25D366",
        "bubble_text": "Need help?"
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_id) -- One widget per account for now
);

-- Enable Row Level Security
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own widgets" ON public.widgets
    FOR SELECT USING (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own widgets" ON public.widgets
    FOR INSERT WITH CHECK (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own widgets" ON public.widgets
    FOR UPDATE USING (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their own widgets" ON public.widgets
    FOR DELETE USING (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

-- Public can view widgets by ID (for the script)
CREATE POLICY "Public can view active widgets by ID" ON public.widgets
    FOR SELECT USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_widgets_updated_at
BEFORE UPDATE ON public.widgets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
