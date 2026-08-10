---
name: drizzle-sqlite-migrations
description: Use when working with Drizzle ORM and SQLite in the api/ package — creating or altering table schemas, generating and applying migrations with drizzle-kit, or fixing relation/query issues. Trigger keywords: drizzle, drizzle-kit, sqlite, table, schema, migration, generate, push, relations.
---

# Drizzle ORM + SQLite (api)

Project conventions for schema definitions and migrations in `api/`.

## Table definitions

- Import from `drizzle-orm/sqlite-core` — NOT `pg-core` or `mysql-core`:

  ```ts
  import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
  ```

- Primary keys: `text('id').primaryKey()` (UUID) or integer `autoincrement` — pick one per table and stay consistent.
- Timestamps: integer (unix ms) or text ISO — pick one convention for the whole project; use `.$defaultFn(() => Date.now())` for `created_at`.
- Foreign keys: `.references(() => otherTable, { onDelete: 'cascade' })` on the FK column.
- SQLite has **no enums** — use `text` columns + Zod validation (`z.enum`, see the `zod-shared-schemas` skill).

## Relations

- `.references()` defines the FK constraint only. For the query API, also declare `relations()` on **both** tables in the same schema file:

  ```ts
  export const transactionRelations = relations(transactions, ({ one, many }) => ({
    category: one(categories, {
      fields: [transactions.categoryId],
      references: [categories.id],
    }),
    items: many(transactionItems),
  }));
  ```

## drizzle-kit workflow

```bash
# 1. edit the schema files under src/
# 2. generate a migration
npx drizzle-kit generate
# 3. review the generated SQL in the migrations out-dir
# 4. apply
npx drizzle-kit migrate
# dev-only shortcut (no migration file — not for the final submission):
npx drizzle-kit push
# verify config/schema:
npx drizzle-kit check
```

- Migration files are **generated output — never hand-edit**; re-run `generate` after schema edits.
- `drizzle.config.ts` must use dialect `sqlite`, the correct db url, and out dir.

## Common pitfalls

- `findFirst()` returns `undefined` when nothing matches — handle the absence explicitly.
- Prefer typed Drizzle builders over `.all()`/`.execute()` raw fragments.
- After schema changes, run the api unit/e2e suite to catch type drift.
