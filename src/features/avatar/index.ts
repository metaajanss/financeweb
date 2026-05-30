/**
 * Avatar Feature - Public API
 *
 * Only export what's needed by other features.
 *
 * SERVER-ONLY modules (pdfjs/canvas, node EventEmitter, server actions) are
 * intentionally NOT re-exported here. Importing them from a client component
 * would break the webpack bundle. If you need them, import them directly via
 * their deep path:
 *   import { renderPdfPages } from '@/features/avatar/services/presentation'
 *   import { presentationBus }  from '@/features/avatar/services/event-bus'
 *   import { enableAvatarForMeeting } from '@/features/avatar/server/actions'
 */

// Client-safe re-exports
export { default as PresentationEditor } from './components/presentation-editor'
export * from './services/anam'
export * from './services/system-prompt'
export * from '@/core/auth/avatar-token'
export * from './constants'
