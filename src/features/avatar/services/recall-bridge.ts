// Intentional abstraction boundary: the avatar feature needs a subset of the
// Recall.ai client owned by the meetings feature. Rather than letting many
// avatar files import from `@/features/meetings/services/recall` directly
// (which is a cross-feature layering violation), all avatar consumers go
// through this bridge. If we ever swap the underlying bot provider, only
// this file changes.

export { createBot, deleteBot, stopBot, startWebpageOutput } from '@/features/meetings/services/recall'
