'use server';

import { createClient } from '@/core/db/server';
import { getAccountContext } from '@/core/tenancy/account-context';

export interface WizardData {
    // Step 1: Business Profile
    businessName?: string;
    industry?: string;
    companySize?: string;

    // Step 2: AI Persona
    personaName?: string;
    personaIntro?: string;
    brandVoice?: 'professional' | 'friendly' | 'casual';

    // Step 3: Knowledge Base
    knowledgeBase?: string;
    websiteUrl?: string;

    // Step 4: Qualification Questions
    qualificationQuestions?: string[];

    // Step 5: Conversation Rules
    forbiddenTopics?: string[];
    mandatoryRules?: string[];
    fallbackAction?: 'none' | 'human_handoff' | 'custom_message';
    fallbackMessage?: string;

    // Step 6: Integration & Go Live
    autoResponseEnabled?: boolean;
    responseDelaySeconds?: number;
}

export async function getSetupWizardStatus() {
    const context = await getAccountContext();
    if (!context.ok) return { ok: false, error: context.error };

    const supabase = await createClient();
    const { data, error } = await supabase
        .from('accounts')
        .select('setup_wizard_completed, setup_wizard_step, setup_wizard_data')
        .eq('id', context.accountId)
        .single();

    if (error) return { ok: false, error: error.message };
    
    return { 
        ok: true, 
        completed: data.setup_wizard_completed ?? false,
        currentStep: data.setup_wizard_step ?? 1,
        wizardData: data.setup_wizard_data as WizardData | null
    };
}

export async function saveWizardProgress(step: number, data: WizardData) {
    const context = await getAccountContext();
    if (!context.ok) return { ok: false, error: context.error };

    const supabase = await createClient();
    
    // Get existing wizard data and merge
    const { data: existing } = await supabase
        .from('accounts')
        .select('setup_wizard_data')
        .eq('id', context.accountId)
        .single();

    const mergedData = {
        ...(existing?.setup_wizard_data as WizardData || {}),
        ...data
    };

    const { error } = await supabase
        .from('accounts')
        .update({
            setup_wizard_step: step,
            setup_wizard_data: mergedData
        })
        .eq('id', context.accountId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function completeSetupWizard(data: WizardData) {
    const context = await getAccountContext();
    if (!context.ok) return { ok: false, error: context.error };

    const supabase = await createClient();

    const aiConfig = {
        brand_voice: data.brandVoice || 'professional',
        knowledge_base: [
            data.knowledgeBase || '',
            data.websiteUrl ? `Website: ${data.websiteUrl}` : '',
        ].filter(Boolean).join('\n\n'),
        auto_response_enabled: data.autoResponseEnabled ?? true,
        response_delay_seconds: data.responseDelaySeconds ?? 0,
        qualification_questions: data.qualificationQuestions || [],
        fallback_action: data.fallbackAction || 'none',
        fallback_message: data.fallbackMessage || '',
        persona_name: data.personaName || '',
        persona_intro: data.personaIntro || '',
        forbidden_topics: data.forbiddenTopics || [],
        mandatory_rules: data.mandatoryRules || [],
        faq_items: [],
        nurture_config: {
            enabled: false,
            inactivity_threshold_hours: 72,
            max_nurture_messages: 3,
            send_time_start: 9,
            send_time_end: 17,
            days_between_messages: 3,
            tone: 'friendly',
            include_meeting_cta: true,
            channels: ['email'],
        },
    };

    // Single update — prevents partial state if second call fails
    const { error } = await supabase
        .from('accounts')
        .update({
            ai_config: aiConfig,
            setup_wizard_completed: true,
            setup_wizard_step: 6,
            name: data.businessName || context.account?.name,
            setup_wizard_data: null,
        })
        .eq('id', context.accountId);

    if (error) return { ok: false, error: error.message };

    return { ok: true };
}

export async function skipSetupWizard() {
    const context = await getAccountContext();
    if (!context.ok) return { ok: false, error: context.error };

    const supabase = await createClient();
    
    const { error } = await supabase
        .from('accounts')
        .update({
            setup_wizard_completed: true,
            setup_wizard_step: 6,
            setup_wizard_data: null
        })
        .eq('id', context.accountId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}
