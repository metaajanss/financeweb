'use client';

import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';

interface LeadScoreProps {
    score: number | null;
    size?: 'sm' | 'md' | 'lg';
}

export function LeadScore({ score, size = 'md' }: LeadScoreProps) {
    const t = useTranslations('Leads.score');
    const normalizedScore = score ?? 0;

    // Renk ve etiket belirleme
    const getScoreConfig = (value: number) => {
        if (value <= 30) {
            return {
                color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                barColor: 'bg-rose-500',
                label: t('cold'),
                icon: '🧊'
            };
        }
        if (value <= 60) {
            return {
                color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                barColor: 'bg-amber-500',
                label: t('warm'),
                icon: '🌡️'
            };
        }
        if (value <= 85) {
            return {
                color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                barColor: 'bg-blue-500',
                label: t('hot'),
                icon: '🔥'
            };
        }
        return {
            color: 'bg-gradient-to-r from-[#8E44AD]/30 to-[#4F46E5]/30 text-[#8E44AD] border-[#8E44AD]/30',
            barColor: 'bg-gradient-to-r from-[#8E44AD] to-[#4F46E5]',
            label: t('veryHot'),
            icon: '⭐'
        };
    };

    const config = getScoreConfig(normalizedScore);

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-2'
    };

    return (
        <div className="flex items-center gap-2">
            <div
                className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${config.color} ${sizeClasses[size]}`}
                title={`${normalizedScore}/100 - ${config.label}`}
            >
                <span>{config.icon}</span>
                <span>{normalizedScore}</span>
            </div>
        </div>
    );
}

// Progress bar variant for detailed views
export function LeadScoreProgress({ score, showLabel = true }: { score: number | null; showLabel?: boolean }) {
    const t = useTranslations('Leads.score');
    const normalizedScore = score ?? 0;

    const getScoreConfig = (value: number) => {
        if (value <= 30) {
            return {
                barColor: 'bg-rose-500',
                label: t('cold'),
                icon: '🧊'
            };
        }
        if (value <= 60) {
            return {
                barColor: 'bg-amber-500',
                label: t('warm'),
                icon: '🌡️'
            };
        }
        if (value <= 85) {
            return {
                barColor: 'bg-blue-500',
                label: t('hot'),
                icon: '🔥'
            };
        }
        return {
            barColor: 'bg-gradient-to-r from-[#8E44AD] to-[#4F46E5]',
            label: t('veryHot'),
            icon: '⭐'
        };
    };

    const config = getScoreConfig(normalizedScore);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground">{t('label')}</span>
                </div>
                {showLabel && (
                    <span className="text-sm text-muted-foreground">
                        {config.icon} {config.label}
                    </span>
                )}
            </div>
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${config.barColor}`}
                    style={{ width: `${normalizedScore}%` }}
                />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span className="font-semibold text-foreground">{normalizedScore}/100</span>
                <span>100</span>
            </div>
        </div>
    );
}

