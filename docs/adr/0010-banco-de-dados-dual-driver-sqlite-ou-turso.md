---
id: 0010
status: "Accepted"
date: "2026-08-11"
deciders: ["Patrick Dorneles"]
consulted: []
informed: []
tags: [backend, dados, infra]
technologies: [drizzle-orm, sqlite, libsql, turso]
related: [0001]
supersedes: []
superseded_by: []
---

# ADR-0010 — Banco de dados dual-driver: SQLite local ou Turso (libSQL) remoto

## Contexto e Problema (Context and Problem Statement)

- O desafio pede deploy como diferencial (README §Diferenciais): aplicação hospedada, com banco persistido na nuvem.
- A API roda em SQLite via `better-sqlite3` (ADR-0001) — arquivo local, zero-config, perfeito para desenvolvimento e e2e (`:memory:`), mas não para produção em plataforma de deploy: o filesystem é efêmero.
- Necessidade: um único código que rode com SQLite local (dev/e2e) e com banco remoto gerenciado em produção, sem duplicar camadas de repositório.
- Restrição: Drizzle ORM continua sendo a única camada de acesso a dados (ADR-0003); contratos Zod e o restante da arquitetura não podem mudar.

## Drivers de Decisão (Decision Drivers)

- Custo operacional (zero infra para dev; gerenciado para prod).
- Compatibilidade com o schema SQLite já existente (migrations `./drizzle` reutilizáveis).
- Complexidade de código (evitar dois caminhos de acesso a dados divergentes).
- Compatibilidade com NestJS + ts-jest e TS strict (sem `any`).
- Alinhamento com convenções de mercado e do Turso.

## Opções Consideradas (Considered Options)

### Opção 1: Turso/libSQL via `@libsql/client` + `drizzle-orm/libsql`

- **Prós:** Turso é SQLite — mesmas migrations, mesmo dialect; `drizzle-orm/libsql` é o driver oficial Drizzle; suporta `migrate()` remoto (transação batched via hrana); plano gratuito; `file:` URLs permitem testar a branch Turso localmente sem rede.
- **Contras:** driver assíncrono (Promises) vs `better-sqlite3` síncrono — exige padronizar repositórios com `await` (await em valor síncrono é no-op); tipos `BetterSQLite3Database | LibSQLDatabase` não têm um tipo-único exportado (diferem em `TResultKind`/`TRunResult`).
- **Riscos:** `select(fields)` overload não resolve no union em alguns call sites (corrigido com cast estreito ao membro `LibSQLDatabase` + comentário); migrate remoto em lote único pode atingir limites de transação em migrações muito grandes (não é o caso — schema pequeno).

### Opção 2: Postgres (Neon/Supabase) + driver Postgres do Drizzle

- **Prós:** banco relacional de produção mais convencional.
- **Contras:** quebra o ADR-0001 (SQLite); schema/repositórios precisariam de reescrita (`pg-core` vs `sqlite-core`); migrations precisariam ser regeneradas; mais infra a configurar para o tamanho do projeto.
- **Riscos:** retrabalho alto para benefício marginal neste contexto.

### Opção 3: Status quo (só SQLite local) e deploy sem banco

- **Prós:** zero mudança.
- **Contras:** dado efêmero em produção — inviável para o diferencial de deploy com movimentações persistidas.
- **Riscos:** avaliação percebe a lacuna do diferencial (dado desaparece a cada deploy).

## Decisão (Decision Outcome)

- **Usar Turso/libSQL em produção e SQLite local em dev/e2e**, com chave de seleção por env: `TURSO_DATABASE_URL` definido → branch libsql (remoto/assíncrono); ausente → `better-sqlite3` (local/síncrono). Migrations `./drizzle` são compartilhadas (ambos são SQLite).
- Repositórios passam a ser **síncronos de contrato** no código (todas as chamadas com `await`) para manter um único caminho; deletes via `.returning()` (libsql `ResultSet` não expõe `.changes`).
- **Não** estamos otimizando: suporte multi-banco além de SQLite/libSQL, nem deploy com Postgres — o schema não tem necessidade deles.

## Consequências (Consequences)

- **Positivas:** um código, dois ambientes; deploy viável com dado persistido; e2e continua em `:memory:` (in-memory better-sqlite3); Turso gratuito; branch Turso testável localmente com `file:` URL sem rede.
- **Negativas:** repositórios ficaram `async` (perda da simplicidade síncrona do `better-sqlite3`); união de tipos exige disciplina (`await` sempre) e dois casts estreitos documentados em `transactions.repository.ts`.
- **Neutras / follow-ups:** `drizzle.config.ts` alterna `dialect: 'sqlite' | 'turso'` conforme env; `authToken` opcional (permite `turso dev` local); documentar variáveis `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` no README.

## Critérios de Reavaliação (Revisit Criteria)

- Se o schema crescer a ponto de migrações grandes excederem limites de transação remota do Turso.
- Se a aplicação precisar de recursos indisponíveis no SQLite (concorrência de escrita intensa, tipos avançados, replicação multi-região) — aí avaliar Postgres, com reescrita de repositórios.

## Links

- ADR-0001 (Drizzle ORM + SQLite): `docs/adr/0001-drizzle-orm-e-sqlite.md`
- PR: `362d2c9` (feat(api): banco de dados dual-driver)
- Drizzle libSQL: `drizzle-orm/libsql` · Turso docs: `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`
