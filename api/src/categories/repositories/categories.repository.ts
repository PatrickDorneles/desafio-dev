import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import { DRIZZLE } from '../../common/constants/database.constants';
import { categories } from '../entities/category.entity';
import {
  CategoryRow,
  CreateCategoryData,
  UpdateCategoryData,
} from '../types/category.types';

/**
 * Only layer that touches Drizzle for the `categories` table (ADR-0003).
 * Dual-driver: better-sqlite3 is synchronous, libsql (Turso) is async — so
 * every method is async and awaits Drizzle calls uniformly (awaiting a sync
 * better-sqlite3 result is a no-op at runtime). `findFirst`/`.get()` return
 * `undefined` when absent — handled explicitly.
 * Every query filters by `userId` (SC-001) — never by request data.
 */
@Injectable()
export class CategoriesRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: BetterSQLite3Database | LibSQLDatabase,
  ) {}

  /** FR-003: own categories only, ordered by name case-insensitively. */
  async findAllByUserId(userId: string): Promise<CategoryRow[]> {
    return await this.db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(sql`lower(${categories.name}) asc`)
      .all();
  }

  /** FR-004: scoped to the owner — returns `undefined` for other users' rows. */
  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<CategoryRow | undefined> {
    return await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .get();
  }

  /** FR-003 (Spec 003): cheap existence check used by the transactions service. */
  async existsByIdAndUserId(id: string, userId: string): Promise<boolean> {
    // Narrow cast to the async member: the `select(fields)` overload does not
    // resolve on the union type; both drivers are awaited uniformly anyway.
    return (
      (await (this.db as LibSQLDatabase)
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, userId)))
        .get()) !== undefined
    );
  }

  /** Case-insensitive duplicate pre-check (FR-002). Parameterized — no string concat. */
  async findByNameForUser(
    userId: string,
    name: string,
  ): Promise<CategoryRow | undefined> {
    return await this.db
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

  async create(data: CreateCategoryData): Promise<CategoryRow> {
    const now = Date.now();
    return await this.db
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

  async update(
    id: string,
    userId: string,
    data: UpdateCategoryData,
  ): Promise<CategoryRow | undefined> {
    return await this.db
      .update(categories)
      .set(data)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning()
      .get();
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();
    return deleted.length > 0;
  }
}
