import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { DRIZZLE } from '../../common/constants/database.constants';
import { categories } from '../entities/category.entity';
import {
  CategoryRow,
  CreateCategoryData,
  UpdateCategoryData,
} from '../types/category.types';

/**
 * Only layer that touches Drizzle for the `categories` table (ADR-0003).
 * better-sqlite3 is synchronous, so these methods are intentionally NOT async;
 * `findFirst`/`.get()` return `undefined` when absent — handled explicitly.
 * Every query filters by `userId` (SC-001) — never by request data.
 */
@Injectable()
export class CategoriesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: BetterSQLite3Database) {}

  /** FR-003: own categories only, ordered by name case-insensitively. */
  findAllByUserId(userId: string): CategoryRow[] {
    return this.db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(sql`lower(${categories.name}) asc`)
      .all();
  }

  /** FR-004: scoped to the owner — returns `undefined` for other users' rows. */
  findByIdAndUserId(id: string, userId: string): CategoryRow | undefined {
    return this.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .get();
  }

  /** FR-003 (Spec 003): cheap existence check used by the transactions service. */
  existsByIdAndUserId(id: string, userId: string): boolean {
    return (
      this.db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, userId)))
        .get() !== undefined
    );
  }

  /** Case-insensitive duplicate pre-check (FR-002). Parameterized — no string concat. */
  findByNameForUser(userId: string, name: string): CategoryRow | undefined {
    return this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          sql`lower(${categories.name}) = lower(${name})`,
        ),
      )
      .get();
  }

  create(data: CreateCategoryData): CategoryRow {
    const now = Date.now();
    return this.db
      .insert(categories)
      .values({
        userId: data.userId,
        name: data.name,
        color: data.color ?? null,
        icon: data.icon ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
  }

  update(
    id: string,
    userId: string,
    data: UpdateCategoryData,
  ): CategoryRow | undefined {
    return this.db
      .update(categories)
      .set(data)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning()
      .get();
  }

  delete(id: string, userId: string): boolean {
    const result = this.db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .run();
    return result.changes > 0;
  }
}
