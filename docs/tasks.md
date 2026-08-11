# ✅ Tarefas de Implementação — API

Roadmap derivado das specs (`docs/specs/`) e ADRs (`docs/adr/`). **A ordem importa**: cada fase depende da anterior. Marque `- [x]` ao concluir; a verificação de cada tarefa deve passar antes de seguir.

Convenções: `AGENTS.md` (raiz + `api/` + `ui/`), ADRs 0001–0009.

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
- [x] **T-044 Tipos por módulo em `types/` (ADR-0005)** — serviços/repositórios/entidades deixam de exportar tipos: `types/auth.types.ts`, `types/user.types.ts`, `types/category.types.ts`, `types/transaction.types.ts`, `common/types/` (envelope, current-user); entidades exportam só o schema; services/repos exportam só a classe; DTOs mantêm schema + `z.infer`. *Verificar:* `npm run lint` · `npm run build` · `npm test` · `npm run test:e2e`. *(concluído em `d440ffa`)*
- [x] **T-045 `TransactionType` como objeto `as const` + union (ADR-0006)** — `const TransactionType = { INCOME, EXPENSE } as const` + `type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]` em `types/transaction.types.ts`; DTOs (`create`/`update`/`response`) usam `z.enum(Object.values(TransactionType) as [TransactionType, ...TransactionType[]])`; service usa `TransactionType.INCOME/EXPENSE`. *Verificar:* `npm run lint` · `npm run build` · `npm test` · `npm run test:e2e`. *(concluído em `6f1665a`)*
- [x] **T-046 Paginação de `GET /transactions` (ADR-0007)** — query `page` (default 1) / `pageSize` (default 10, cap 100) via DTO Zod `z.coerce.number()`; resposta `{ data, meta }` com `PaginationMeta` (`common/types/pagination.ts`) + `buildPaginationMeta` (`common/utils/pagination.util.ts` + spec); repo com `limit/offset`, `countByUserId` (count sync — não `$count`) e desempate `id DESC`; DTO de página p/ Swagger; service/controller; unit + e2e (páginas, totalPages, além do fim → `data: []`, inválidos → 400). *Verificar:* `npm run lint` · `npm run build` · `npm test` · `npm run test:e2e`. *(concluído em `94a063a`)*
- [x] **T-047 Guard resolve usuário real (Spec 001)** — `JwtAuthGuard` deixa de confiar só no token: injeta `UsersRepository`, carrega o usuário pelo `sub` (inexistente/removido → `401` genérico) e seta `request.user = { id, name, email }` (sem hash); `CurrentUserPayload` vira `{ id, name, email }`; controllers trocam `.sub` por `.id`; `APP_GUARD` move para `AuthModule` (Providers); unit (guard: usuário não encontrado → 401) + e2e (token de usuário inexistente → 401). *Verificar:* `npm run lint` · `npm run build` · `npm test` · `npm run test:e2e`. *(concluído em `16e7576`)*

## Fase 6 — Interface web (Spec 004)

- [ ] **T-048 Setup da UI** — instalar a stack declarada no `ui/AGENTS.md`: shadcn/ui (`npx shadcn@latest init` + componentes base), `@tanstack/react-query`, `zod`, `lucide-react`, `sonner`, `clsx`/`tailwind-merge`; tokens de tema escuro em `globals.css` via `@theme`; componentes base (button, input, label, card, dialog, select, tabs, table, skeleton, alert, toast). *Verificar:* `npm run build` · `npm run lint`.
- [ ] **T-049 Schemas espelhados + API client (ADR-0009)** — `ui/src/lib/schemas/` espelhando os DTOs da API (auth, category, transaction, pagination, summary — comentário `// espelha api/src/...` em cada schema); `ui/src/lib/api/` com fetch tipado (Bearer do localStorage, parse com zod, envelope de erro, `401` → callback global); query-key factory. *Verificar:* `npm run build` · `npm run lint`.
- [x] **T-050 Sessão (ADR-0008)** — estado de sessão (token em `localStorage` + usuário), `login`/`register`/`logout`, proteção de rota (`/dashboard` sem token → `/`; `/` com token → `/dashboard`), handler global de `401` (FR-006/007/008/009/010). *Verificar:* `npm run build` · `npm run lint` · fluxo manual.
- [x] **T-051 Landing `/`** — server component com explicação do app + componente client com abas login/cadastro; formulários validados com os schemas espelhados; erros da API (`400`/`401`/`409`) exibidos no form (FR-001..005). *Verificar:* `npm run build` · `npm run lint` · fluxos manuais.
- [x] **T-052 Dashboard — layout e providers** — rota protegida `/dashboard`; TanStack Query Provider; header (nome do usuário + "Sair"); botões "Nova movimentação" e "Gerenciar categorias"; estrutura de modais (FR-011). *Verificar:* `npm run build` · `npm run lint`.
- [x] **T-053 Resumo + tabela paginada** — queries de `GET /transactions/summary` e `GET /transactions?page&pageSize`; estados de loading/erro/vazio; controles de paginação conforme `meta`; formatação BRL e datas pt-BR (FR-012/013/014/026/027/029). *Verificar:* `npm run build` · `npm run lint` · manual.
- [x] **T-054 Modal "Nova movimentação"** — formulário (tipo, valor R$, descrição, data, categoria opcional) validado com schema espelhado; invalidação das queries de tabela/resumo/categorias após sucesso (FR-016/017/018/022). *Verificar:* `npm run build` · `npm run lint` · manual.
- [x] **T-055 Editar/excluir movimentação** — modal pré-preenchido (`PATCH`), exclusão com confirmação (`DELETE`), desvincular categoria (`categoryId: null`) (FR-019/020/021). *Verificar:* manual (build/lint).
- [x] **T-056 Modal "Gerenciar categorias"** — listar/criar/editar/excluir; aviso de `SET NULL` na exclusão de categoria em uso; `409` exibido no form; seletor de categoria do formulário de movimentação atualizado (FR-023/024/025; CA-008/009). *Verificar:* manual (build/lint).
- [x] **T-057 Polimento da UI** — copy pt-BR revisada, ícones consistentes, responsividade mobile, a11y básica (foco em modais, labels, aria) (FR-028/030/031). *Verificar:* `npm run build` · `npm run lint` · revisão de design/responsiva.
- [x] **T-058 UI tests (Playwright)** — `@playwright/test` + `playwright.config.ts` (webServer: UI `next dev` + API com `DB_PATH` de teste isolado); chromium; e2e das jornadas principais: cadastro → login → criar/editar/excluir movimentação e categoria → logout → token inválido (`401`) → volta para `/`; usuário único por teste (isolamento). *Verificar:* suíte Playwright verde contra a stack real.
- [x] **T-059 Verificação total** — `npm run lint` · `npm run build` · suíte Playwright na `ui/` com a API rodando; checklist completo dos fluxos (cadastro → login → CRUD movimentações/categorias → logout → expiração → `401` → volta para `/`). *Verificar:* gates + checklist manual (CA-001..CA-012, SC-001..SC-005).

## Fora de escopo (por decisão)

- Paginação/filtros server-side, refresh tokens, roles, rate limiting (ver Non-Goals das specs).
