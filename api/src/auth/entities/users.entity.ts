import { randomUUID } from 'node:crypto';
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/**
 * `users` table — Spec 001, §8.
 * Columns are snake_case in the DB; `createdAt`/`updatedAt` are unix ms integers
 * set explicitly in code (Date.now()) so services control them.
 * Email uniqueness is enforced by the DB (FR-011); case-normalization happens in the DTO.
 */
export const users = sqliteTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: text('name').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
);

export type UserRow = typeof users.$inferSelect;
