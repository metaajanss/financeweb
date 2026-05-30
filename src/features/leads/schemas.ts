import { z } from 'zod'
import { LEAD_STATUSES, LEAD_SOURCES } from './constants'

/**
 * Lead validation schemas
 */

export const CreateLeadSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(LEAD_STATUSES).optional().default('new'),
  source: z.enum(LEAD_SOURCES).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const UpdateLeadSchema = CreateLeadSchema.partial()

export const SearchLeadsSchema = z.object({
  query: z.string().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  maxScore: z.number().int().min(0).max(100).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

export const BulkImportLeadsSchema = z.object({
  leads: z.array(CreateLeadSchema).max(1000),
  source: z.enum(LEAD_SOURCES),
})

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>
export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>
export type SearchLeadsInput = z.infer<typeof SearchLeadsSchema>
export type BulkImportLeadsInput = z.infer<typeof BulkImportLeadsSchema>
