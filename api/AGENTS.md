# AGENTS.md — API (NestJS)

Conventions for the `api/` package. Read the root `AGENTS.md` first.

## Stack & Commands

- NestJS 11 · Fastify adapter (`@nestjs/platform-fastify`) · TypeScript strict
- Drizzle ORM + SQLite · Zod · Swagger (`/swagger`, configured in `src/main.ts`)
- Dev server: `npm run start:dev` → `http://localhost:3001` (env `PORT`, default 3001)
- Tests: `npm test` (unit, jest) · `npm run test:e2e` (supertest)

## NestJS Conventions

Layered, module-per-feature structure — see **ADR-0003** (`docs/adr/0003-arquitetura-em-camadas.md`):

```text
src/
├── common/                 # global, no module ties
│   ├── types/              # global cross-module types (error envelope, user payload)
│   ├── utils/              # reusable helpers
│   └── constants/          # immutable values (keys, names)
└── <feature>/
    ├── module.ts
    ├── controllers/        # routes + decorators (guards, validation, Swagger)
    ├── services/           # domain logic
    ├── repositories/       # ORM integration (Drizzle) — consumed by services
    ├── dto/                # Zod schemas per function (create/update/login…)
    ├── entities/           # Drizzle schema of the module
    └── types/              # module-level types/interfaces
```

- DI via constructor injection; default provider scope (singleton); `forwardRef` only for circular dependencies.
- **Minimal exports, types in `types/` (ADR-0005):** each file exports only what its responsibility requires. Module-level types and interfaces (row types `$inferSelect`, service I/O shapes, repository data payloads, unions like `TransactionType`) live in `src/<module>/types/`. Entity files export only the schema; service and repository files export only the class; DTO files keep schema + inferred `z.infer` type together. Global cross-module types live in `src/common/types/`. A type stays in its implementation file only if strictly local (not exported).
- **Entity-per-module (ADR-0004):** every Drizzle entity lives in its own module — `src/<entity>/` owns `entities/` (schema) + `repositories/` and **exports its repository** (`exports: [XxxRepository]`). Consumer modules import the owner module and inject the exported repository (e.g. `auth` imports `UsersModule` and uses `UsersRepository` in `AuthService`; `auth` owns no entity). FKs between tables import the owner entity file directly (`src/users/entities/users.entity`).
- **Layer discipline (SOLID/DRY):** controllers stay thin — no ORM calls; services hold domain logic — no raw DTO shaping; repositories are the only layer touching Drizzle. Reusable logic lives in `src/common/utils/` or shared services.
- Pipeline: Middleware → Guards → Interceptors → Pipes → Handler.
  - Guards: auth/roles. Pipes: input validation (Zod/DTO). Interceptors: response shaping.
- Use the Fastify adapter idiomatically: platform-agnostic code; reach the HTTP server via `app.getHttpAdapter()`.
- Swagger: keep `@ApiTags`/`@ApiOperation`/schema decorators on all endpoints; document DTO schemas.
- Error responses must use the global envelope `{ statusCode, message, error }` (T-003) — never ad-hoc error shapes.

## Drizzle ORM + SQLite

- Import from `drizzle-orm/sqlite-core` (`sqliteTable`, `text`, `integer`, `real`) — never `pg-core`.
- No raw SQL. All queries through Drizzle builders (parameterized, typed).
- Foreign keys: `.references(() => table.column, { onDelete: 'cascade' })` — drizzle-orm ≥0.45 requires referencing the specific column (e.g. `.references(() => users.id, { onDelete: 'cascade' })`), not the table.
- Query relations: also declare `relations()` on both sides — `.references()` alone does not power the query API.
- `findFirst()` returns `undefined` when absent — handle explicitly.
- Migrations: `drizzle-kit generate` → review SQL → `drizzle-kit migrate`. See the `drizzle-sqlite-migrations` skill.
- SQLite has no enums → `text` column + Zod `z.enum`/`z.union(z.literal(...))` validation (see the `zod-shared-schemas` skill).

## Zod (schemas)

- Zod is the source of truth for DTOs and entities; derive TS types with `z.infer`.
- **DTOs via `nestjs-zod`:** use `createZodDto(MySchema)` in `dto/` and a global `ZodValidationPipe` — this keeps Zod as single source and documents the Swagger schemas automatically (ADR-0003). Don't hand-roll a validation pipe.
- Parse at the boundary with `safeParse`; map failures to structured 4xx responses.
- Keep contracts shared/consistent with the UI (see the `zod-shared-schemas` skill).
- **Domain enums are `as const` objects (ADR-0006):** model closed string-valued domains as `export const X = { A: 'A', B: 'B' } as const` + `export type X = (typeof X)[keyof typeof X]` in the module's `types/` (ADR-0005). Reference the const from Zod: `z.enum(Object.values(X) as [X, ...X[]])`, and use `X.A` in behavior code — no TS native `enum` (nominal typing forces casts at the Zod/DB boundaries) and no bare literal unions (vocabulary drift).

## Testing

- Unit: `*.spec.ts` beside sources; mock the DB layer.
- e2e: supertest app in `test/app.e2e-spec.ts`.
- Full suite (`npm test` + `npm run test:e2e`) must pass before finishing a task.
