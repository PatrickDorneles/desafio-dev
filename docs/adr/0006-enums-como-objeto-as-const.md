---
id: 0006
status: "Accepted"
date: "2026-08-10"
deciders: ["PatrickDorneles"]
consulted: []
informed: []
tags: [backend, arquitetura]
technologies: [typescript, zod]
related: [0001, 0005]
supersedes: []
superseded_by: []
---

# ADR-0006 — Enums de domínio como objeto `as const` + union derivada (preferir enum)

## Contexto e Problema (Context and Problem Statement)

O domínio de transações tem um conjunto fechado de valores — `type` ∈ `{ INCOME, EXPENSE }` — que cruza camadas: schema Zod dos DTOs, texto no SQLite (SQLite não tem enums), payloads de repositório e o service. Ele era modelado como uma union "nua":

```ts
export type TransactionType = 'INCOME' | 'EXPENSE';
```

Com isso, os literais `'INCOME'`/`'EXPENSE'` eram repetidos em 3 DTOs (`z.enum(['INCOME', 'EXPENSE'])`), no service e nos specs — sem um vocabulário nomeado e sem single source of truth: adicionar um tipo exigiria editar N lugares, e o risco de drift entre o tipo e o schema Zod é real.

## Drivers de Decisão (Decision Drivers)

1. **Single source of truth:** o conjunto de valores vive em um único lugar, referenciado por código e schemas Zod.
2. **Type-safety nas fronteiras:** valores vêm do Zod (strings validadas) e vão ao SQLite (coluna `text`) — o construto escolhido não pode exigir casts inseguros nessas fronteiras.
3. **Erase total:** sem emissão de código runtime inesperada; compatível com `isolatedModules` e com a ADR-0005 (tipos em `types/`).
4. **Consistência:** mesmo padrão para futuros domínios fechados (ex: status, papel).

## Opções Consideradas (Considered Options)

### Opção 1: Objeto `as const` + union derivada — escolhida

```ts
export const TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];
```

O const é o **vocabulário runtime** (`TransactionType.INCOME`); a union derivada é o **tipo** — e, por typing estrutural, strings legítimas do domínio (`'INCOME'`) são diretamente atribuíveis, sem casts. Schemas Zod referenciam o const:

```ts
type: z.enum(Object.values(TransactionType) as [TransactionType, ...TransactionType[]]),
```

- **Prós:** um lugar só; sem casts nas fronteiras Zod/SQLite; erasable (nada emitido, sem reverse mapping); ideomático e simples.
- **Contras:** um `as` contido e documentado na conversão para tupla do `z.enum`.
- **Riscos:** baixos.

### Opção 2: `enum` nativo do TypeScript

```ts
export enum TransactionType { INCOME = 'INCOME', EXPENSE = 'EXPENSE' }
```

- **Prós:** vocabulário nomeado com valor runtime; sem cast para `z.enum` via `Object.values`.
- **Contras:** typing **nominal** — a string `'INCOME'` validada pelo Zod **não é** atribuível a `TransactionType` sem cast forçado (`as unknown as TransactionType`), o que enfraquece a type-safety exatamente nas fronteiras (Zod → service → repository → DB) que mais importam; emite código runtime; armadilhas conhecidas (`const enum` + `isolatedModules`, reverse mapping de enums numéricos).
- **Riscos:** médios (casts nas fronteiras, ergonomia de migração).

### Opção 3: Manter a union de literais (status quo)

- **Prós:** nenhuma mudança.
- **Contras:** sem vocabulário nomeado; literais espalhados por DTOs/service/specs; sem valor runtime; risco de drift entre tipo e schema Zod.
- **Riscos:** médios (DRY, drift).

## Decisão (Decision Outcome)

**Domínios de valores fechados de string são modelados como objeto `as const` + union derivada**, declarados no `types/` do módulo (ADR-0005) e referenciados por código e schemas:

```ts
// src/<modulo>/types/<nome>.types.ts
export const NomeDoEnum = {
  VALOR1: 'VALOR1',
  VALOR2: 'VALOR2',
} as const;

export type NomeDoEnum = (typeof NomeDoEnum)[keyof typeof NomeDoEnum];
```

- **Não** usar `enum` nativo do TypeScript (nominal → casts nas fronteiras Zod/SQLite) nem unions de literais "nuas" espalhadas.
- Schemas Zod de DTOs referenciam o const: `z.enum(Object.values(NomeDoEnum) as [NomeDoEnum, ...NomeDoEnum[]])`.
- Código de comportamento usa os membros do const (`NomeDoEnum.VALOR1`) em vez de literais soltos.
- Specs podem usar literais (`'INCOME'`) — o typing estrutural garante compatibilidade e elas testam a fronteira real.
- Aplicado agora: `TransactionType` em `api/src/transactions/types/transaction.types.ts`, com `create`/`update`/`response` DTOs e `TransactionsService.getSummary` referenciando o const.

## Consequências (Consequences)

- **Positivas:** single source of truth para o domínio; sem casts nas fronteiras; zero emissão runtime; padrão reutilizável para novos domínios fechados.
- **Negativas:** um `as` contido para a tupla do `z.enum`; ajuste de imports onde o const for consumido.
- **Neutras / follow-ups:** atualizar `AGENTS.md` e o roadmap `docs/tasks.md`; se um domínio precisar de comportamento (métodos) além de valor+tipo, avaliar um const-map de helpers ao lado — sem mudar o padrão de tipo.

## Critérios de Reavaliação (Revisit Criteria)

- Se o TypeScript/Zod passarem a oferecer enums nativos com compatibilidade estrutural nas fronteiras, reavaliar a opção 2.
- Se o padrão `as const` + `z.enum` se provar repetitivo em muitos módulos, extrair um helper compartilhado em `common/` — sem alterar o modelo de tipos.

## Links

- [ADR-0005](./0005-tipos-por-modulo.md) — tipos por módulo em `types/` (esta decisão detalha o tratamento de enums).
- [ADR-0001](./0001-drizzle-orm-e-sqlite.md) — banco/ORM (SQLite `text` + validação Zod).
- Spec [003](../specs/003-movimentacoes.md) — domínio de transações (`type` INCOME/EXPENSE).
- Roadmap: [tasks](../tasks.md).
