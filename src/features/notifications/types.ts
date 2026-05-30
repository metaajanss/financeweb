/**
 * Notifications Feature - Type Definitions
 */

export type Notification = {
    id: string
    user_id: string
    account_id: string | null
    title: string
    message: string | null
    type: 'info' | 'success' | 'warning' | 'error'
    read: boolean
    link: string | null
    created_at: string
}
