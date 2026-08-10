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

  describe('create', () => {
    it('inserts a row with timestamps and returns the full row', () => {
      const userId = createUser();
      const categoryId = createCategory(userId);

      const row = repository.create({
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

    it('stores null for an omitted categoryId', () => {
      const userId = createUser();

      const row = repository.create({
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
    it('orders by date DESC, then createdAt DESC (FR-004/FR-018)', () => {
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

      const rows = repository.findAllByUserId(userId);

      expect(rows.map((r) => r.date)).toEqual([
        '2026-08-10',
        '2026-08-05',
        '2026-08-05',
        '2026-08-01',
      ]);
      expect(rows[1].createdAt).toBe(now + 200);
      expect(rows[2].createdAt).toBe(now + 100);
    });

    it("returns only the user's own transactions", () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      repository.create({
        userId: userA,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'a',
        date: '2026-08-01',
      });
      repository.create({
        userId: userB,
        categoryId: null,
        type: 'INCOME',
        amountCents: 2000,
        description: 'b',
        date: '2026-08-02',
      });

      const rows = repository.findAllByUserId(userA);

      expect(rows).toHaveLength(1);
      expect(rows[0].description).toBe('a');
    });

    it('returns an empty array when the user has no transactions', () => {
      const userId = createUser();
      expect(repository.findAllByUserId(userId)).toEqual([]);
    });
  });

  describe('findByIdAndUserId', () => {
    it('finds a transaction owned by the user', () => {
      const userId = createUser();
      const created = repository.create({
        userId,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      const found = repository.findByIdAndUserId(created.id, userId);

      expect(found?.id).toBe(created.id);
      expect(found?.description).toBe('x');
    });

    it("returns undefined for another user's transaction", () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      const created = repository.create({
        userId: userA,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      const found = repository.findByIdAndUserId(created.id, userB);

      expect(found).toBeUndefined();
    });

    it('returns undefined for an unknown id', () => {
      const userId = createUser();
      expect(
        repository.findByIdAndUserId('does-not-exist', userId),
      ).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates fields and returns the updated row', () => {
      const userId = createUser();
      const created = repository.create({
        userId,
        categoryId: null,
        type: 'EXPENSE',
        amountCents: 5000,
        description: 'Almoço',
        date: '2026-08-10',
      });

      const updated = repository.update(created.id, userId, {
        amountCents: 5500,
        description: 'Jantar',
        updatedAt: 1780000000100,
      });

      expect(updated?.id).toBe(created.id);
      expect(updated?.amountCents).toBe(5500);
      expect(updated?.description).toBe('Jantar');
      expect(updated?.updatedAt).toBe(1780000000100);
    });

    it('clears categoryId when set to null (CA-006)', () => {
      const userId = createUser();
      const categoryId = createCategory(userId);
      const created = repository.create({
        userId,
        categoryId,
        type: 'EXPENSE',
        amountCents: 5000,
        description: 'x',
        date: '2026-08-10',
      });

      const updated = repository.update(created.id, userId, {
        categoryId: null,
        updatedAt: Date.now(),
      });

      expect(updated?.categoryId).toBeNull();
    });

    it('returns undefined when the transaction is not owned by the user', () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      const created = repository.create({
        userId: userA,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      const updated = repository.update(created.id, userB, {
        amountCents: 9999,
        updatedAt: Date.now(),
      });

      expect(updated).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('deletes the row and returns true', () => {
      const userId = createUser();
      const created = repository.create({
        userId,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      expect(repository.delete(created.id, userId)).toBe(true);
      expect(repository.findByIdAndUserId(created.id, userId)).toBeUndefined();
    });

    it('returns false when the transaction is not owned by the user', () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      const created = repository.create({
        userId: userA,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      expect(repository.delete(created.id, userB)).toBe(false);
      expect(repository.findByIdAndUserId(created.id, userA)).toBeDefined();
    });
  });

  describe('sumByType', () => {
    it('sums income and expense separately (FR-008)', () => {
      const userId = createUser();
      repository.create({
        userId,
        categoryId: null,
        type: 'INCOME',
        amountCents: 10000,
        description: 'a',
        date: '2026-08-01',
      });
      repository.create({
        userId,
        categoryId: null,
        type: 'INCOME',
        amountCents: 5000,
        description: 'b',
        date: '2026-08-02',
      });
      repository.create({
        userId,
        categoryId: null,
        type: 'EXPENSE',
        amountCents: 3000,
        description: 'c',
        date: '2026-08-03',
      });

      expect(repository.sumByType(userId, 'INCOME')).toBe(15000);
      expect(repository.sumByType(userId, 'EXPENSE')).toBe(3000);
    });

    it('returns 0 when there are no transactions of that type', () => {
      const userId = createUser();
      expect(repository.sumByType(userId, 'INCOME')).toBe(0);
      expect(repository.sumByType(userId, 'EXPENSE')).toBe(0);
    });

    it("does not include another user's transactions", () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      repository.create({
        userId: userA,
        categoryId: null,
        type: 'INCOME',
        amountCents: 10000,
        description: 'a',
        date: '2026-08-01',
      });
      repository.create({
        userId: userB,
        categoryId: null,
        type: 'INCOME',
        amountCents: 99999,
        description: 'b',
        date: '2026-08-02',
      });

      expect(repository.sumByType(userA, 'INCOME')).toBe(10000);
    });
  });

  describe('cascade user → transactions (FR-011)', () => {
    it("removes the user's transactions when the user row is deleted", () => {
      const userId = createUser();
      repository.create({
        userId,
        categoryId: null,
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      db.delete(users).where(eq(users.id, userId)).run();

      expect(repository.findAllByUserId(userId)).toEqual([]);
    });
  });

  describe('set null category → transactions (FR-010/SC-003)', () => {
    it('sets categoryId to null when the category is deleted', () => {
      const userId = createUser();
      const categoryId = createCategory(userId);
      const created = repository.create({
        userId,
        categoryId,
        type: 'EXPENSE',
        amountCents: 5000,
        description: 'x',
        date: '2026-08-10',
      });

      db.delete(categories).where(eq(categories.id, categoryId)).run();

      const found = repository.findByIdAndUserId(created.id, userId);
      expect(found?.categoryId).toBeNull();
    });
  });
});
