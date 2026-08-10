import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
// better-sqlite3 is CommonJS (`module.exports = Database`); a default import
// would compile to `require('better-sqlite3').default` (undefined) under
// ts-jest without esModuleInterop, so the require form is required here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Database = require('better-sqlite3');
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { DRIZZLE } from '../common/constants/database.constants';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): BetterSQLite3Database => {
        const dbPath = configService.get<string>('DB_PATH', './data/app.db');
        mkdirSync(dirname(dbPath), { recursive: true });
        const sqlite = new Database(dbPath);
        const db = drizzle(sqlite);
        // Auto-migrate at bootstrap (FR-009): start:dev / e2e always have the
        // schema. `__dirname`-based so it works from `src/` (ts-jest) and
        // `dist/` (nest build) regardless of the process cwd.
        migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') });
        return db;
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
