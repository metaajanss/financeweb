import { Link } from '@/i18n/navigation';
import { Lock, Zap } from 'lucide-react';
import { PLAN_LABELS, PLAN_PRICES } from '@/config/plans';
import type { SubscriptionPlan } from '@/config/plans';

export function UpgradeBanner({
    currentPlan,
    requiredPlan,
    feature,
}: {
    currentPlan: SubscriptionPlan;
    requiredPlan: SubscriptionPlan;
    feature?: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <div className="flex flex-col items-center gap-6 max-w-md text-center">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                    <Lock className="w-9 h-9 text-primary" />
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                        Upgrade Required
                    </p>
                    <h2 className="text-2xl font-black tracking-tight">
                        {PLAN_LABELS[requiredPlan]} Plan
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature ? `"${feature}"` : 'This feature'} is available starting from the{' '}
                        <span className="font-bold text-foreground">{PLAN_LABELS[requiredPlan]}</span> plan
                        ({PLAN_PRICES[requiredPlan]}/mo).{' '}
                        You are currently on the <span className="font-bold text-foreground">{PLAN_LABELS[currentPlan]}</span> plan.
                    </p>
                </div>

                <Link href="/admin/settings/billing">
                    <button className="flex items-center gap-2 btn-primary-gradient px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20">
                        <Zap className="w-4 h-4" />
                        Upgrade to {PLAN_LABELS[requiredPlan]}
                    </button>
                </Link>

                <p className="text-xs text-muted-foreground">
                    Instant activation · Cancel anytime
                </p>
            </div>
        </div>
    );
}
