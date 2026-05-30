-- Demo Data Population Script for admin@admin.com

DO $$
DECLARE
    target_email TEXT := 'admin@admin.com';
    target_user_id UUID;
    target_account_id UUID;
    lead_id_1 UUID;
    lead_id_2 UUID;
    lead_id_3 UUID;
    conv_id_1 UUID;
    conv_id_2 UUID;
BEGIN
    -- 1. Get User ID
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User % not found in auth.users. Please sign up with this email first.', target_email;
        RETURN;
    END IF;

    -- 2. Ensure Account Exists
    -- Check if user already has a profile and account
    SELECT account_id INTO target_account_id FROM public.profiles WHERE id = target_user_id;

    IF target_account_id IS NULL THEN
        -- Create new account
        INSERT INTO public.accounts (name, subscription_status, plan_id)
        VALUES ('Demo Company', 'active', 'pro')
        RETURNING id INTO target_account_id;

        -- Create/Update profile
        INSERT INTO public.profiles (id, account_id, full_name, role, avatar_url)
        VALUES (target_user_id, target_account_id, 'Admin User', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin')
        ON CONFLICT (id) DO UPDATE
        SET account_id = target_account_id,
            full_name = 'Admin User',
            role = 'admin';
    END IF;

    -- 3. Clear existing demo data for this account (optional, to avoid duplicates if run multiple times)
    -- BE CAREFUL: This deletes data for the account. Comment out if you want to append.
    DELETE FROM public.meetings WHERE account_id = target_account_id;
    DELETE FROM public.messages WHERE conversation_id IN (SELECT id FROM public.conversations WHERE account_id = target_account_id);
    DELETE FROM public.conversations WHERE account_id = target_account_id;
    DELETE FROM public.leads WHERE account_id = target_account_id;
    DELETE FROM public.integrations WHERE account_id = target_account_id;
    -- DELETE FROM public.sequences WHERE account_id = target_account_id; -- If sequences table exists

    -- 4. Seed Leads
    
    -- Lead 1: New Lead (Website)
    INSERT INTO public.leads (account_id, first_name, last_name, email, phone, source, status, created_at)
    VALUES (target_account_id, 'Ahmet', 'Yılmaz', 'ahmet.yilmaz@example.com', '+905551112233', 'website', 'new', NOW() - INTERVAL '2 hours')
    RETURNING id INTO lead_id_1;

    -- Lead 2: Contacted / In Conversation (WhatsApp)
    INSERT INTO public.leads (account_id, first_name, last_name, email, phone, source, status, created_at)
    VALUES (target_account_id, 'Ayşe', 'Demir', 'ayse.demir@example.com', '+905554445566', 'whatsapp', 'contacted', NOW() - INTERVAL '1 day')
    RETURNING id INTO lead_id_2;

    -- Lead 3: Booked Meeting (Instagram)
    INSERT INTO public.leads (account_id, first_name, last_name, email, phone, source, status, created_at)
    VALUES (target_account_id, 'Mehmet', 'Kaya', 'mehmet.kaya@example.com', '+905557778899', 'instagram', 'booked', NOW() - INTERVAL '3 days')
    RETURNING id INTO lead_id_3;

    -- Additional Leads for variety
    INSERT INTO public.leads (account_id, first_name, last_name, email, phone, source, status, created_at) VALUES
    (target_account_id, 'Zeynep', 'Çelik', 'zeynep.celik@example.com', '+905559990011', 'website', 'qualified', NOW() - INTERVAL '5 hours'),
    (target_account_id, 'Ali', 'Veli', 'ali.veli@example.com', '+905552223344', 'referral', 'unqualified', NOW() - INTERVAL '1 week'),
    (target_account_id, 'Fatma', 'Sarı', 'fatma.sari@example.com', '+905558889900', 'linkedin', 'new', NOW() - INTERVAL '30 minutes'),
    (target_account_id, 'Can', 'Öz', 'can.oz@example.com', '+905556667788', 'ads', 'contacted', NOW() - INTERVAL '2 days');

    -- 5. Seed Conversations & Messages

    -- Conversation for Lead 2 (Ayşe)
    INSERT INTO public.conversations (account_id, lead_id, channel, status, last_message_at)
    VALUES (target_account_id, lead_id_2, 'whatsapp', 'active', NOW() - INTERVAL '1 hour')
    RETURNING id INTO conv_id_1;

    INSERT INTO public.messages (conversation_id, sender_type, content, created_at) VALUES
    (conv_id_1, 'lead', 'Merhaba, fiyatlarınız hakkında bilgi alabilir miyim?', NOW() - INTERVAL '1 day'),
    (conv_id_1, 'ai', 'Merhaba Ayşe Hanım! Tabii ki. Paketlerimiz aylık abonelik şeklindedir. Hangi hizmetimizle ilgileniyorsunuz?', NOW() - INTERVAL '23 hours'),
    (conv_id_1, 'lead', 'Randevu asistanı ilgimi çekiyor.', NOW() - INTERVAL '20 hours'),
    (conv_id_1, 'ai', 'Harika bir seçim! Randevu asistanımız 7/24 çalışır. Sizin için bir demo ayarlayalım mı?', NOW() - INTERVAL '1 hour');

    -- Conversation for Lead 3 (Mehmet) - Booked
    INSERT INTO public.conversations (account_id, lead_id, channel, status, last_message_at)
    VALUES (target_account_id, lead_id_3, 'whatsapp', 'closed', NOW() - INTERVAL '2 days')
    RETURNING id INTO conv_id_2;

    INSERT INTO public.messages (conversation_id, sender_type, content, created_at) VALUES
    (conv_id_2, 'lead', 'Toplantı ayarlamak istiyorum.', NOW() - INTERVAL '3 days'),
    (conv_id_2, 'ai', 'Memnuniyetle. Yarın saat 14:00 veya 16:00 sizin için uygun mu?', NOW() - INTERVAL '3 days'),
    (conv_id_2, 'lead', '14:00 uygun.', NOW() - INTERVAL '2 days'),
    (conv_id_2, 'ai', 'Tamamdır, yarın 14:00 için toplantınızı kaydettim.', NOW() - INTERVAL '2 days');

    -- 6. Seed Meetings
    INSERT INTO public.meetings (account_id, lead_id, agent_id, start_time, end_time, status, meeting_link)
    VALUES 
    (target_account_id, lead_id_3, target_user_id, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 30 minutes', 'scheduled', 'https://meet.google.com/abc-defg-hij'),
    (target_account_id, lead_id_2, target_user_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days 30 minutes', 'completed', 'https://meet.google.com/xyz-uvw-123');

    -- 7. Seed Integrations
    INSERT INTO public.integrations (account_id, provider, status, config) VALUES
    (target_account_id, 'google_calendar', 'connected', '{"calendar_id": "primary"}'),
    (target_account_id, 'whatsapp', 'connected', '{"phone_number_id": "123456"}'),
    (target_account_id, 'hubspot', 'disconnected', '{}');

    -- 8. Seed Sequences (Check if table exists first in your logic, but here assuming it does based on file view)
    -- Removing explicit table check for simplicity in this block, assuming schema handles existence
    BEGIN
        INSERT INTO public.sequences (account_id, name, trigger_type, is_active, steps) VALUES
        (target_account_id, 'Yeni Lead Karşılama', 'lead_created', true, '[{"type": "wait", "duration": "5m"}, {"type": "message", "template_id": "welcome"}]'::jsonb),
        (target_account_id, 'Toplantı Gelmeme Takibi', 'no_response', true, '[{"type": "wait", "duration": "1h"}, {"type": "email", "subject": "Toplantıyı kaçırdınız"}]'::jsonb);
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'Sequences table does not exist, skipping sequence seeding.';
    END;

    RAISE NOTICE 'Demo data populated successfully for user %', target_email;

END $$;
