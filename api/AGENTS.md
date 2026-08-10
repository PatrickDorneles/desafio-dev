# AGENTS.md — API (NestJS)

Conventions for the `api/` package. Read the root `AGENTS.md` first.

## Stack & Commands

- NestJS 11 · Fastify adapter (`@nestjs/platform-fastify`) · TypeScript strict
- Drizzle ORM + SQLite · Zod · Swagger (`/swagger`, configured in `src/main.ts`)
- Dev server: `npm run start:dev` → `http://localhost:3001` (env `PORT`, default 3001)
- Tests: `npm test` (unit, jest) · `npm run test:e2e` (supertest)

## NestJS Conventions

- Module-per-feature under `src/<feature>/`: `module.ts` + `controller.ts` + `service.ts` + `dto/` + `entities/`.
- DI via constructor injection; default provider scope (singleton); `forwardRef` only for circular dependencies.
- Pipeline: Middleware → Guards → Interceptors → Pipes → Handler.
  - Guards: auth/roles. Pipes: input validation (Zod/DTO). Interceptors: response shaping.
- Use the Fastify adapter idiomatically: platform-agnostic code; reach the HTTP server via `app.getHttpAdapter()`.
- Swagger: keep `@ApiTags`/`@ApiOperation`/schema decorators on all endpoints; document DTO schemas.
- Controllers are thin — business logic lives in services; DB access via Drizzle in services/repositories.

## Drizzle ORM + SQLite

- Import from `drizzle-orm/sqlite-core` (`sqliteTable`, `text`, `integer`, `real`) — never `pg-core`.
- No raw SQL. All queries through Drizzle builders (parameterized, typed).
- Foreign keys: `.references(() => table, { onDelete: 'cascade' })` on the FK column.
- Query relations: also declare `relations()` on both sides — `.references()` alone does not power the query API.
- `findFirst()` returns `undefined` when absent — handle explicitly.
- Migrations: `drizzle-kit generate` → review SQL → `drizzle-kit migrate`. See the `drizzle-sqlite-migrations` skill.
- SQLite has no enums → `text` column + Zod `z.enum`/`z.union(z.literal(...))` validation (see the `zod-shared-schemas` skill).

## Zod (schemas)

- Zod is the source of truth for DTOs and entities; derive TS types with `z.infer`.
- Parse at the boundary with `safeParse`; map failures to structured 4xx responses.
- Keep contracts shared/consistent with the UI (see the `zod-shared-schemas` skill).

## Testing

- Unit: `*.spec.ts` beside sources; mock the DB layer.
- e2e: supertest app in `test/app.e2e-spec.ts`.
- Full suite (`npm test` + `npm run test:e2e`) must pass before finishing a task.
