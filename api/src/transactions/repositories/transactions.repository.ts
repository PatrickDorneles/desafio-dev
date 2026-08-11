import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, sum } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
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
 * Dual-driver: better-sqlite3 is synchronous, libsql (Turso) is async — so
 * every method is async and awaits Drizzle calls uniformly (awaiting a sync
 * better-sqlite3 result is a no-op at runtime). `findFirst`/`.get()` return
 * `undefined` when absent — handled explicitly.
 * Every query filters by `userId` (SC-001) — never by request data.
 */
@Injectable()
export class TransactionsRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: BetterSQLite3Database | LibSQLDatabase,
  ) {}

  /**
   * FR-004/FR-018/ADR-0007: own transactions only, stable order
   * `date DESC, createdAt DESC, id DESC` (id is the final tiebreaker so a row
   * never appears twice or vanishes between pages), sliced by limit/offset.
   */
  async findAllByUserId(
    userId: string,
    options: { limit: number; offset: number },
  ): Promise<TransactionRow[]> {
    return await this.db
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

  /** ADR-0007: total own transactions. */
  async countByUserId(userId: string): Promise<number> {
    // Narrow cast to the async member: the `select(fields)` overload does not
    // resolve on the union type; both drivers are awaited uniformly anyway.
    return (
      (
        await (this.db as LibSQLDatabase)
          .select({ count: count() })
          .from(transactions)
          .where(eq(transactions.userId, userId))
          .get()
      )?.count ?? 0
    );
  }

  /** FR-005: scoped to the owner — returns `undefined` for other users' rows. */
  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<TransactionRow | undefined> {
    return await this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .get();
  }

  async create(data: CreateTransactionData): Promise<TransactionRow> {
    const now = Date.now();
    return await this.db
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

  async update(
    id: string,
    userId: string,
    data: UpdateTransactionData,
  ): Promise<TransactionRow | undefined> {
    return await this.db
      .update(transactions)
      .set(data)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning()
      .get();
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return deleted.length > 0;
  }

  /** FR-008: total cents for one type, scoped to the owner. Empty → 0. */
  async sumByType(userId: string, type: TransactionType): Promise<number> {
    // Narrow cast to the async member: the `select(fields)` overload does not
    // resolve on the union type; both drivers are awaited uniformly anyway.
    const result = await (this.db as LibSQLDatabase)
      .select({ total: sum(transactions.amountCents) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, type)))
      .get();
    const total = result?.total;
    return total === null || total === undefined ? 0 : Number(total);
  }
}
