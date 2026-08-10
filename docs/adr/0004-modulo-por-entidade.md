---
id: 0004
status: "Accepted"
date: "2026-08-10"
deciders: ["PatrickDorneles"]
consulted: []
informed: []
tags: [backend, arquitetura]
technologies: [nestjs, drizzle-orm]
related: [0001, 0003]
supersedes: []
superseded_by: []
---

# ADR-0004 — Módulo por entidade (entity-per-module) com repositório exportado

## Contexto e Problema (Context and Problem Statement)

O ADR-0003 definiu camadas por módulo e abriu uma exceção: "módulo `auth` gerencia a entidade `users` e seu repositório". Com o crescimento da API, essa exceção criou ambiguidade: a entidade `users` — referenciada por FKs de `categories` e `transactions` — pertencia ao módulo `auth`, que misturava duas responsabilidades (autenticação/fluxo e posse da entidade de usuário). Não há regra clara de onde uma entidade mora nem de como um módulo consome o repositório de outra entidade.

## Drivers de Decisão (Decision Drivers)

1. **Posse única:** cada entidade tem exatamente um dono de schema e de repositório (sem ambiguidade de onde adicionar coluna/migração).
2. **Reuso sem acoplamento:** módulos consumidores usam o repositório de outra entidade via import de módulo que o **exporta** — sem providers privados ou dependências "escondidas".
3. **Consistência:** `categories` e `transactions` já seguem o padrão; uniformizar `users`.
4. **Simplicidade:** nenhuma abstração extra (base classes, módulo global de entidades) necessária no escopo.

## Opções Consideradas (Considered Options)

### Opção 1: Módulo por entidade — escolhida

Cada entidade vive em seu próprio módulo (`src/<entidade>/`), que possui o schema Drizzle (`entities/`), o repositório (`repositories/`) e **exporta o repositório** no `module.ts`. Módulos consumidores importam o módulo dono e injetam o repositório exportado.

- **Prós:** posse única; reuso explícito via exports; `auth` deixa de ser dono de entidade (fica puro fluxo de autenticação); padrão previsível para agentes.
- **Contras:** mais um módulo registrado; importações entre entidades (FKs) cruzam módulos (já ocorre hoje).
- **Riscos:** baixos.

### Opção 2: Manter `auth` como dono de `users` (status quo do ADR-0003)

- **Prós:** nenhuma mudança.
- **Contras:** `auth` acumula duas responsabilidades; regra "módulo ↔ entidade" tem exceção permanente; futuro uso de `UsersRepository` por outros módulos fica acoplado a `auth`.
- **Riscos:** médios (ambiguidade, DRY).

### Opção 3: Entidades centralizadas (ex: `src/database/entities/`)

- **Prós:** um lugar só para schemas.
- **Contras:** pasta "god" desconectada dos módulos; quebra a coesão por feature; repositórios continuariam espalhados.
- **Riscos:** médios (manutenção).

## Decisão (Decision Outcome)

**Cada entidade tem seu próprio módulo.** A entidade `users` (schema + repositório) sai de `auth/` e passa a viver em `src/users/`:

```text
src/users/
├── users.module.ts            # providers + exports: [UsersRepository]
├── entities/users.entity.ts   # schema Drizzle da tabela users
└── repositories/
    ├── users.repository.ts
    └── users.repository.spec.ts
```

- O módulo **exporta o repositório** (`exports: [UsersRepository]`); consumidores importam `UsersModule` e injetam `UsersRepository` (ex: `auth` usa em `AuthService`).
- O módulo `auth` deixa de ter entidade própria: fica apenas com o fluxo de autenticação (controller, service, guards, DTOs) e importa `UsersModule`.
- FKs entre entidades continuam referenciando a tabela via import direto do arquivo da entidade dona (`src/users/entities/users.entity`), como já acontece em `categories` e `transactions`.
- Esta decisão **substitui a exceção** do ADR-0003 ("auth gerencia a entidade users"); o restante do ADR-0003 permanece válido.

## Consequências (Consequences)

- **Positivas:** posse única e explícita de cada entidade; repositórios reutilizáveis via exports padrão do Nest; `auth` com responsabilidade única; regra simples e documentável.
- **Negativas:** mais um módulo (`users`) registrado no `AppModule`/imports; mudança de paths em imports existentes.
- **Neutras / follow-ups:** atualizar `AGENTS.md` e o roadmap `docs/tasks.md` com a regra.

## Critérios de Reavaliação (Revisit Criteria)

- Se surgirem muitos repositórios com lógica comum, avaliar extrair base comum em `common/` — sem alterar a posse de entidades por módulo.
- Se entidades precisarem de repositórios de outras entidades com frequência, revisar se o acoplamento indica redesign do domínio.

## Links

- [ADR-0003](./0003-arquitetura-em-camadas.md) — camadas por módulo (esta decisão substitui a exceção "auth gerencia users").
- [ADR-0001](./0001-drizzle-orm-e-sqlite.md) — banco/ORM.
- Specs [001](../specs/001-autenticacao-e-usuarios.md), [002](../specs/002-categorias.md), [003](../specs/003-movimentacoes.md).
- Roadmap: [tasks](../tasks.md).
