import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, sum } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { DRIZZLE } from '../../common/constants/database.constants';
import { transactions } from '../entities/transaction.entity';
import {
  CreateTransactionData,
  TransactionRow,
  TransactionType,
  UpdateTransactionData,
} from '../types/transaction.types';

/**
 * Only layer that touches Drizzle for the `transactions` table (ADR-0003).
 * better-sqlite3 is synchronous, so these methods are intentionally NOT async;
 * `findFirst`/`.get()` return `undefined` when absent — handled explicitly.
 * Every query filters by `userId` (SC-001) — never by request data.
 */
@Injectable()
export class TransactionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: BetterSQLite3Database) {}

  /**
   * FR-004/FR-018/ADR-0007: own transactions only, stable order
   * `date DESC, createdAt DESC, id DESC` (id is the final tiebreaker so a row
   * never appears twice or vanishes between pages), sliced by limit/offset.
   */
  findAllByUserId(
    userId: string,
    options: { limit: number; offset: number },
  ): TransactionRow[] {
    return this.db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(
        desc(transactions.date),
        desc(transactions.createdAt),
        desc(transactions.id),
      )
      .limit(options.limit)
      .offset(options.offset)
      .all();
  }

  /** ADR-0007: total own transactions (sync — not db.$count, which is async). */
  countByUserId(userId: string): number {
    return (
      this.db
        .select({ count: count() })
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .get()?.count ?? 0
    );
  }

  /** FR-005: scoped to the owner — returns `undefined` for other users' rows. */
  findByIdAndUserId(id: string, userId: string): TransactionRow | undefined {
    return this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .get();
  }

  create(data: CreateTransactionData): TransactionRow {
    const now = Date.now();
    return this.db
      .insert(transactions)
      .values({
        userId: data.userId,
        categoryId: data.categoryId,
        type: data.type,
        amountCents: data.amountCents,
        description: data.description,
        date: data.date,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
  }

  update(
    id: string,
    userId: string,
    data: UpdateTransactionData,
  ): TransactionRow | undefined {
    return this.db
      .update(transactions)
      .set(data)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning()
      .get();
  }

  delete(id: string, userId: string): boolean {
    const result = this.db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .run();
    return result.changes > 0;
  }

  /** FR-008: total cents for one type, scoped to the owner. Empty → 0. */
  sumByType(userId: string, type: TransactionType): number {
    const result = this.db
      .select({ total: sum(transactions.amountCents) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, type)))
      .get();
    const total = result?.total;
    return total === null || total === undefined ? 0 : Number(total);
  }
}
