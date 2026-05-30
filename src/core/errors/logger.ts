// ============================================
// ERROR LOGGER UTILITY
// ============================================

import { createClient } from '@/core/db/client';
import type { LogErrorParams, ErrorSeverity } from '@/shared/types/error-logs.types';
import type { Database } from '@/shared/types';

// Rate limiting to prevent log flooding
const errorCache = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_ERRORS_PER_WINDOW = 10;

/**
 * Main function to log errors to Supabase
 */
export async function logError(params: LogErrorParams): Promise<void> {
    try {
        // Rate limiting check
        const cacheKey = `${params.error_type}:${params.message}`;
        const now = Date.now();
        const lastLogged = errorCache.get(cacheKey);

        if (lastLogged && now - lastLogged < RATE_LIMIT_WINDOW) {
            // Skip logging if same error was logged recently
            return;
        }

        errorCache.set(cacheKey, now);

        // Clean up old cache entries
        if (errorCache.size > MAX_ERRORS_PER_WINDOW) {
            const entries = Array.from(errorCache.entries());
            const oldestKey = entries[0]?.[0];
            if (oldestKey) {
                errorCache.delete(oldestKey);
            }
        }

        const supabase = createClient();

        // Get current user if authenticated - with safety
        const userRes = await supabase.auth.getUser();
        const user = userRes.data?.user || null;

        // Get tenant_id from profiles if available
        let tenant_id: string | null = null;
        if (user) {
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('account_id')
                .eq('id', user.id)
                .single();

            tenant_id = userProfile?.account_id || null;
        }

        // Auto-detect severity if not provided
        const severity = params.severity || detectSeverity(params.message, params.stack_trace);

        // Prepare error log entry
        const errorLog = {
            tenant_id,
            user_id: user?.id || null,
            error_type: params.error_type,
            severity,
            message: params.message,
            stack_trace: params.stack_trace || null,
            url: params.url || (typeof window !== 'undefined' ? window.location.href : null),
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            metadata: params.metadata || {},
        };

        // Insert error log
        const { error } = await supabase
            .from('error_logs')
            .insert(errorLog as unknown as Database['public']['Tables']['error_logs']['Insert']);

        if (error) {
            console.error('Failed to log error to database:', error);
        }
    } catch (err) {
        // Silently fail to prevent infinite error loops
        console.error('Error in logError function:', err);
    }
}

/**
 * Log client-side errors
 */
export function logClientError(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>
): void {
    logError({
        error_type: 'client_error',
        message,
        stack_trace: error?.stack,
        metadata,
    });
}

/**
 * Log server-side errors
 */
export function logServerError(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>
): void {
    logError({
        error_type: 'server_error',
        message,
        stack_trace: error?.stack,
        metadata,
    });
}

/**
 * Log API errors
 */
export function logApiError(
    message: string,
    statusCode?: number,
    endpoint?: string,
    metadata?: Record<string, unknown>
): void {
    logError({
        error_type: 'api_error',
        message,
        metadata: {
            ...metadata,
            statusCode,
            endpoint,
        },
    });
}

/**
 * Capture and log exceptions
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
    logError({
        error_type: 'client_error',
        message: error.message,
        stack_trace: error.stack,
        metadata: context,
    });
}

/**
 * Auto-detect error severity based on message and stack trace
 */
function detectSeverity(message: string, _stackTrace?: string): ErrorSeverity {
    const lowerMessage = message.toLowerCase();

    // Critical keywords
    if (
        lowerMessage.includes('fatal') ||
        lowerMessage.includes('crash') ||
        lowerMessage.includes('security') ||
        lowerMessage.includes('auth') ||
        lowerMessage.includes('payment')
    ) {
        return 'critical';
    }

    // High severity keywords
    if (
        lowerMessage.includes('database') ||
        lowerMessage.includes('connection') ||
        lowerMessage.includes('timeout') ||
        lowerMessage.includes('failed to')
    ) {
        return 'high';
    }

    // Medium severity keywords
    if (
        lowerMessage.includes('warning') ||
        lowerMessage.includes('deprecated') ||
        lowerMessage.includes('invalid')
    ) {
        return 'medium';
    }

    // Default to low
    return 'low';
}

/**
 * Initialize global error handlers (client-side only)
 */
export function initializeErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
        logClientError(
            event.message,
            event.error,
            {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
            }
        );
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        logClientError(
            `Unhandled Promise Rejection: ${event.reason}`,
            event.reason instanceof Error ? event.reason : undefined,
            {
                promise: 'unhandled_rejection',
            }
        );
    });
}
