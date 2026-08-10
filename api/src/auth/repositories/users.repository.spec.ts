import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
// better-sqlite3 is CommonJS (`module.exports = Database`); a default import
// would compile to `require('better-sqlite3').default` (undefined) under
// ts-jest without esModuleInterop, so the require form is required here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Database = require('better-sqlite3');
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { DRIZZLE } from '../../common/constants/database.constants';
import { users } from '../entities/users.entity';
import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let db: BetterSQLite3Database;

  beforeAll(() => {
    const sqlite = new Database(':memory:');
    db = drizzle(sqlite);
    // Reuse the same migrations folder the database module auto-applies at boot.
    migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [UsersRepository, { provide: DRIZZLE, useValue: db }],
    }).compile();

    repository = moduleRef.get(UsersRepository);
  });

  afterEach(() => {
    db.delete(users).run();
  });

  describe('create', () => {
    it('inserts a row with timestamps and returns the full row', () => {
      const row = repository.create({
        name: 'Maria Silva',
        email: 'maria@example.com',
        passwordHash: 'hash-do-bcrypt',
      });

      expect(row.id).toBeDefined();
      expect(row.name).toBe('Maria Silva');
      expect(row.email).toBe('maria@example.com');
      expect(row.passwordHash).toBe('hash-do-bcrypt');
      expect(typeof row.createdAt).toBe('number');
      expect(typeof row.updatedAt).toBe('number');
    });
  });

  describe('findByEmail', () => {
    it('finds an existing user (exact normalized email)', () => {
      const created = repository.create({
        name: 'Maria Silva',
        email: 'maria@example.com',
        passwordHash: 'hash',
      });

      const found = repository.findByEmail('maria@example.com');

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('maria@example.com');
    });

    it('returns undefined for an unknown email', () => {
      const found = repository.findByEmail('nobody@example.com');
      expect(found).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('finds a user by id', () => {
      const created = repository.create({
        name: 'João Souza',
        email: 'joao@example.com',
        passwordHash: 'hash',
      });

      const found = repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('João Souza');
    });

    it('returns undefined for an unknown id', () => {
      const found = repository.findById('does-not-exist');
      expect(found).toBeUndefined();
    });
  });
});
