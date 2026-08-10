import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * GET /transactions/summary response — Spec 003, §9 (FR-008/CA-007/CA-008).
 * `balanceCents` is always `totalIncomeCents - totalExpenseCents` (SC-002).
 */
export const transactionSummarySchema = z.object({
  totalIncomeCents: z.number(),
  totalExpenseCents: z.number(),
  balanceCents: z.number(),
});

export class TransactionSummaryDto extends createZodDto(
  transactionSummarySchema,
) {}
