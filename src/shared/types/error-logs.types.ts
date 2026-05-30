// ============================================
// ERROR LOGS TYPES
// ============================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ErrorType = 'client_error' | 'server_error' | 'api_error' | 'component_error';

export interface ErrorLog {
    id: string;
    tenant_id?: string;
    user_id?: string;
    error_type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    stack_trace?: string;
    url?: string;
    user_agent?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
}

export interface LogErrorParams {
    error_type: ErrorType;
    severity?: ErrorSeverity;
    message: string;
    stack_trace?: string;
    url?: string;
    metadata?: Record<string, unknown>;
}

export interface ErrorLogFilters {
    error_type?: ErrorType;
    severity?: ErrorSeverity;
    tenant_id?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    url?: string;
}
