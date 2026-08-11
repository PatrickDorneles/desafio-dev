# API — NestJS (Backend)

Backend da aplicação de **movimentações financeiras** (desafio técnico). API REST com autenticação JWT, CRUD de categorias e movimentações, e endpoint de resumo financeiro.

## Stack

- **NestJS 11** com adapter **Fastify**
- **Drizzle ORM** + **SQLite** — dual-driver: `better-sqlite3` (local/dev) ou **Turso** (`libsql` remoto, deploy) — migrations com `drizzle-kit`
- **Zod** (schemas de validação via `nestjs-zod`) — fonte única dos contratos
- **JWT** (`@nestjs/jwt`, HS256) + **bcrypt** (cost 12)
- **Swagger** (`@nestjs/swagger`) — documentação interativa em `/swagger`
- **Jest** (testes unitários e e2e)

## Requisitos

- Node.js 20+ (testado com Node 24) e npm
- Nenhum banco externo: SQLite é um arquivo local (`DB_PATH`)

## Como rodar

```bash
cd api
npm install
cp .env.example .env        # crie seu .env (ajuste o JWT_SECRET)
npm run start:dev           # http://localhost:3001
```

O servidor **aplica as migrations automaticamente** na inicialização (tabelas `users`, `categories`, `transactions`). Nenhuma etapa manual de migração é necessária para rodar.

**Dois modos de banco (ADR-0010):**
- **Local (dev/testes):** SQLite em arquivo — `DB_PATH` (default `./data/app.db`). O servidor não inicia com banco remoto configurado? É este modo.
- **Turso (produção/deploy):** defina `TURSO_DATABASE_URL` (ex: `libsql://...`) e, se exigido, `TURSO_AUTH_TOKEN`. As mesmas migrations `./drizzle` são aplicadas no boot; dado fica persistido na nuvem.

- **Swagger:** http://localhost:3001/swagger
- **Health check:** `GET /health` → `{ "status": "ok" }`

## Variáveis de ambiente

| Variável | Default | Descrição |
|---|---|---|
| `PORT` | `3001` | Porta do servidor |
| `JWT_SECRET` | *(obrigatório)* | Segredo para assinar JWTs (mín. 16 caracteres) |
| `JWT_EXPIRES_IN` | `1h` | Expiração do token (formato `jsonwebtoken`, ex: `1h`, `7d`) |
| `DB_PATH` | `./data/app.db` | Arquivo SQLite (modo local) |
| `TURSO_DATABASE_URL` | *(vazio)* | URL do banco Turso (ex: `libsql://...`). Definir = modo Turso; vazio = modo local |
| `TURSO_AUTH_TOKEN` | *(vazio)* | Token de autenticação do Turso (exigido para acesso remoto autenticado) |

> ⚠️ `JWT_SECRET` é obrigatório — o servidor **não inicia** sem ele (fail-fast no boot). Para produção, use um segredo forte gerado por ferramenta adequada; nunca commite o `.env`.

## Migrations (avançado)

Migrations ficam em `api/drizzle/` (versionadas). Workflow:

```bash
npx drizzle-kit generate    # gera migration a partir de src/**/entities/*.ts
npx drizzle-kit check       # valida config/schema
```

O SQL gerado é revisado e commitado; a aplicação aplica pendências no boot (tabela `__drizzle_migrations` registra o que já foi aplicado).

## Testes

```bash
npm test                # unitários (jest)
npm run test:e2e        # e2e (supertest-style via app.inject, banco em memória)
npm run lint            # eslint + prettier
npm run build           # type-check + build
```

## Endpoints

Todas as rotas (exceto `/health`, `/auth/register`, `/auth/login`) exigem `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Health check (público) |
| `POST` | `/auth/register` | Cadastro `{ name, email, password }` → `201` `{ accessToken, user }` (auto-login) |
| `POST` | `/auth/login` | Login → `200` `{ accessToken, user }` |
| `GET` | `/auth/me` | Perfil do usuário autenticado |
| `POST` | `/categories` | Criar categoria `{ name, color?, icon? }` |
| `GET` | `/categories` | Listar categorias (ordenadas por nome) |
| `GET` | `/categories/:id` | Buscar categoria |
| `PATCH` | `/categories/:id` | Atualizar categoria (parcial) |
| `DELETE` | `/categories/:id` | Excluir categoria (`204`) |
| `POST` | `/transactions` | Criar movimentação `{ type, amountCents, description, date?, categoryId? }` |
| `GET` | `/transactions` | Listar (data DESC, desempate createdAt DESC) |
| `GET` | `/transactions/summary` | Resumo `{ totalIncomeCents, totalExpenseCents, balanceCents }` |
| `GET` | `/transactions/:id` | Buscar movimentação |
| `PATCH` | `/transactions/:id` | Atualizar movimentação (parcial; `categoryId: null` remove vínculo) |
| `DELETE` | `/transactions/:id` | Excluir movimentação (`204`) |

Convenções de contrato (detalhes nas specs):

- `amountCents`: inteiro positivo, em centavos de BRL (ex: `5000` = R$ 50,00). O sinal vem do `type`.
- `type`: `INCOME` (receita) ou `EXPENSE` (despesa).
- `date`: `YYYY-MM-DD`; omitido → data atual do servidor.
- Erros: envelope `{ statusCode, message, error }` (validação `400` com `message` em array).

## Estrutura (camadas)

```text
src/
├── common/                 # global: utils, constants, decorators, filters, pipes
├── auth/                   # autenticação e usuários (controllers/services/repositories/dto/entities)
├── categories/             # categorias
├── transactions/           # movimentações + resumo
└── database/               # conexão Drizzle (token DRIZZLE) + auto-migrate
```

Convenções detalhadas em [`AGENTS.md`](./AGENTS.md) e decisões de arquitetura em [`docs/adr/`](../docs/adr/) (ADR-0001 a 0009).

## Documentação

- Especificações (contratos): [`docs/specs/`](../docs/specs/)
- Decisões de arquitetura (ADRs): [`docs/adr/`](../docs/adr/)
- Roadmap de implementação: [`docs/tasks.md`](../docs/tasks.md)
- Docs operacionais: [`api/docs/`](./docs/)
