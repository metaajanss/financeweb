-- Migration: Create B2B Database tables and structure
-- Date: 2024-02-27

-- 1. Add credits to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS b2b_credits INTEGER DEFAULT 150;

-- 2. Create b2b_companies table
CREATE TABLE IF NOT EXISTS public.b2b_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT,
    logo_url TEXT,
    description TEXT,
    hq_location TEXT,
    industry TEXT,
    size TEXT, -- '1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+'
    company_type TEXT,
    keywords TEXT[],
    founded_year INTEGER,
    technologies TEXT[],
    funding_amount TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full text search indexing
CREATE INDEX IF NOT EXISTS b2b_companies_name_idx ON public.b2b_companies (name);
CREATE INDEX IF NOT EXISTS b2b_companies_industry_idx ON public.b2b_companies (industry);

-- 3. Create b2b_unlocked_leads table
CREATE TABLE IF NOT EXISTS public.b2b_unlocked_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.b2b_companies(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- RLS for b2b_companies (everyone can read for searching, but full details might be hidden in API layer until unlocked)
ALTER TABLE public.b2b_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can search b2b_companies" ON public.b2b_companies
    FOR SELECT USING (true);

-- Admin can manage b2b_companies
CREATE POLICY "Admins can manage b2b_companies" ON public.b2b_companies
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- RLS for b2b_unlocked_leads
ALTER TABLE public.b2b_unlocked_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can View their own unlocked leads" ON public.b2b_unlocked_leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlocked leads" ON public.b2b_unlocked_leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert dummy seed data for testing if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.b2b_companies) THEN
        INSERT INTO public.b2b_companies 
        (name, domain, description, hq_location, industry, size, company_type, keywords, founded_year, technologies, funding_amount)
        VALUES 
        ('Acme Corp', 'acme.com', 'Leading manufacturer of road runner traps.', 'New York, USA', 'Manufacturing', '51-200', 'Private', ARRAY['hardware', 'b2b'], 1990, ARRAY['react', 'node'], '$10M'),
        ('TechNova', 'technova.io', 'Innovative cloud solutions for startups.', 'San Francisco, USA', 'Technology', '11-50', 'Startup', ARRAY['saas', 'cloud', 'ai'], 2021, ARRAY['aws', 'python'], '$2M'),
        ('Global Finance', 'globalfinance.net', 'Investment banking and asset management.', 'London, UK', 'Finance', '1001-5000', 'Public', ARRAY['finance', 'banking'], 1950, ARRAY['java', 'oracle'], '$1B'),
        ('EcoEnergy', 'ecoenergy.org', 'Renewable energy research and development.', 'Berlin, Germany', 'Energy', '201-500', 'Private', ARRAY['green', 'solar'], 2010, ARRAY['go', 'postgres'], '$50M'),
        ('HealthPlus', 'healthplus.com', 'Digital healthcare platform.', 'Toronto, Canada', 'Healthcare', '51-200', 'Private', ARRAY['healthtech', 'telemedicine'], 2015, ARRAY['react native', 'graphql'], '$15M'),
        ('EduSmart', 'edusmart.edu', 'EdTech solutions for higher education.', 'Boston, USA', 'Education', '11-50', 'Startup', ARRAY['edtech', 'learning'], 2018, ARRAY['vue', 'elixir'], '$5M'),
        ('RetailGiant', 'retailgiant.com', 'Global retail chain.', 'Chicago, USA', 'Retail', '10001+', 'Public', ARRAY['ecommerce', 'logistics'], 1980, ARRAY['c#', 'azure'], '$5B'),
        ('AgriTech Solutions', 'agritech.co', 'Smart farming technologies.', 'Amsterdam, Netherlands', 'Agriculture', '51-200', 'Private', ARRAY['agritech', 'iot'], 2012, ARRAY['python', 'mqtt'], '$12M'),
        ('LogiCorp', 'logicorp.net', 'International logistics and shipping.', 'Singapore', 'Logistics', '501-1000', 'Private', ARRAY['shipping', 'supply chain'], 2000, ARRAY['java', 'spring'], '$100M'),
        ('MediaStream', 'mediastream.tv', 'Next-gen streaming services.', 'Los Angeles, USA', 'Media', '201-500', 'Public', ARRAY['streaming', 'video'], 2016, ARRAY['ruby on rails', 'aws'], '$80M');
    END IF;
END $$;
