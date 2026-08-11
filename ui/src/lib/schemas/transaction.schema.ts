// espelha api/src/transactions/dto/create-transaction.dto.ts, update-transaction.dto.ts,
// transaction-response.dto.ts, transaction-page.dto.ts e api/src/transactions/types/transaction.types.ts
import { z } from 'zod';
import { paginationMetaSchema } from './pagination.schema';

/** ADR-0006: domain enum as an `as const` object + derived union. */
export const TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

const transactionTypeSchema = z.enum(
  Object.values(TransactionType) as [TransactionType, ...TransactionType[]],
);

/**
 * `YYYY-MM-DD` with REAL calendar validation: the regex only checks shape,
 * then a `new Date(...)` round-trip rejects impossible dates such as
 * `2026-02-31`. Mirrors the API's `transactionDateSchema`.
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

export const transactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  categoryId: z.string().nullable(),
  type: transactionTypeSchema,
  amountCents: z.number().int().positive(),
  description: z.string().trim().min(1).max(200),
  date: transactionDateSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amountCents: z.number().int().positive(),
  description: z.string().trim().min(1).max(200),
  date: transactionDateSchema.default(() => todayIso()),
  categoryId: z.uuid().optional(),
});

export const updateTransactionSchema = z
  .object({
    type: transactionTypeSchema.optional(),
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

/** ADR-0007: paginated listing response — `data` + `meta`. */
export const transactionPageSchema = z.object({
  data: z.array(transactionSchema),
  meta: paginationMetaSchema,
});

export type Transaction = z.infer<typeof transactionSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionPage = z.infer<typeof transactionPageSchema>;

/** Local `YYYY-MM-DD` — mirrors api/src/common/utils/date.util.ts `todayIso`. */
function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}