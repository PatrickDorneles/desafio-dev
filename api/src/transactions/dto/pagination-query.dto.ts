import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Pagination query params for GET /transactions (ADR-0007).
 * Fastify delivers query params as strings → `z.coerce.number()` is required.
 * `page`: 1-based, default 1. `pageSize`: default 10, capped at 100 (above → 400).
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export class PaginationQueryDto extends createZodDto(paginationQuerySchema) {}
