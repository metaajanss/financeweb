/**
 * Conversations Feature - Public API
 *
 * Only export what's needed by other features.
 * Internal implementation details should not be exported.
 */

// Server actions
export * from './server/actions'

// Services (client-safe utilities)
export { determineIntent, type MessageIntent } from './services/intent'
export { generateCoreResponse, generateResponse, type AIContext, type FAQItem, type MeetingResult } from './services/response-generator'

// NOT EXPORTED TO PREVENT WEBPACK BUILD LEAKS INTO CLIENT COMPONENTS:
// processMessage contains Node.js server dependencies (fs, net, child_process via google-auth)
// If you need it in API routes or Server Actions, import directly from:
// import { processMessage } from '@/features/conversations/services/message-processor'

// Constants
export * from './constants'
