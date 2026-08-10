import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { DRIZZLE } from '../../common/constants/database.constants';
import { users, UserRow } from '../entities/users.entity';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

/**
 * Only layer that touches Drizzle for the `users` table (ADR-0003).
 * better-sqlite3 is synchronous, so these methods are intentionally NOT async;
 * `findFirst`/`.get()` return `undefined` when absent — handled explicitly.
 */
@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: BetterSQLite3Database) {}

  findByEmail(email: string): UserRow | undefined {
    return this.db.select().from(users).where(eq(users.email, email)).get();
  }

  findById(id: string): UserRow | undefined {
    return this.db.select().from(users).where(eq(users.id, id)).get();
  }

  create(data: CreateUserData): UserRow {
    const now = Date.now();
    return this.db
      .insert(users)
      .values({ ...data, createdAt: now, updatedAt: now })
      .returning()
      .get();
  }
}
