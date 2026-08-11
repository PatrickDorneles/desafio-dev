import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
// better-sqlite3 is CommonJS (`module.exports = Database`); a default import
// would compile to `require('better-sqlite3').default` (undefined) under
// ts-jest without esModuleInterop, so the require form is required here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Database = require('better-sqlite3');
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { users } from '../../users/entities/users.entity';
import { categories } from '../../categories/entities/category.entity';
import { DRIZZLE } from '../../common/constants/database.constants';
import { transactions } from '../entities/transaction.entity';
import { TransactionRow } from '../types/transaction.types';
import { TransactionsRepository } from './transactions.repository';

describe('TransactionsRepository', () => {
  let repository: TransactionsRepository;
  let db: BetterSQLite3Database;

  beforeAll(() => {
    const sqlite = new Database(':memory:');
    db = drizzle(sqlite);
    // Reuse the same migrations folder the database module auto-applies at boot
    // (users + categories + transactions tables all exist now).
    migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [TransactionsRepository, { provide: DRIZZLE, useValue: db }],
    }).compile();

    repository = moduleRef.get(TransactionsRepository);
  });

  afterEach(() => {
    db.delete(transactions).run();
    db.delete(categories).run();
    db.delete(users).run();
  });

  /** FK is enforced by better-sqlite3, so a user row must exist first. */
  function createUser(
    name = 'Maria Silva',
    email = 'maria@example.com',
  ): string {
    const now = Date.now();
    const row = db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: 'hash',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return row.id;
  }

  /** FK is enforced by better-sqlite3, so a category row must exist first. */
  function createCategory(userId: string, name = 'Alimentação'): string {
    const now = Date.now();
    const row = db
      .insert(categories)
      .values({
        userId,
        name,
        color: null,
        icon: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return row.id;
  }

  /** Unpaginated convenience view for tests that don't exercise slicing. */
  async function findAll(userId: string): Promise<TransactionRow[]> {
    return await repository.findAllByUserId(userId, { limit: 100, offset: 0 });
  }

  describe('create', () => {
    it('inserts a row with timestamps and returns the full row', async () => {
      const userId = createUser();
      const categoryId = createCategory(userId);

      const row = await repository.create({
        userId,
        categoryId,
        type: 'EXPENSE',
        amountCents: 5000,
        description: 'Almoço',
        date: '2026-08-10',
      });

      expect(row.id).toBeDefined();
      expect(row.userId).toBe(userId);
      expect(row.categoryId).toBe(categoryId);
      expect(row.type).toBe('EXPENSE');
      expect(row.amountCents).toBe(5000);
      expect(row.description).toBe('Almoço');
      expect(row.date).toBe('2026-08-10');
      expect(typeof row.createdAt).toBe('number');
      expect(typeof row.updatedAt).toBe('number');
    });

    it('stores null for an omitted categoryId', async () => {
      const userId = createUser();

      const row = await repository.create({
        userId,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      expect(row.categoryId).toBeNull();
    });
  });

  describe('findAllByUserId', () => {
    it('orders by date DESC, then createdAt DESC (FR-004/FR-018)', async () => {
      const userId = createUser();
      const now = Date.now();
      const base = {
        userId,
        type: 'INCOME' as const,
        amountCents: 1000,
        description: 'x',
        categoryId: null as string | null,
      };
      // Insert directly to control createdAt for the deterministic tie-break.
      db.insert(transactions)
        .values([
          { ...base, date: '2026-08-01', createdAt: now, updatedAt: now },
          { ...base, date: '2026-08-10', createdAt: now, updatedAt: now },
          { ...base, date: '2026-08-05', createdAt: now + 100, updatedAt: now },
          { ...base, date: '2026-08-05', createdAt: now + 200, updatedAt: now },
        ])
        .run();

      const rows = await findAll(userId);

      expect(rows.map((r) => r.date)).toEqual([
        '2026-08-10',
        '2026-08-05',
        '2026-08-05',
        '2026-08-01',
      ]);
      expect(rows[1].createdAt).toBe(now + 200);
      expect(rows[2].createdAt).toBe(now + 100);
    });

    it('breaks date/createdAt ties by id DESC (ADR-0007 stable order)', async () => {
      const userId = createUser();
      const now = Date.now();
      const base = {
        userId,
        type: 'INCOME' as const,
        amountCents: 1000,
        description: 'x',
        categoryId: null as string | null,
      };
      // Same date AND same createdAt → only the id tiebreaker can order them.
      const rows = db
        .insert(transactions)
        .values([
          { ...base, date: '2026-08-05', createdAt: now, updatedAt: now },
          { ...base, date: '2026-08-05', createdAt: now, updatedAt: now },
          { ...base, date: '2026-08-05', createdAt: now, updatedAt: now },
        ])
        .returning()
        .all();

      const listed = await findAll(userId);

      expect(listed.map((r) => r.id)).toEqual(
        [...rows].sort((a, b) => b.id.localeCompare(a.id)).map((r) => r.id),
      );
    });

    it('slices by limit/offset (ADR-0007)', async () => {
      const userId = createUser();
      const now = Date.now();
      const base = {
        userId,
        type: 'INCOME' as const,
        amountCents: 1000,
        description: 'x',
        categoryId: null as string | null,
      };
      db.insert(transactions)
        .values([
          { ...base, date: '2026-08-01', createdAt: now, updatedAt: now },
          { ...base, date: '2026-08-02', createdAt: now, updatedAt: now },
          { ...base, date: '2026-08-03', createdAt: now, updatedAt: now },
          { ...base, date: '2026-08-04', createdAt: now, updatedAt: now },
          { ...base, date: '2026-08-05', createdAt: now, updatedAt: now },
        ])
        .run();

      const page1 = await repository.findAllByUserId(userId, {
        limit: 2,
        offset: 0,
      });
      const page2 = await repository.findAllByUserId(userId, {
        limit: 2,
        offset: 2,
      });
      const page3 = await repository.findAllByUserId(userId, {
        limit: 2,
        offset: 4,
      });

      expect(page1.map((r) => r.date)).toEqual(['2026-08-05', '2026-08-04']);
      expect(page2.map((r) => r.date)).toEqual(['2026-08-03', '2026-08-02']);
      expect(page3.map((r) => r.date)).toEqual(['2026-08-01']);
      // No overlap between pages → no row appears twice or vanishes.
      const ids = [...page1, ...page2, ...page3].map((r) => r.id);
      expect(new Set(ids).size).toBe(5);
    });

    it("returns only the user's own transactions", async () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      await repository.create({
        userId: userA,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'a',
        date: '2026-08-01',
      });
      await repository.create({
        userId: userB,
        categoryId: null,
        type: 'INCOME',
        amountCents: 2000,
        description: 'b',
        date: '2026-08-02',
      });

      const rows = await findAll(userA);

      expect(rows).toHaveLength(1);
      expect(rows[0].description).toBe('a');
    });

    it('returns an empty array when the user has no transactions', async () => {
      const userId = createUser();
      expect(await findAll(userId)).toEqual([]);
    });
  });

  describe('countByUserId', () => {
    it('counts only the user’s own transactions (ADR-0007)', async () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      await repository.create({
        userId: userA,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'a',
        date: '2026-08-01',
      });
      await repository.create({
        userId: userA,
        categoryId: null,
        type: 'EXPENSE',
        amountCents: 500,
        description: 'b',
        date: '2026-08-02',
      });
      await repository.create({
        userId: userB,
        categoryId: null,
        type: 'INCOME',
        amountCents: 2000,
        description: 'c',
        date: '2026-08-03',
      });

      expect(await repository.countByUserId(userA)).toBe(2);
      expect(await repository.countByUserId(userB)).toBe(1);
    });

    it('returns 0 when the user has no transactions', async () => {
      const userId = createUser();
      expect(await repository.countByUserId(userId)).toBe(0);
    });
  });

  describe('findByIdAndUserId', () => {
    it('finds a transaction owned by the user', async () => {
      const userId = createUser();
      const created = await repository.create({
        userId,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      const found = await repository.findByIdAndUserId(created.id, userId);

      expect(found?.id).toBe(created.id);
      expect(found?.description).toBe('x');
    });

    it("returns undefined for another user's transaction", async () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      const created = await repository.create({
        userId: userA,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      const found = await repository.findByIdAndUserId(created.id, userB);

      expect(found).toBeUndefined();
    });

    it('returns undefined for an unknown id', async () => {
      const userId = createUser();
      expect(
        await repository.findByIdAndUserId('does-not-exist', userId),
      ).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates fields and returns the updated row', async () => {
      const userId = createUser();
      const created = await repository.create({
        userId,
        categoryId: null,
        type: 'EXPENSE',
        amountCents: 5000,
        description: 'Almoço',
        date: '2026-08-10',
      });

      const updated = await repository.update(created.id, userId, {
        amountCents: 5500,
        description: 'Jantar',
        updatedAt: 1780000000100,
      });

      expect(updated?.id).toBe(created.id);
      expect(updated?.amountCents).toBe(5500);
      expect(updated?.description).toBe('Jantar');
      expect(updated?.updatedAt).toBe(1780000000100);
    });

    it('clears categoryId when set to null (CA-006)', async () => {
      const userId = createUser();
      const categoryId = createCategory(userId);
      const created = await repository.create({
        userId,
        categoryId,
        type: 'EXPENSE',
        amountCents: 5000,
        description: 'x',
        date: '2026-08-10',
      });

      const updated = await repository.update(created.id, userId, {
        categoryId: null,
        updatedAt: Date.now(),
      });

      expect(updated?.categoryId).toBeNull();
    });

    it('returns undefined when the transaction is not owned by the user', async () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      const created = await repository.create({
        userId: userA,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      const updated = await repository.update(created.id, userB, {
        amountCents: 9999,
        updatedAt: Date.now(),
      });

      expect(updated).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('deletes the row and returns true', async () => {
      const userId = createUser();
      const created = await repository.create({
        userId,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      expect(await repository.delete(created.id, userId)).toBe(true);
      expect(
        await repository.findByIdAndUserId(created.id, userId),
      ).toBeUndefined();
    });

    it('returns false when the transaction is not owned by the user', async () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      const created = await repository.create({
        userId: userA,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      expect(await repository.delete(created.id, userB)).toBe(false);
      expect(
        await repository.findByIdAndUserId(created.id, userA),
      ).toBeDefined();
    });
  });

  describe('sumByType', () => {
    it('sums income and expense separately (FR-008)', async () => {
      const userId = createUser();
      await repository.create({
        userId,
        categoryId: null,
        type: 'INCOME',
        amountCents: 10000,
        description: 'a',
        date: '2026-08-01',
      });
      await repository.create({
        userId,
        categoryId: null,
        type: 'INCOME',
        amountCents: 5000,
        description: 'b',
        date: '2026-08-02',
      });
      await repository.create({
        userId,
        categoryId: null,
        type: 'EXPENSE',
        amountCents: 3000,
        description: 'c',
        date: '2026-08-03',
      });

      expect(await repository.sumByType(userId, 'INCOME')).toBe(15000);
      expect(await repository.sumByType(userId, 'EXPENSE')).toBe(3000);
    });

    it('returns 0 when there are no transactions of that type', async () => {
      const userId = createUser();
      expect(await repository.sumByType(userId, 'INCOME')).toBe(0);
      expect(await repository.sumByType(userId, 'EXPENSE')).toBe(0);
    });

    it("does not include another user's transactions", async () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      await repository.create({
        userId: userA,
        categoryId: null,
        type: 'INCOME',
        amountCents: 10000,
        description: 'a',
        date: '2026-08-01',
      });
      await repository.create({
        userId: userB,
        categoryId: null,
        type: 'INCOME',
        amountCents: 99999,
        description: 'b',
        date: '2026-08-02',
      });

      expect(await repository.sumByType(userA, 'INCOME')).toBe(10000);
    });
  });

  describe('cascade user → transactions (FR-011)', () => {
    it("removes the user's transactions when the user row is deleted", async () => {
      const userId = createUser();
      await repository.create({
        userId,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      db.delete(users).where(eq(users.id, userId)).run();

      expect(await findAll(userId)).toEqual([]);
    });
  });

  describe('set null category → transactions (FR-010/SC-003)', () => {
    it('sets categoryId to null when the category is deleted', async () => {
      const userId = createUser();
      const categoryId = createCategory(userId);
      const created = await repository.create({
        userId,
        categoryId,
        type: 'EXPENSE',
        amountCents: 5000,
        description: 'x',
        date: '2026-08-10',
      });

      db.delete(categories).where(eq(categories.id, categoryId)).run();

      const found = await repository.findByIdAndUserId(created.id, userId);
      expect(found?.categoryId).toBeNull();
    });
  });
});
