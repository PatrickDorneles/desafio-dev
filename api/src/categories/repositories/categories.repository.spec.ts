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
import { DRIZZLE } from '../../common/constants/database.constants';
import { categories } from '../entities/category.entity';
import { CategoriesRepository } from './categories.repository';

describe('CategoriesRepository', () => {
  let repository: CategoriesRepository;
  let db: BetterSQLite3Database;

  beforeAll(() => {
    const sqlite = new Database(':memory:');
    db = drizzle(sqlite);
    // Reuse the same migrations folder the database module auto-applies at boot
    // (users + categories tables both exist now).
    migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesRepository, { provide: DRIZZLE, useValue: db }],
    }).compile();

    repository = moduleRef.get(CategoriesRepository);
  });

  afterEach(() => {
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

  describe('create', () => {
    it('inserts a row with timestamps and returns the full row', async () => {
      const userId = createUser();

      const row = await repository.create({
        userId,
        name: 'Alimentação',
        color: '#FF5733',
        icon: 'utensils',
      });

      expect(row.id).toBeDefined();
      expect(row.userId).toBe(userId);
      expect(row.name).toBe('Alimentação');
      expect(row.color).toBe('#FF5733');
      expect(row.icon).toBe('utensils');
      expect(typeof row.createdAt).toBe('number');
      expect(typeof row.updatedAt).toBe('number');
    });

    it('stores null for omitted color/icon', async () => {
      const userId = createUser();

      const row = await repository.create({ userId, name: 'Mercado' });

      expect(row.color).toBeNull();
      expect(row.icon).toBeNull();
    });
  });

  describe('findAllByUserId', () => {
    it("returns only the user's own categories ordered by name case-insensitively", async () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      await repository.create({ userId: userA, name: 'Zebra' });
      await repository.create({ userId: userA, name: 'alimentação' });
      await repository.create({ userId: userA, name: 'Mercado' });
      await repository.create({ userId: userB, name: 'Outro' });

      const rows = await repository.findAllByUserId(userA);

      expect(rows.map((r) => r.name)).toEqual([
        'alimentação',
        'Mercado',
        'Zebra',
      ]);
    });

    it('returns an empty array when the user has no categories', async () => {
      const userId = createUser();
      expect(await repository.findAllByUserId(userId)).toEqual([]);
    });
  });

  describe('findByIdAndUserId', () => {
    it('finds a category owned by the user', async () => {
      const userId = createUser();
      const created = await repository.create({ userId, name: 'Alimentação' });

      const found = await repository.findByIdAndUserId(created.id, userId);

      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Alimentação');
    });

    it("returns undefined for another user's category", async () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      const created = await repository.create({
        userId: userA,
        name: 'Alimentação',
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

  describe('findByNameForUser', () => {
    it('matches case-insensitively', async () => {
      const userId = createUser();
      await repository.create({ userId, name: 'Alimentação' });

      const found = await repository.findByNameForUser(userId, 'alimentação');

      expect(found?.name).toBe('Alimentação');
    });

    it('returns undefined when there is no match', async () => {
      const userId = createUser();
      expect(
        await repository.findByNameForUser(userId, 'nope'),
      ).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates fields and returns the updated row', async () => {
      const userId = createUser();
      const created = await repository.create({
        userId,
        name: 'Alimentação',
        color: '#FF5733',
      });

      const updated = await repository.update(created.id, userId, {
        name: 'Mercado',
        updatedAt: 1780000000100,
      });

      expect(updated?.id).toBe(created.id);
      expect(updated?.name).toBe('Mercado');
      expect(updated?.color).toBe('#FF5733');
      expect(updated?.updatedAt).toBe(1780000000100);
    });

    it('returns undefined when the category is not owned by the user', async () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      const created = await repository.create({
        userId: userA,
        name: 'Alimentação',
      });

      const updated = await repository.update(created.id, userB, {
        name: 'X',
        updatedAt: Date.now(),
      });

      expect(updated).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('deletes the row and returns true', async () => {
      const userId = createUser();
      const created = await repository.create({ userId, name: 'Alimentação' });

      expect(await repository.delete(created.id, userId)).toBe(true);
      expect(
        await repository.findByIdAndUserId(created.id, userId),
      ).toBeUndefined();
    });

    it('returns false when the category is not owned by the user', async () => {
      const userA = createUser('Alice', 'alice@example.com');
      const userB = createUser('Bob', 'bob@example.com');
      const created = await repository.create({
        userId: userA,
        name: 'Alimentação',
      });

      expect(await repository.delete(created.id, userB)).toBe(false);
      expect(
        await repository.findByIdAndUserId(created.id, userA),
      ).toBeDefined();
    });
  });

  describe('cascade user → categories (FR-008)', () => {
    it("removes the user's categories when the user row is deleted", async () => {
      const userId = createUser();
      await repository.create({ userId, name: 'Alimentação' });
      await repository.create({ userId, name: 'Mercado' });

      db.delete(users).where(eq(users.id, userId)).run();

      expect(await repository.findAllByUserId(userId)).toEqual([]);
    });
  });
});
