import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
// better-sqlite3 is CommonJS (`module.exports = Database`); a default import
// would compile to `require('better-sqlite3').default` (undefined) under
// ts-jest without esModuleInterop, so the require form is required here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Database = require('better-sqlite3');
import {
  drizzle as drizzleBetterSqlite3,
  BetterSQLite3Database,
} from 'drizzle-orm/better-sqlite3';
import { migrate as migrateBetterSqlite3 } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle as drizzleLibSql, LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate as migrateLibSql } from 'drizzle-orm/libsql/migrator';
import { DRIZZLE } from '../common/constants/database.constants';

/** Union accepted by repositories: sync better-sqlite3 or async libsql (Turso). */
type DrizzleDatabase = BetterSQLite3Database | LibSQLDatabase;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<DrizzleDatabase> => {
        // Switch rule (locked): non-empty TURSO_DATABASE_URL → Turso/libsql
        // (remote async driver); otherwise → local better-sqlite3 file (unchanged).
        if (process.env.TURSO_DATABASE_URL) {
          const client = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
          });
          const db = drizzleLibSql(client);
          // Auto-migrate at bootstrap (FR-009) — the libsql migrator runs the
          // same `./drizzle` migration files over hrana (batched transaction).
          // `__dirname`-based so it works from `src/` (ts-jest) and `dist/`
          // (nest build) regardless of the process cwd.
          await migrateLibSql(db, {
            migrationsFolder: resolve(__dirname, '../../drizzle'),
          });
          return db;
        }

        const dbPath = configService.get<string>('DB_PATH', './data/app.db');
        mkdirSync(dirname(dbPath), { recursive: true });
        const sqlite = new Database(dbPath);
        const db = drizzleBetterSqlite3(sqlite);
        // Auto-migrate at bootstrap (FR-009): start:dev / e2e always have the
        // schema. `__dirname`-based so it works from `src/` (ts-jest) and
        // `dist/` (nest build) regardless of the process cwd.
        migrateBetterSqlite3(db, {
          migrationsFolder: resolve(__dirname, '../../drizzle'),
        });
        return db;
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
