import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe';

/**
 * Builds the e2e app exactly like production (src/main.ts): Fastify adapter +
 * global exception filter + global Zod pipe. Without these the error envelope
 * and validation behavior are never exercised.
 *
 * Env isolation: DB_PATH and JWT_SECRET are set BEFORE AppModule is loaded.
 * ConfigModule.forRoot() reads `.env` at module-import time and only assigns
 * vars that are not already in process.env, so these pre-set values win and
 * tests never touch `api/data/app.db`. AppModule is therefore imported
 * dynamically, after the env vars are set.
 */
export async function createTestApp(): Promise<NestFastifyApplication> {
  process.env.DB_PATH = process.env.DB_PATH ?? ':memory:';
  process.env.JWT_SECRET =
    process.env.JWT_SECRET ?? 'test-secret-at-least-16-chars';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';

  const { AppModule } = await import('../../src/app.module');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  return app;
}
