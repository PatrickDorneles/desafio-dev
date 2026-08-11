import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import { DRIZZLE } from '../../common/constants/database.constants';
import { users } from '../entities/users.entity';
import { CreateUserData, UserRow } from '../types/user.types';

/**
 * Only layer that touches Drizzle for the `users` table (ADR-0003).
 * Dual-driver: better-sqlite3 is synchronous, libsql (Turso) is async — so
 * every method is async and awaits Drizzle calls uniformly (awaiting a sync
 * better-sqlite3 result is a no-op at runtime). `findFirst`/`.get()` return
 * `undefined` when absent — handled explicitly.
 */
@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: BetterSQLite3Database | LibSQLDatabase,
  ) {}

  async findByEmail(email: string): Promise<UserRow | undefined> {
    return await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();
  }

  async findById(id: string): Promise<UserRow | undefined> {
    return await this.db.select().from(users).where(eq(users.id, id)).get();
  }

  async create(data: CreateUserData): Promise<UserRow> {
    const now = Date.now();
    return await this.db
      .insert(users)
      .values({ ...data, createdAt: now, updatedAt: now })
      .returning()
      .get();
  }
}
