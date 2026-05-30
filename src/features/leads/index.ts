/**
 * Leads Feature - Public API
 *
 * Only export what's needed by other features.
 * Internal implementation details should not be exported.
 */

// Components
export { AddLeadModal } from './components/add-lead-modal'
export { EditLeadModal } from './components/edit-lead-modal'
export { ImportLeadsModal } from './components/import-leads-modal'
export { LeadDetailsModal } from './components/lead-details-modal'
export { LeadIntelligenceBadges } from './components/lead-intelligence-badges'
export { LeadScore } from './components/lead-score'

// Server actions
export * from './server/actions'
export * from './server/b2b'
export * from './server/scraper'

// Services (client-safe utilities)
export * from './services/scoring'
export * from './services/intelligence'

// Server-only services (for API routes and server actions)
// ⚠️ NOT exported in the barrel to prevent client bundling issues. Import directly:
// import { processNurtureFollowUps } from '@/features/leads/services/nurture'

// Types
export type * from './types'

// Schemas
export * from './schemas'

// Constants
export * from './constants'
