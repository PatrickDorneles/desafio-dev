---
id: 0001
status: "Accepted"
date: "2026-08-10"
deciders: ["PatrickDorneles"]
consulted: []
informed: []
tags: [dados, backend]
technologies: [drizzle-orm, sqlite, better-sqlite3]
related: []
supersedes: []
superseded_by: []
---

# ADR-0001 — Drizzle ORM + SQLite para persistência

## Contexto e Problema (Context and Problem Statement)

A aplicação precisa persistir usuários, categorias e movimentações em banco relacional. O README do desafio **exige** script SQL ou migrations executáveis via ORM, e o projeto deve rodar "seguindo as instruções do README" sem fricção. A stack foi definida sem infraestrutura externa: o avaliador não pode ser obrigado a subir um PostgreSQL ou Docker para avaliar.

## Drivers de Decisão (Decision Drivers)

1. Zero overhead de setup — rodar com 1 comando, sem serviços externos.
2. Migrations integradas (requisito obrigatório do desafio).
3. Type-safety total em TypeScript (a stack é TS strict).
4. Simplicidade e velocidade de entrega (prazo 3–5 dias).

## Opções Consideradas (Considered Options)

### Opção 1: Drizzle ORM + SQLite (`better-sqlite3`)

- **Prós:** leve, SQL-like, tipagem forte; `drizzle-kit` gera/aplica migrations (requisito do README); SQLite = arquivo local, sem infra; primeiro-class support para SQLite.
- **Contras:** menos "baterias inclusas" que Prisma (precisa montar o cliente); driver síncrono (`better-sqlite3`) — irrelevante na escala do desafio.
- **Riscos:** baixos.

### Opção 2: Prisma + SQLite

- **Prós:** DX excelente, migrations, ecossistema grande.
- **Contras:** camada de runtime/código gerado mais pesada; mais abstração para o escopo; schema em DSL própria (não TS).
- **Riscos:** médios (peso e opacidade para um desafio pequeno).

### Opção 3: TypeORM + SQLite

- **Prós:** maduro, decorators, integração NestJS clássica.
- **Contras:** história de SQLite mais fraca; API decorator-based menos type-safe; migrations verbosas.
- **Riscos:** médios.

### Opção 4: SQL puro / `node:sqlite`

- **Prós:** zero dependências.
- **Contras:** sem migrations tooling (viola requisito), sem tipagem, mais código manual.
- **Riscos:** altos para o requisito de migrations.

### Opção 5: Não fazer nada (status quo)

- Sem banco = não atende o desafio. Descartada.

## Decisão (Decision Outcome)

Vamos usar **Drizzle ORM + SQLite** com driver `better-sqlite3`, porque atende o requisito obrigatório de migrations com `drizzle-kit`, elimina infraestrutura externa e mantém tipagem TypeScript ponta a ponta. Não estamos otimizando para escala de produção ou concorrência alta.

## Consequências (Consequences)

- **Positivas:** avaliação do desafio roda com `npm install` + migrate + start; schema em TS no mesmo repo; migrations versionadas.
- **Negativas:** trocar para banco gerenciado (ex: Postgres) exigirá novo ADR e ajuste de driver/dialect.
- **Neutras / follow-ups:** definir local do schema (`src/db/schema.ts`) e configuração de ambiente (`DATABASE_URL`/`DB_PATH`); criar migration inicial junto da Spec 001.

## Critérios de Reavaliação (Revisit Criteria)

- Necessidade de deploy com banco gerenciado (Postgres/MySQL) ou requisitos de concorrência que SQLite não atenda → novo ADR para troca de driver/dialect.

## Links

- Spec [001-autenticacao-e-usuarios](../specs/001-autenticacao-e-usuarios.md) (fundação da API).
