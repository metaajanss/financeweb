export type SubscriptionPlan = 'free' | 'starter' | 'growth' | 'pro' | 'business';

export const PLAN_HIERARCHY: SubscriptionPlan[] = ['free', 'starter', 'growth', 'pro', 'business'];

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
    free: 'Free',
    starter: 'Starter',
    growth: 'Growth',
    pro: 'Pro',
    business: 'Business',
};

export const PLAN_PRICES: Record<SubscriptionPlan, string> = {
    free: '$0',
    starter: '$19',
    growth: '$39',
    pro: '$69',
    business: '$99',
};

// Minimum plan required per feature/route segment
export const FEATURE_MIN_PLAN: Record<string, SubscriptionPlan> = {
    // Free (always accessible)
    leads: 'free',
    conversations: 'free',
    sequences: 'free',
    pipeline: 'free',
    calendar: 'free',
    'settings/integrations': 'free',
    'settings/team': 'free',
    'settings/webhooks': 'free',

    // Starter
    'activity-log': 'starter',

    // Growth
    chatbot: 'growth',
    'leads/widget': 'growth',
    'b2b-database': 'growth',

    // Pro
    'ai-training': 'pro',
    'settings/ai': 'pro',
};

export function hasAccess(userPlan: SubscriptionPlan, requiredPlan: SubscriptionPlan): boolean {
    return PLAN_HIERARCHY.indexOf(userPlan) >= PLAN_HIERARCHY.indexOf(requiredPlan);
}

export interface PlanLimits {
    monthlyWhatsappMessages: number;
    dailyEmailMessages: number;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
    free:     { monthlyWhatsappMessages: 10,   dailyEmailMessages: 50 },
    starter:  { monthlyWhatsappMessages: 50,   dailyEmailMessages: 200 },
    growth:   { monthlyWhatsappMessages: 200,  dailyEmailMessages: 500 },
    pro:      { monthlyWhatsappMessages: 500,  dailyEmailMessages: 2000 },
    business: { monthlyWhatsappMessages: 2000, dailyEmailMessages: 10000 },
};

export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
    return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}
