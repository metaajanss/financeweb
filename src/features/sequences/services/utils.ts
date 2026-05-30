// Types for the parsed settings
export interface SequenceSettings {
    dailyEmailLimit: number;
    monthlyWhatsappLimit: number;
    blackoutStartHour: number;
    blackoutEndHour: number;
    blackoutAction: 'delay' | 'skip';
    defaultTimezone: string;
    respectUnsubscribes: boolean;
    preventWeekendSends?: boolean;
}

export const DEFAULT_SETTINGS: SequenceSettings = {
    dailyEmailLimit: 50,
    monthlyWhatsappLimit: 10,
    blackoutStartHour: 22,
    blackoutEndHour: 8,
    blackoutAction: "delay",
    defaultTimezone: "Europe/Istanbul",
    respectUnsubscribes: true,
    preventWeekendSends: true
};

export function getCurrentHourInTimezone(timezone: string): number {
    try {
        const dateStr = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            hour12: false
        }).format(new Date());
        return parseInt(dateStr, 10);
    } catch {
        return new Date().getUTCHours(); // fallback to UTC
    }
}

export function isInBlackoutWindow(currentHour: number, startHour: number, endHour: number): boolean {
    if (startHour > endHour) {
        // e.g., starts at 22:00, ends at 08:00
        return currentHour >= startHour || currentHour < endHour;
    } else {
        // e.g., starts at 12:00, ends at 14:00
        return currentHour >= startHour && currentHour < endHour;
    }
}

export function isWeekendInTimezone(timezone: string): boolean {
    try {
        const dayStr = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            weekday: 'long'
        }).format(new Date());
        return dayStr === 'Saturday' || dayStr === 'Sunday';
    } catch {
        const day = new Date().getUTCDay();
        return day === 0 || day === 6; // Sunday = 0, Saturday = 6
    }
}

export function getHoursUntilNextWorkday(timezone: string, blackoutEndHour: number = 8): number {
    try {
        const now = new Date();
        const target = new Date(now);
        for (let i = 1; i <= 72; i++) {
            target.setTime(now.getTime() + i * 60 * 60 * 1000);
            const dayStr = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                weekday: 'long'
            }).format(target);
            const hourStr = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour: 'numeric',
                hour12: false
            }).format(target);
            const hour = parseInt(hourStr, 10);
            
            if (dayStr !== 'Saturday' && dayStr !== 'Sunday' && hour >= blackoutEndHour && hour < 17) {
                return i;
            }
        }
        return 24; // fallback
    } catch {
        return 24;
    }
}

/**
 * Calculate performance score based on open rate and reply rate
 * Formula: (openRate * 0.3 + replyRate * 0.7) * 100
 * Returns a score between 0-100
 */
export function calculatePerformanceScore(openRate: number, replyRate: number): number {
    // Weighted formula: reply rate is more important than open rate
    const score = (openRate * 0.3 + replyRate * 0.7) * 100;
    return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Get performance score color based on score value
 */
export function getPerformanceScoreColor(score: number): { bg: string; text: string; border: string } {
    if (score < 30) {
        return {
            bg: 'bg-rose-500/10',
            text: 'text-rose-600 dark:text-rose-400',
            border: 'border-rose-500/20'
        };
    } else if (score < 70) {
        return {
            bg: 'bg-amber-500/10',
            text: 'text-amber-600 dark:text-amber-400',
            border: 'border-amber-500/20'
        };
    } else {
        return {
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-500/20'
        };
    }
}
