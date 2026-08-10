---
spec-id: "002"
title: "Categorias"
status: "Proposed"              # Draft | Proposed | Approved | Implemented | Superseded
author: "PatrickDorneles"
created: "2026-08-10"
updated: "2026-08-10"
related-specs: ["001-autenticacao-e-usuarios", "003-movimentacoes"]
related-adrs: ["0001"]
---

# Spec 002 — Categorias

> CRUD de categorias de movimentações, restrito ao usuário autenticado (full CRUD). Categorias têm nome, cor e ícone; o vínculo com movimentações é opcional (Spec 003).

## 1. Objetivo (Goal)

- O usuário autenticado cria, lista, edita e remove suas próprias categorias.
- Categorias servem para classificar movimentações (vínculo opcional, Spec 003).
- Nenhum usuário vê ou altera categorias de outro usuário.

## 2. Não-objetivos (Non-Goals)

- Categorias pré-definidas/semeadas no cadastro (sem defaults; usuário cria as suas).
- Categorias globais/compartilhadas entre usuários.
- Ordenação manual (drag & drop), budgets/limites por categoria, merge de categorias.
- Categorias hierárquicas (subcategorias).

## 3. Escopo e premissas (Scope & Assumptions)

- Toda rota exige `Authorization: Bearer <jwt>` (mesmo guard da Spec 001); requisição sem token válido → `401`.
- Propriedade: **todas** as queries filtram por `userId` extraído do token — nunca por dados da requisição.
- Campos: `name` (obrigatório, 1–50), `color` (hex `#RRGGBB`, opcional), `icon` (string 1–50, opcional).
- Unicidade: nome único **por usuário**, com verificação case-insensitive (409); constraint única `(userId, name)` no banco.
- Exclusão de categoria com movimentações: `ON DELETE SET NULL` (movimentações ficam sem categoria — consistente com vínculo opcional).
- Ordenação padrão da listagem: por nome, case-insensitive, crescente.
- Formato de erro: envelope `{ statusCode, message, error }` (Spec 001).

## 4. User Stories

| ID | Prioridade | História | Justificativa da prioridade |
|---|---|---|---|
| US-01 | P1 | Como usuário autenticado, quero criar categorias com nome/cor/ícone, para classificar minhas movimentações. | Dependência da Spec 003. |
| US-02 | P1 | Como usuário autenticado, quero listar minhas categorias, para escolhê-las em formulários. | Necessário para o dropdown de movimentações. |
| US-03 | P2 | Como usuário autenticado, quero editar e remover categorias, para manter a organização. | Full CRUD (decisão de escopo). |

## 5. Requisitos Funcionais (FR)

- **FR-001**: QUANDO um usuário autenticado cria uma categoria com `{ name, color?, icon? }` válidos O SISTEMA DEVE persistir a categoria vinculada ao `userId` do token e retornar `201` com a categoria criada.
- **FR-002**: QUANDO um usuário autenticado cria/renomeia uma categoria para um nome que já existe nas suas categorias (case-insensitive) O SISTEMA DEVE rejeitar com `409 Conflict`.
- **FR-003**: QUANDO um usuário autenticado lista categorias O SISTEMA DEVE retornar `200` apenas com as categorias do próprio usuário, ordenadas por nome (case-insensitive, crescente).
- **FR-004**: QUANDO um usuário autenticado busca uma categoria por `id` O SISTEMA DEVE retornar `200` se a categoria for sua; QUANDO a categoria não existe **ou** pertence a outro usuário O SISTEMA DEVE retornar `404` sem distinguir os dois casos.
- **FR-005**: QUANDO um usuário autenticado atualiza uma categoria própria (`PATCH`, campos parciais `name?/color?/icon?`) O SISTEMA DEVE aplicar as mudanças, validar unicidade do novo nome e retornar `200`.
- **FR-006**: QUANDO um usuário autenticado exclui uma categoria própria O SISTEMA DEVE removê-la, definir `categoryId` das movimentações referentes como `NULL` (`ON DELETE SET NULL`) e retornar `204`.
- **FR-007**: QUANDO qualquer endpoint de categorias é chamado sem token válido O SISTEMA DEVE retornar `401 Unauthorized`.
- **FR-008**: QUANDO o dono do usuário é excluído (cenário futuro) O SISTEMA DEVE remover suas categorias em cascata (`ON DELETE CASCADE` no `userId`).

## 6. Critérios de Aceitação (Given/When/Then)

- **CA-001**:
  - DADO um usuário autenticado
  - QUANDO envio `POST /categories` com `{ name: "Alimentação", color: "#FF5733", icon: "utensils" }`
  - ENTÃO recebo `201` com a categoria criada (incluindo `id`, `userId`, timestamps), e ela aparece na listagem do usuário.
- **CA-002**:
  - DADO um usuário que já tem a categoria "Alimentação"
  - QUANDO envio `POST /categories` com nome "alimentação" (caixa diferente)
  - ENTÃO recebo `409` e nenhuma categoria duplicada é criada.
- **CA-003**:
  - DADO um usuário com categorias
  - QUANDO envio `GET /categories`
  - ENTÃO recebo `200` com somente as suas categorias, ordenadas por nome, e nenhuma categoria de outro usuário.
- **CA-004**:
  - DADO o id de uma categoria de OUTRO usuário (ou id inexistente)
  - QUANDO envio `GET /categories/:id` (ou `PATCH`/`DELETE`)
  - ENTÃO recebo `404` — idêntico ao caso de id inexistente.
- **CA-005**:
  - DADO uma categoria com movimentações vinculadas
  - QUANDO envio `DELETE /categories/:id`
  - ENTÃO recebo `204`, a categoria some e as movimentações passam a ter `categoryId: null`.
- **CA-006**:
  - DADO nenhum token (ou token inválido/expirado)
  - QUANDO acesso qualquer rota de categorias
  - ENTÃO recebo `401 Unauthorized`.

## 7. Casos de borda (Edge Cases)

- **FR-009**: QUANDO o `name` é vazio ou só espaços O SISTEMA DEVE rejeitar com `400` (trim antes de validar).
- **FR-010**: QUANDO `color` não é hex `#RRGGBB` O SISTEMA DEVE rejeitar com `400`.
- **FR-011**: QUANDO `PATCH` é enviado sem nenhum campo válido (ex: corpo vazio) O SISTEMA DEVE rejeitar com `400`.
- **FR-012**: QUANDO o `id` da URL não é um uuid válido O SISTEMA DEVE rejeitar com `400`.
- **FR-013**: QUANDO dois creates simultâneos usam o mesmo nome O SISTEMA DEVE garantir unicidade pela constraint do banco e retornar `409`.
- **FR-014**: QUANDO o usuário ainda não tem categorias O SISTEMA DEVE retornar `200` com lista vazia (`[]`).

## 8. Contratos de Dados (Entities)

| Entidade | Atributos | Relacionamentos |
|---|---|---|
| `categories` | `id` (text, PK, uuid) · `userId` (text, FK → users.id, `ON DELETE CASCADE`) · `name` (text, 1–50, único por usuário) · `color` (text hex, nullable) · `icon` (text 1–50, nullable) · `createdAt` (integer, unix ms) · `updatedAt` (integer, unix ms) | N:1 com `users` · 1:N com `transactions` (via `categoryId` nullable, `ON DELETE SET NULL`) |

## 9. Contratos de API

Todas as rotas exigem `Authorization: Bearer <jwt>`.

### `POST /categories`

```json
// request
{ "name": "Alimentação", "color": "#FF5733", "icon": "utensils" }

// response 201
{ "id": "uuid", "userId": "uuid", "name": "Alimentação", "color": "#FF5733", "icon": "utensils", "createdAt": 1780000000000, "updatedAt": 1780000000000 }

// erros: 400 (validação) · 401 · 409 (nome duplicado)
```

### `GET /categories`

```json
// response 200 (ordenada por nome, case-insensitive)
[
  { "id": "uuid", "userId": "uuid", "name": "Alimentação", "color": "#FF5733", "icon": "utensils", "createdAt": 1780000000000, "updatedAt": 1780000000000 }
]

// erros: 401
```

### `GET /categories/:id`

```json
// response 200
{ "id": "uuid", "userId": "uuid", "name": "Alimentação", "color": "#FF5733", "icon": "utensils", "createdAt": 1780000000000, "updatedAt": 1780000000000 }

// erros: 400 (uuid inválido) · 401 · 404 (inexistente ou de outro usuário)
```

### `PATCH /categories/:id`

```json
// request (todos os campos opcionais, ao menos um)
{ "name": "Mercado", "color": "#00AA55" }

// response 200
{ "id": "uuid", "userId": "uuid", "name": "Mercado", "color": "#00AA55", "icon": "utensils", "createdAt": 1780000000000, "updatedAt": 1780000000100 }

// erros: 400 · 401 · 404 · 409 (nome duplicado)
```

### `DELETE /categories/:id`

```json
// response 204 (sem corpo) — movimentações vinculadas ficam com categoryId = null

// erros: 400 · 401 · 404
```

## 10. Tratamento de Erros

- Mesmo envelope e status da Spec 001: `400` validação (Zod, `message` em array), `401` autenticação, `404` não encontrado/sem propriedade (sem distinção), `409` nome duplicado.
- Não revelar existência de dados de outros usuários (404 genérico).

## 11. Critérios de Sucesso (SC)

- **SC-001**: Nenhuma rota de categorias opera sobre `userId` vindo da requisição — sempre do token (verificável por teste e2e com dois usuários).
- **SC-002**: Exclusão de categoria nunca deixa movimentações órfãs com id inválido (`categoryId` sempre `NULL` ou id existente — verificável por teste e2e).

## 12. Perguntas em aberto (Open Questions)

- Nenhuma — campos (nome+cor+ícone), comportamento de exclusão (SET NULL) e ausência de seeding foram decididos.

## 13. Referências / Evidências

- README.md — Requisitos Técnicos (cadastro de categorias, movimentações por usuário autenticado).
- Spec [001-autenticacao-e-usuarios](./001-autenticacao-e-usuarios.md) — guard, envelope de erro, convenções.
- [ADR-0001](../adr/0001-drizzle-orm-e-sqlite.md) — banco/ORM.
- Evidências esperadas: testes unitários (service com repositório mockado) e e2e (CRUD + isolamento entre usuários + SET NULL).
