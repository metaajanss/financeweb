import { getAccountContext } from '@/core/tenancy/account-context';
import { hasAccess } from '@/config/plans';
import { UpgradeBanner } from '@/shared/components/plan-gate/upgrade-banner';
import type { SubscriptionPlan } from '@/config/plans';

interface PlanGateProps {
    required: SubscriptionPlan;
    feature?: string;
    children: React.ReactNode;
}

export async function PlanGate({ required, feature, children }: PlanGateProps) {
    const context = await getAccountContext();
    const plan = context.ok ? ((context.account?.plan_id || 'free') as SubscriptionPlan) : 'free';
    if (hasAccess(plan, required)) return <>{children}</>;
    return <UpgradeBanner currentPlan={plan} requiredPlan={required} feature={feature} />;
}
