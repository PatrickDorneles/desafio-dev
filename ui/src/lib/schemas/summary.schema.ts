// espelha api/src/transactions/dto/transaction-summary.dto.ts
import { z } from 'zod';

export const transactionSummarySchema = z.object({
  totalIncomeCents: z.number(),
  totalExpenseCents: z.number(),
  balanceCents: z.number(),
});

export type TransactionSummary = z.infer<typeof transactionSummarySchema>;