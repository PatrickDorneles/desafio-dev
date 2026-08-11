import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { transactionResponseSchema } from './transaction-response.dto';

/**
 * GET /transactions paginated response — ADR-0007.
 * `data` holds the current page of rows; `meta` mirrors the global
 * `PaginationMeta` shape (kept inline here — zod schemas live in dto/,
 * the TS type in common/types/).
 */
export const transactionPageSchema = z.object({
  data: z.array(transactionResponseSchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export class TransactionPageDto extends createZodDto(transactionPageSchema) {}
