import { randomUUID } from 'node:crypto';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from '../../users/entities/users.entity';
import { categories } from '../../categories/entities/category.entity';

/**
 * `transactions` table — Spec 003, §8.
 * Columns are snake_case in the DB; `createdAt`/`updatedAt` are unix ms integers
 * set explicitly in code (Date.now()) so services control them.
 * `type` is a plain text column (`INCOME`/`EXPENSE`) — SQLite has no enums, so
 * validation happens via Zod (FR-017).
 * `userId` cascades on user deletion (FR-011); `categoryId` is nullable and
 * SET NULL on category deletion (FR-010/SC-003).
 * The `(userId, date)` index serves the owner-scoped, date-ordered listing.
 */
export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    type: text('type').notNull(),
    amountCents: integer('amount_cents').notNull(),
    description: text('description').notNull(),
    date: text('date').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('transactions_user_id_date_idx').on(table.userId, table.date),
  ],
);
