import { PaginationMeta } from '../../common/types/pagination';
import { transactions } from '../entities/transaction.entity';

export type TransactionRow = typeof transactions.$inferSelect;

/**
 * ADR-0006: domain enum as an `as const` object + derived union — NOT a TS
 * native `enum`. Structural typing keeps Zod-validated strings and the SQLite
 * text column directly assignable (no casts at boundaries); the const object
 * is the single runtime vocabulary (DTOs, service, specs reference it).
 */
export const TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

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

/** ADR-0007: paginated listing response — `data` + `meta`. */
export interface TransactionPage {
  data: TransactionRow[];
  meta: PaginationMeta;
}
