---
spec-id: "003"
title: "Movimentações"
status: "Proposed"              # Draft | Proposed | Approved | Implemented | Superseded
author: "PatrickDorneles"
created: "2026-08-10"
updated: "2026-08-10"
related-specs: ["001-autenticacao-e-usuarios", "002-categorias"]
related-adrs: ["0001"]
---

# Spec 003 — Movimentações

> CRUD de movimentações financeiras (full CRUD) restrito ao usuário autenticado, com tipo (receita/despesa), valor em centavos (BRL), data, categoria opcional e endpoint de resumo.

## 1. Objetivo (Goal)

- O usuário autenticado registra, lista, edita e remove suas movimentações financeiras.
- Cada movimentação tem tipo `INCOME`/`EXPENSE`, valor positivo em centavos, descrição, data e categoria opcional.
- O usuário vê o resumo da sua situação: total de receitas, total de despesas e saldo.

## 2. Não-objetivos (Non-Goals)

- Filtros server-side (listagem **paginada** — ver ADR-0007; filtros por data/categoria/tipo ficam para o cliente, se desejado).
- Transações recorrentes, parcelamento, anexos/comprovantes, tags.
- Múltiplas moedas (apenas BRL, inteiro em centavos) e valores negativos no payload (sinal vem do `type`).
- Transferências entre contas, budgets/limites, relatórios por categoria/período.
- Nenhum cálculo de saldo por categoria.

## 3. Escopo e premissas (Scope & Assumptions)

- Toda rota exige `Authorization: Bearer <jwt>` (guard da Spec 001); sem token válido → `401`.
- Propriedade: **todas** as queries filtram por `userId` do token — nunca por dados da requisição (mesma regra da Spec 002).
- **Valor:** `amountCents` inteiro positivo (BRL, em centavos). Tipo `INCOME`/`EXPENSE` (text no banco + `z.enum` — SQLite não tem enum).
- **Descrição:** obrigatória, 1–200 caracteres (trim).
- **Data:** `date` em `YYYY-MM-DD` (granularidade dia), default = data atual do servidor, editável; datas futuras permitidas.
- **Categoria:** opcional (`categoryId` nullable). Se fornecida, DEVE pertencer ao usuário autenticado (senão `400`).
- Exclusão de categoria → `categoryId` vira `NULL` (SET NULL, Spec 002).
- Envelope de erro `{ statusCode, message, error }` (Spec 001).
- **Atenção de implementação:** `GET /transactions/summary` deve ser registrado ANTES do `GET /transactions/:id` no controller (evita o segmento `:id` capturar `summary`).

## 4. User Stories

| ID | Prioridade | História | Justificativa da prioridade |
|---|---|---|---|
| US-01 | P1 | Como usuário autenticado, quero registrar receitas e despesas (valor, descrição, data, categoria), para acompanhar meu dinheiro. | Núcleo do desafio. |
| US-02 | P1 | Como usuário autenticado, quero listar minhas movimentações da mais recente para a mais antiga, para revisar meus lançamentos. | Necessário para a UI. |
| US-03 | P2 | Como usuário autenticado, quero editar e excluir lançamentos, para corrigir erros. | Full CRUD (decisão de escopo). |
| US-04 | P2 | Como usuário autenticado, quero ver meu resumo (receitas, despesas, saldo), para entender minha situação financeira. | Diferencial barato (agregação SQL). |

## 5. Requisitos Funcionais (FR)

- **FR-001**: QUANDO um usuário autenticado cria uma movimentação com `{ type, amountCents, description, date?, categoryId? }` válidos O SISTEMA DEVE persistir o lançamento vinculado ao `userId` do token e retornar `201`.
- **FR-002**: QUANDO `amountCents` é `<= 0` ou não é inteiro O SISTEMA DEVE rejeitar com `400`.
- **FR-003**: QUANDO `categoryId` é fornecido mas não existe ou pertence a outro usuário O SISTEMA DEVE rejeitar com `400`.
- **FR-004**: QUANDO um usuário autenticado lista movimentações (`GET /transactions?page&pageSize`) O SISTEMA DEVE retornar `200` com `{ data, meta }` — apenas as suas, ordenadas por `date` DESC (desempate: `createdAt` DESC, depois `id` DESC), página 1-based (default `1`), `pageSize` default `10` (máximo `100`), e `meta` com `page`, `pageSize`, `totalItems`, `totalPages`, `hasNextPage`, `hasPreviousPage` (ADR-0007).
- **FR-005**: QUANDO um usuário autenticado busca uma movimentação por `id` O SISTEMA DEVE retornar `200` se for sua; QUANDO não existe **ou** pertence a outro usuário O SISTEMA DEVE retornar `404` idêntico (sem distinguir).
- **FR-006**: QUANDO um usuário autenticado atualiza movimentação própria (`PATCH` parcial: `type?/amountCents?/description?/date?/categoryId?`) O SISTEMA DEVE aplicar as mudanças, revalidar (inclusive categoria, regra FR-003) e retornar `200`. `categoryId: null` remove o vínculo.
- **FR-007**: QUANDO um usuário autenticado exclui movimentação própria O SISTEMA DEVE removê-la e retornar `204`.
- **FR-008**: QUANDO um usuário autenticado solicita `GET /transactions/summary` O SISTEMA DEVE retornar `200` com `{ totalIncomeCents, totalExpenseCents, balanceCents }` calculados sobre as suas movimentações (`balance = income - expense`; sem lançamentos → todos `0`).
- **FR-009**: QUANDO `date` é omitido O SISTEMA DEVE usar a data atual do servidor (`YYYY-MM-DD`).
- **FR-010**: QUANDO a categoria vinculada a lançamentos é excluída O SISTEMA DEVE manter os lançamentos com `categoryId = NULL` (SET NULL — Spec 002).
- **FR-011**: QUANDO o usuário dono é excluído (cenário futuro) O SISTEMA DEVE remover suas movimentações em cascata.
- **FR-012**: QUANDO qualquer rota de movimentações é chamada sem token válido O SISTEMA DEVE retornar `401`.

## 6. Critérios de Aceitação (Given/When/Then)

- **CA-001**:
  - DADO um usuário autenticado com uma categoria própria
  - QUANDO envio `POST /transactions` com `{ type: "EXPENSE", amountCents: 5000, description: "Almoço", date: "2026-08-10", categoryId: "<id da categoria>" }`
  - ENTÃO recebo `201` com o lançamento criado (com `userId` do token), e ele aparece na listagem.
- **CA-002**:
  - DADO um usuário autenticado
  - QUANDO envio `POST /transactions` com `amountCents: 0` (ou negativo, ou decimal)
  - ENTÃO recebo `400` e nenhum lançamento é criado.
- **CA-003**:
  - DADO uma categoria que pertence a OUTRO usuário
  - QUANDO envio `POST /transactions` com esse `categoryId`
  - ENTÃO recebo `400` e nenhum lançamento é criado.
- **CA-004**:
  - DADO um usuário com lançamentos de datas diferentes
  - QUANDO envio `GET /transactions`
  - ENTÃO recebo `200` apenas com os seus, do `date` mais recente para o mais antigo.
- **CA-005**:
  - DADO o id de um lançamento de outro usuário (ou id inexistente)
  - QUANDO envio `GET /transactions/:id` (ou `PATCH`/`DELETE`)
  - ENTÃO recebo `404` — idêntico ao caso de id inexistente.
- **CA-006**:
  - DADO um lançamento próprio com categoria vinculada
  - QUANDO envio `PATCH /transactions/:id` com `{ "categoryId": null }`
  - ENTÃO recebo `200` e o lançamento fica com `categoryId: null`.
- **CA-007**:
  - DADO um usuário com receitas (R$ 100,00) e despesas (R$ 30,00)
  - QUANDO envio `GET /transactions/summary`
  - ENTÃO recebo `200` com `{ totalIncomeCents: 10000, totalExpenseCents: 3000, balanceCents: 7000 }`.
- **CA-008**:
  - DADO um usuário sem lançamentos
  - QUANDO envio `GET /transactions/summary`
  - ENTÃO recebo `200` com `{ totalIncomeCents: 0, totalExpenseCents: 0, balanceCents: 0 }`.
- **CA-009**:
  - DADO nenhum token (ou token inválido/expirado)
  - QUANDO acesso qualquer rota de movimentações
  - ENTÃO recebo `401 Unauthorized`.

## 7. Casos de borda (Edge Cases)

- **FR-013**: QUANDO `date` não é uma data ISO válida (`2026-02-31`, formato errado) O SISTEMA DEVE rejeitar com `400`.
- **FR-014**: QUANDO `description` é vazia ou só espaços O SISTEMA DEVE rejeitar com `400` (trim antes de validar).
- **FR-015**: QUANDO `PATCH` é enviado sem nenhum campo válido O SISTEMA DEVE rejeitar com `400`.
- **FR-016**: QUANDO o `id` da URL não é um uuid válido O SISTEMA DEVE rejeitar com `400`.
- **FR-017**: QUANDO `type` não é `INCOME` nem `EXPENSE` O SISTEMA DEVE rejeitar com `400`.
- **FR-018**: QUANDO dois lançamentos têm a mesma `date` O SISTEMA DEVE ordená-los por `createdAt` DESC (ordem estável).

## 8. Contratos de Dados (Entities)

| Entidade | Atributos | Relacionamentos |
|---|---|---|
| `transactions` | `id` (text, PK, uuid) · `userId` (text, FK → users.id, `ON DELETE CASCADE`) · `categoryId` (text, FK → categories.id, nullable, `ON DELETE SET NULL`) · `type` (text: `INCOME`\|`EXPENSE`) · `amountCents` (integer, > 0) · `description` (text, 1–200) · `date` (text `YYYY-MM-DD`) · `createdAt` (integer, unix ms) · `updatedAt` (integer, unix ms) | N:1 com `users` · N:1 opcional com `categories` |

## 9. Contratos de API

Todas as rotas exigem `Authorization: Bearer <jwt>`.

### `POST /transactions`

```json
// request
{ "type": "EXPENSE", "amountCents": 5000, "description": "Almoço", "date": "2026-08-10", "categoryId": "uuid?" }

// response 201
{ "id": "uuid", "userId": "uuid", "categoryId": "uuid | null", "type": "EXPENSE", "amountCents": 5000, "description": "Almoço", "date": "2026-08-10", "createdAt": 1780000000000, "updatedAt": 1780000000000 }

// erros: 400 (validação ou categoria inválida) · 401
```

### `GET /transactions` (paginada — ADR-0007)

```json
// query opcional: page (default 1) · pageSize (default 10, máximo 100)
// response 200 (date DESC, desempate createdAt DESC, depois id DESC)
{
  "data": [
    { "id": "uuid", "userId": "uuid", "categoryId": "uuid | null", "type": "INCOME", "amountCents": 10000, "description": "Salário", "date": "2026-08-01", "createdAt": 1780000000000, "updatedAt": 1780000000000 }
  ],
  "meta": { "page": 1, "pageSize": 10, "totalItems": 34, "totalPages": 4, "hasNextPage": true, "hasPreviousPage": false }
}

// página além do fim → 200 com data: [] · erros: 400 (page/pageSize inválidos) · 401
```

### `GET /transactions/summary`

```json
// response 200
{ "totalIncomeCents": 10000, "totalExpenseCents": 3000, "balanceCents": 7000 }

// erros: 401
```

### `GET /transactions/:id`

```json
// response 200
{ "id": "uuid", "userId": "uuid", "categoryId": "uuid | null", "type": "INCOME", "amountCents": 10000, "description": "Salário", "date": "2026-08-01", "createdAt": 1780000000000, "updatedAt": 1780000000000 }

// erros: 400 (uuid inválido) · 401 · 404 (inexistente ou de outro usuário)
```

### `PATCH /transactions/:id`

```json
// request (ao menos um campo; categoryId aceita null para remover o vínculo)
{ "amountCents": 5500, "categoryId": null }

// response 200 (lançamento atualizado, mesmos campos do GET)

// erros: 400 · 401 · 404
```

### `DELETE /transactions/:id`

```json
// response 204 (sem corpo)

// erros: 400 · 401 · 404
```

## 10. Tratamento de Erros

- Envelope e status consistentes (Spec 001): `400` validação, `401` autenticação, `404` não encontrado/sem propriedade (sem distinção).
- `categoryId` inválido (inexistente ou de outro usuário) → `400` com mensagem clara.
- Não revelar existência de dados de outros usuários.

## 11. Critérios de Sucesso (SC)

- **SC-001**: Nenhuma rota de movimentações opera sobre `userId` vindo da requisição — sempre do token (teste e2e com dois usuários).
- **SC-002**: `balanceCents` do resumo é sempre `totalIncomeCents - totalExpenseCents` (verificável por teste unitário/e2e).
- **SC-003**: Excluir uma categoria nunca deixa lançamentos órfãos (`categoryId` sempre `NULL` ou id existente — teste e2e).

## 12. Perguntas em aberto (Open Questions)

- Nenhuma — data, lista simples e endpoint de resumo decididos.

## 13. Referências / Evidências

- README.md — Requisitos Técnicos (cadastro de movimentações, associação ao usuário autenticado, associação de categorias).
- Spec [001-autenticacao-e-usuarios](./001-autenticacao-e-usuarios.md) e [002-categorias](./002-categorias.md).
- [ADR-0001](../adr/0001-drizzle-orm-e-sqlite.md) — banco/ORM.
- Evidências esperadas: testes unitários (service com repositório mockado — validações e soma do resumo) e e2e (CRUD + isolamento entre usuários + resumo + SET NULL via exclusão de categoria).
