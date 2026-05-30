/**
 * Billing Feature - Type Definitions
 */

export type SubscriptionPlan = 'free' | 'starter' | 'growth' | 'pro' | 'business'

export type SubscriptionStatus = {
    plan: SubscriptionPlan
    status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
}

export type InvoiceItem = {
    id: string
    status: string
    date: string
    amount: string
    currency: string
    planName: string
    receiptUrl: string | null
}
