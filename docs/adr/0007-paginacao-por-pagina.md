---
id: 0007
status: "Accepted"
date: "2026-08-10"
deciders: ["PatrickDorneles"]
consulted: []
informed: []
tags: [backend, api]
technologies: [nestjs, drizzle-orm, zod]
related: [0003, 0005]
supersedes: []
superseded_by: []
---

# ADR-0007 — Paginação por página (offset/limit) com meta para a UI

## Contexto e Problema (Context and Problem Statement)

`GET /transactions` retornava a lista completa de movimentações em um único array (Spec 003). A UI precisará paginar essa listagem e, para montar controles (nº da página, "última página", "total de elementos", botões anterior/próxima), precisa de **dados de paginação junto com os itens** — não só de uma lista truncada. A Spec 003 listava "paginação/filtros server-side" como não-objetivo; esta ADR **supera esse ponto** para a rota de listagem (filtros continuam client-side).

## Drivers de Decisão (Decision Drivers)

1. **Meta para a UI:** a resposta precisa expor número total de itens, total de páginas/última página e flags de navegação (`hasNextPage`/`hasPreviousPage`).
2. **Reutilizável:** a estratégia deve valer para futuras listagens (ex: categorias) — a computação da meta é o pedaço repetível.
3. **Simplicidade:** offset/limit é suficiente no escopo (volume pequeno, SQLite); sem sobre-engenharia.
4. **Estabilidade:** a mesma linha nunca pode aparecer em duas páginas nem sumir entre páginas (ordenação determinística).

## Opções Consideradas (Considered Options)

### Opção 1: Offset/limit com `page`/`pageSize` e meta — escolhida

- **Prós:** simples; SQL nativo (`LIMIT/OFFSET`); meta trivial de calcular com `totalItems`; convenção familiar para frontends; `totalPages`/`last page` disponíveis para a UI.
- **Contras:** offset custa O(n) em páginas profundas (aceitável no escopo).
- **Riscos:** baixos.

### Opção 2: Cursor (keyset pagination)

- **Prós:** estável e eficiente para volumes grandes.
- **Contras:** não dá "número de páginas"/"last page" sem um `COUNT` extra que anula a vantagem; API mais complexa (cursor opaco); desproporcional ao escopo.
- **Riscos:** médios (complexidade).

### Opção 3: Manter lista completa (status quo)

- **Prós:** nenhuma mudança.
- **Contras:** sem paginação e sem meta — exatamente o problema relatado.
- **Riscos:** médios (UI).

## Decisão (Decision Outcome)

**`GET /transactions` passa a ser paginada por offset/limit com meta:**

- **Query params:** `page` (1-based, default `1`) e `pageSize` (default `10`, máximo `100` — acima do cap → `400`). Validados por DTO Zod (`z.coerce.number()` — query vem como string no Fastify).
- **Resposta `200`:**

```json
{
  "data": [ /* TransactionRow[], página corrente, ordenação estável */ ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 34,
    "totalPages": 4,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

- `totalPages = ceil(totalItems / pageSize)`; `hasNextPage = page < totalPages`; `hasPreviousPage = page > 1`. Página além do fim → `200` com `data: []` (não é `404`).
- **Ordenação estável:** `date DESC, createdAt DESC, id DESC` — o `id` é o desempate final que garante páginas sem duplicidade/omissão.
- **Pedaço repetível → util (apenas o necessário):** `buildPaginationMeta(page, pageSize, totalItems)` em `src/common/utils/pagination.util.ts`, com o tipo global `PaginationMeta` em `src/common/types/pagination.ts` (ADR-0005). Reuso futuro: qualquer listagem paginada usa o mesmo util/tipo/forma de meta.
- **Contagem:** método síncrono no repository (`count()` select + `.get()`), mantendo a convenção sync do projeto — **não** usar `db.$count` (é async).
- Substitui o não-objetivo "paginação server-side" da Spec 003 para a listagem de movimentações; filtros por data/categoria/tipo permanecem client-side.

## Consequências (Consequences)

- **Positivas:** UI recebe dados + meta prontos para controles de paginação; estratégia e util reutilizáveis; ordenação estável.
- **Negativas:** quebra de contrato da rota (array → `{ data, meta }`) — Spec 003 e e2e atualizados; um `COUNT` extra por chamada (aceitável).
- **Neutras / follow-ups:** atualizar `AGENTS.md` e o roadmap `docs/tasks.md`.

## Critérios de Reavaliação (Revisit Criteria)

- Volume grande ou páginas profundas → avaliar cursor/keyset (mantendo a mesma meta para a UI).
- Necessidade de filtros server-side (data, categoria, tipo) → combinar com a mesma estratégia de paginação e meta.

## Links

- [Spec 003](../specs/003-movimentacoes.md) — rota de movimentações (esta ADR atualiza o contrato de `GET /transactions`).
- [ADR-0005](./0005-tipos-por-modulo.md) — tipos globais em `src/common/types/`.
- [ADR-0003](./0003-arquitetura-em-camadas.md) — camadas por módulo.
- Roadmap: [tasks](../tasks.md).
