import { randomUUID } from 'node:crypto';
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { users } from '../../users/entities/users.entity';

/**
 * `categories` table — Spec 002, §8.
 * Columns are snake_case in the DB; `createdAt`/`updatedAt` are unix ms integers
 * set explicitly in code (Date.now()) so services control them.
 * Uniqueness of `name` per user is enforced by the DB (FR-013); the
 * case-insensitive duplicate check happens in the service (FR-002).
 * `userId` cascades on user deletion (FR-008). Transactions reference this
 * table via a nullable `categoryId` with `ON DELETE SET NULL` (Fase 3).
 */
export const categories = sqliteTable(
  'categories',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color'),
    icon: text('icon'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('categories_user_id_name_unique').on(table.userId, table.name),
  ],
);
