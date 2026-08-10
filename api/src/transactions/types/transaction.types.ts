import { transactions } from '../entities/transaction.entity';

export type TransactionRow = typeof transactions.$inferSelect;

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface CreateTransactionData {
  userId: string;
  categoryId: string | null;
  type: TransactionType;
  amountCents: number;
  description: string;
  date: string;
}

export interface UpdateTransactionData {
  categoryId?: string | null;
  type?: TransactionType;
  amountCents?: number;
  description?: string;
  date?: string;
  updatedAt: number;
}

export interface TransactionSummary {
  totalIncomeCents: number;
  totalExpenseCents: number;
  balanceCents: number;
}
