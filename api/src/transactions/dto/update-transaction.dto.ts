import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { transactionDateSchema } from './create-transaction.dto';

/**
 * PATCH /transactions/:id — Spec 003, §9.
 * Same field validators as create, all optional. FR-015: at least one field
 * must be present (empty body → 400 with a `string[]` message via the pipe).
 * `categoryId` accepts an explicit `null` to REMOVE the link (FR-006/CA-006);
 * the service distinguishes `null` (present) from absent via key presence.
 */
export const updateTransactionSchema = z
  .object({
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
    amountCents: z.number().int().positive().optional(),
    description: z.string().trim().min(1).max(200).optional(),
    date: transactionDateSchema.optional(),
    categoryId: z.uuid().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided',
      });
    }
  });

export class UpdateTransactionDto extends createZodDto(
  updateTransactionSchema,
) {}
