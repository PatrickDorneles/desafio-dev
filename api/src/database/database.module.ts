import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database = require('better-sqlite3');
import { DRIZZLE } from '../common/constants/database.constants';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Database.Database => {
        const dbPath = configService.get<string>('DB_PATH', './data/app.db');
        mkdirSync(dirname(dbPath), { recursive: true });
        return new Database(dbPath);
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule { }
