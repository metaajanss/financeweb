/**
 * Sequences Feature - Public API
 *
 * Only export what's needed by other features.
 * Internal implementation details should not be exported.
 */

// Components
export * from './components/flow-builder'

// Server actions
export * from './server/actions'
export * from './server/ai-actions'
export * from './server/analytics'
export * from './server/queue'
export * from './server/settings'

// Services (client-safe utilities)
export * from './services/utils'
export * from './services/templates'

// NOTE: processor.ts and enroll.ts are server-only (use Node.js admin client).
// Import them directly in API routes:
//   import { processPendingSteps } from '@/features/sequences/services/processor'
//   import { enrollLead } from '@/features/sequences/services/enroll'

// Constants
export * from './constants'
