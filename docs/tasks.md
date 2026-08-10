# ✅ Tarefas de Implementação — API

Roadmap derivado das specs (`docs/specs/`) e ADRs (`docs/adr/`). **A ordem importa**: cada fase depende da anterior. Marque `- [x]` ao concluir; a verificação de cada tarefa deve passar antes de seguir.

Convenções: `AGENTS.md` (raiz + `api/`), ADRs 0001–0003, skills `drizzle-sqlite-migrations` e `zod-shared-schemas`.

## Fase 0 — Fundação

- [x] **T-001 Config de ambiente** — `@nestjs/config` + `.env` (`PORT`, `JWT_SECRET`, `DB_PATH`, `JWT_EXPIRES_IN`) + `.env.example`. *Verificar:* `npm run start:dev` lê o `.env`.
- [x] **T-002 Integração Drizzle** — `drizzle-orm` + `better-sqlite3`, `drizzle.config.ts`, módulo/provider global de conexão. *Verificar:* `npm run build` e `npx drizzle-kit check`.
- [x] **T-003 Estrutura base + envelope de erro** — `src/common/utils/`, `src/common/constants/`, filtro global de exceções que normaliza `{ statusCode, message, error }`. *Verificar:* rota que lança erro retorna o envelope.
- [x] **T-004 Swagger aprimorado** — título/descrição, `addBearerAuth()`, tags por módulo. *Verificar:* `/swagger` mostra o esquema Bearer.
- [x] **T-005 Health** — `GET /health` → `{ status: "ok" }`. *Verificar:* curl → `200`.

## Fase 1 — Autenticação e Usuários (Spec 001)

- [x] **T-010 Entidade `users` + migration** — schema Drizzle em `auth/entities/`; `drizzle-kit generate` + `migrate`. *Verificar:* tabela `users` criada.
- [x] **T-011 DTOs de auth** — `register`, `login` (e resposta de `me`) via `nestjs-zod` em `auth/dto/`. *Verificar:* build + Swagger mostra schemas.
- [x] **T-012 Repository `users`** — `auth/repositories/`: `findByEmail`, `create`. *Verificar:* testes unitários com mock.
- [x] **T-013 Service de auth** — registro (bcrypt, e-mail normalizado, `409`), login (`401` genérico, assinatura JWT), `me`. *Verificar:* unit tests.
- [x] **T-014 JWT + guards** — `JwtModule`, guard global com decorator `@Public()`, decorator `currentUser`. *Verificar:* rotas protegidas retornam `401` sem token.
- [x] **T-015 Controller de auth** — `POST /auth/register`, `POST /auth/login`, `GET /auth/me` + decorators Swagger. *Verificar:* e2e/supertest.
- [x] **T-016 Testes e2e de auth** — register/login/me, `409` duplicado, `401`, isolamento entre usuários. *Verificar:* `npm run test:e2e`.
- [x] **T-017 Testes unitários do service de auth** — hashing, erros, token. *Verificar:* `npm test`.

## Fase 2 — Categorias (Spec 002)

- [x] **T-020 Entidade `categories` + migration** — `(userId, name)` único, FK `users` com cascade. *Verificar:* migration aplicada.
- [x] **T-021 DTOs de categorias** — `create` e `update` (validação nome/cor/ícone). *Verificar:* build.
- [x] **T-022 Repository de categorias** — CRUD filtrado por `userId`; checagem de nome duplicado (case-insensitive). *Verificar:* unit tests.
- [x] **T-023 Service de categorias** — propriedade (`404` sem distinção), unicidade (`409`), validações. *Verificar:* unit tests.
- [x] **T-024 Controller de categorias** — CRUD completo + Swagger. *Verificar:* e2e.
- [x] **T-025 Testes de categorias** — unit + e2e: CRUD, isolamento entre usuários, `404` sem vazamento. *Verificar:* `npm test` + `npm run test:e2e`.

## Fase 3 — Movimentações (Spec 003)

- [x] **T-030 Entidade `transactions` + migration** — FK `categories` com `SET NULL`, índice `(userId, date)`. *Verificar:* migration aplicada.
- [x] **T-031 DTOs de transações** — `create`, `update`, `summary` (type/amount/date/categoryId). *Verificar:* build.
- [x] **T-032 Repository de transações** — CRUD + agregações do resumo (income/expense). *Verificar:* unit tests.
- [x] **T-033 Service de transações** — validação de categoria (regra `400`), cálculo do resumo, regras de propriedade. *Verificar:* unit tests.
- [x] **T-034 Controller de transações** — CRUD + `GET /transactions/summary` **antes** de `GET /transactions/:id` (ordem de rotas!) + Swagger. *Verificar:* e2e.
- [x] **T-035 Testes de transações** — unit + e2e: CRUD, isolamento, resumo (CA-007/CA-008), SET NULL via exclusão de categoria (cross-spec). *Verificar:* `npm test` + `npm run test:e2e`.

## Fase 4 — Finalização

- [x] **T-040 READMEs (root + api)** — instruções completas e verificadas: install, `.env`, migrate, start, swagger. *Verificar:* seguir o README do zero em diretório limpo.
- [x] **T-041 Revisão Swagger** — todos os endpoints documentados (schemas, erros, tags, Bearer). *Verificar:* inspeção em `/swagger`.
- [x] **T-042 Verificação total** — `npm run build` · `npm run lint` · `npm test` · `npm run test:e2e` passando do zero. *Verificar:* CI-like run.

## Fase 5 — Refatoração (pós-revisão)

- [x] **T-043 Módulo `users` (entity-per-module, ADR-0004)** — entidade `users` + `UsersRepository` movidos de `auth/` para `src/users/`; `UsersModule` exporta o repositório; `auth` importa `UsersModule` e não possui mais entidade. *Verificar:* `npm run build` · `npm test` · `npm run test:e2e`.
- [ ] **T-044 Tipos por módulo em `types/` (ADR-0005)** — serviços/repositórios/entidades deixam de exportar tipos: `types/auth.types.ts`, `types/user.types.ts`, `types/category.types.ts`, `types/transaction.types.ts`, `common/types/` (envelope, current-user); entidades exportam só o schema; services/repos exportam só a classe; DTOs mantêm schema + `z.infer`. *Verificar:* `npm run lint` · `npm run build` · `npm test` · `npm run test:e2e`.

## Fora de escopo (por decisão)

- UI do frontend (será planejada separadamente).
- Paginação/filtros server-side, refresh tokens, roles, rate limiting (ver Non-Goals das specs).
