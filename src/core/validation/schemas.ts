import { z } from 'zod'

/**
 * Common validation schemas for API requests
 */

export const UUIDSchema = z.string().uuid()
export const EmailSchema = z.string().email()
export const URLSchema = z.string().url()
export const SlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const SortOrderSchema = z.enum(['asc', 'desc']).default('desc')

export const BaseQuerySchema = z.object({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: SortOrderSchema,
})

export const IdParamSchema = z.object({
  id: UUIDSchema,
})

/**
 * Common response metadata
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  pages: z.number().int().positive(),
})

export type Pagination = z.infer<typeof PaginationSchema>
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>
