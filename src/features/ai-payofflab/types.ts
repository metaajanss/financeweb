/**
 * Payoff Lab AI Feature - Type Definitions
 */

export interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    created_at: string
}

export interface Session {
    id: string
    title: string
    created_at: string
}
