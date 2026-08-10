import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { todayIso } from '../../common/utils/date.util';

/**
 * `YYYY-MM-DD` with REAL calendar validation (FR-013): the regex only checks
 * shape, then a `new Date(...)` round-trip rejects impossible dates such as
 * `2026-02-31`. Reused by the update DTO.
 */
export const transactionDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)')
  .superRefine((value, ctx) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date',
      });
    }
  });

/**
 * POST /transactions — Spec 003, §9.
 * `type`: INCOME/EXPENSE only (FR-017).
 * `amountCents`: positive integer, BRL cents (FR-002 — rejects 0, negatives, decimals).
 * `description`: trim + 1–200 (FR-014 — empty/whitespace-only rejected after trim).
 * `date`: optional, defaults to the server's local date (FR-009).
 * `categoryId`: optional uuid; ownership is validated in the service (FR-003).
 */
export const createTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amountCents: z.number().int().positive(),
  description: z.string().trim().min(1).max(200),
  date: transactionDateSchema.default(() => todayIso()),
  categoryId: z.uuid().optional(),
});

export class CreateTransactionDto extends createZodDto(
  createTransactionSchema,
) {}
