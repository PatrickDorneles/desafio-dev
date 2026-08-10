import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Public transaction response shape — Spec 003, §9.
 * DB snake_case columns are mapped to camelCase by Drizzle's property names
 * (`userId`, `categoryId`, `createdAt`, `updatedAt`), so rows already match
 * this shape. Used for Swagger response docs only; actual responses are the
 * row objects.
 */
export const transactionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  categoryId: z.string().nullable(),
  type: z.enum(['INCOME', 'EXPENSE']),
  amountCents: z.number(),
  description: z.string(),
  date: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export class TransactionResponseDto extends createZodDto(
  transactionResponseSchema,
) {}
