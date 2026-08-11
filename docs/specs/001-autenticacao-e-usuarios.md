---
spec-id: "001"
title: "Autenticação e Usuários"
status: "Proposed"              # Draft | Proposed | Approved | Implemented | Superseded
author: "PatrickDorneles"
created: "2026-08-10"
updated: "2026-08-10"
related-specs: ["002-categorias", "003-movimentacoes"]
related-adrs: ["0001", "0002"]
---

# Spec 001 — Autenticação e Usuários

> Cadastro de usuários e login com JWT. Inclui a fundação da API (banco SQLite via Drizzle, configuração de ambiente, migrations) que esta funcionalidade exige para existir.

## 1. Objetivo (Goal)

- Um usuário pode criar uma conta (nome, e-mail, senha) e entrar na aplicação.
- Usuário autenticado obtém um token de acesso (JWT) que autoriza as demais funcionalidades (categorias, movimentações) — todas restritas aos dados do próprio usuário.
- A API fica funcional do zero: instalação → migrations → start, conforme o README.

## 2. Não-objetivos (Non-Goals)

- Refresh tokens, logout server-side, revogação de token, "lembrar-me".
- Verificação/recuperação de e-mail, reset de senha, confirmação de conta.
- Roles/permissões, admin, OAuth/login social.
- Rate limiting, 2FA, bloqueio por tentativas.
- Edição/deleção de usuário (não exigido pelo desafio).

## 3. Escopo e premissas (Scope & Assumptions)

- Inclui a fundação da API: conexão SQLite via Drizzle ORM (`better-sqlite3`), `drizzle.config.ts`, migrations via `drizzle-kit`, configuração por variáveis de ambiente (`.env`), e Swagger com esquema de Bearer.
- Autenticação: **JWT access token apenas** (HS256), enviado em `Authorization: Bearer <token>`. Expiração configurável (`JWT_EXPIRES_IN`, default `1h`).
- Senhas com **bcrypt** (cost 10–12). Nunca armazenar senha em texto puro.
- Moeda/valores não fazem parte desta spec (ver Spec 003).
- E-mails normalizados: trim + lowercase antes de validar/armazenar.
- Formato de erro consistente em toda a API: envelope NestJS `{ statusCode, message, error }`, com `message` em array para erros de validação (400).

## 4. User Stories

| ID | Prioridade | História | Justificativa da prioridade |
|---|---|---|---|
| US-01 | P1 | Como visitante, quero me cadastrar com nome, e-mail e senha, para ter uma conta própria. | Pré-requisito de tudo (movimentações são por usuário). |
| US-02 | P1 | Como usuário cadastrado, quero entrar com e-mail e senha, para obter acesso autenticado. | Porta de entrada de todas as demais features. |
| US-03 | P2 | Como usuário logado, quero ver meu perfil, para confirmar minha identidade no app. | Barato de implementar; usado pela UI para header/menu. |

## 5. Requisitos Funcionais (FR)

- **FR-001**: QUANDO um visitante se cadastra com nome (1–100), e-mail válido e senha (8–72) O SISTEMA DEVE criar o usuário com senha hasheada (bcrypt) e retornar `201`.
- **FR-002**: QUANDO um visitante se cadastra com e-mail já existente (case-insensitive) O SISTEMA DEVE rejeitar com `409 Conflict` e NÃO DEVE revelar detalhes sobre o e-mail em respostas de lista/erro.
- **FR-003**: QUANDO um usuário envia credenciais válidas em `/auth/login` O SISTEMA DEVE retornar `200` com um JWT (access token) e o perfil do usuário.
- **FR-004**: QUANDO um usuário envia e-mail ou senha inválidos em `/auth/login` O SISTEMA DEVE rejeitar com `401 Unauthorized` usando a MESMA mensagem para e-mail inexistente ou senha errada (não revelar qual campo falhou).
- **FR-005**: QUANDO uma requisição inclui um JWT válido em `Authorization: Bearer` O SISTEMA DEVE identificar o usuário autenticado **resolvendo-o no banco pelo `sub` do token**: usuário inexistente/removido → `401` genérico (o token sozinho não autoriza). As rotas protegidas recebem os dados do usuário (`id`, `name`, `email` — **nunca** o hash de senha) via `request.user`/`@CurrentUser()`.
- **FR-006**: QUANDO uma requisição a rota protegida traz JWT ausente, inválido ou expirado O SISTEMA DEVE rejeitar com `401 Unauthorized`.
- **FR-007**: QUANDO um usuário autenticado acessa `GET /auth/me` O SISTEMA DEVE retornar `200` com o perfil `{ id, name, email, createdAt }`.
- **FR-008**: QUANDO qualquer endpoint protegido é executado O SISTEMA DEVE garantir que todas as consultas filtram por `userId` do token (nunca por dado da requisição).
- **FR-009**: QUANDO a API inicia após `drizzle-kit migrate` O SISTEMA DEVE estar pronto para atender requisições, com a tabela `users` criada.

## 6. Critérios de Aceitação (Given/When/Then)

- **CA-001**:
  - DADO um e-mail ainda não cadastrado
  - QUANDO envio `POST /auth/register` com `{ name, email, password }` válidos
  - ENTÃO recebo `201`, o corpo NÃO contém `passwordHash`, e o usuário existe no banco com senha hasheada.
- **CA-002**:
  - DADO um e-mail já cadastrado (mesmo com caixa diferente)
  - QUANDO envio `POST /auth/register`
  - ENTÃO recebo `409 Conflict` e nenhum usuário duplicado é criado.
- **CA-003**:
  - DADO um usuário cadastrado com credenciais corretas
  - QUANDO envio `POST /auth/login`
  - ENTÃO recebo `200` com `accessToken` (JWT válido) e `user`.
- **CA-004**:
  - DADO um usuário cadastrado
  - QUANDO envio `POST /auth/login` com senha errada (ou e-mail inexistente)
  - ENTÃO recebo `401` com a mesma mensagem genérica nos dois casos.
- **CA-005**:
  - DADO um token válido
  - QUANDO envio `GET /auth/me` com `Authorization: Bearer <token>`
  - ENTÃO recebo `200` com o perfil do usuário dono do token.
- **CA-006**:
  - DADO nenhum token, ou token expirado/adulterado
  - QUANDO acesso `/auth/me` (ou qualquer rota protegida)
  - ENTÃO recebo `401 Unauthorized`.

## 7. Casos de borda (Edge Cases)

- **FR-010**: QUANDO o e-mail tem espaços ou caixa mista O SISTEMA DEVE normalizar (trim + lowercase) antes de validar e persistir.
- **FR-011**: QUANDO dois cadastros com o mesmo e-mail chegam simultaneamente O SISTEMA DEVE garantir unicidade via constraint do banco (não apenas checagem prévia) e retornar `409`.
- **FR-012**: QUANDO a senha tem mais de 72 bytes O SISTEMA DEVE rejeitar com `400` (limite do bcrypt).
- **FR-013**: QUANDO o token expira durante o uso O SISTEMA DEVE responder `401` e o cliente DEVE poder reautenticar (login) sem perda de dados.

## 8. Contratos de Dados (Entities)

| Entidade | Atributos | Relacionamentos |
|---|---|---|
| `users` | `id` (text, PK, uuid) · `name` (text, 1–100) · `email` (text, único, lowercase) · `passwordHash` (text, bcrypt) · `createdAt` (integer, unix ms) · `updatedAt` (integer, unix ms) | 1:N com `categories` e `transactions` (specs 002/003) |

## 9. Contratos de API

### `POST /auth/register`

```json
// request
{ "name": "Maria Silva", "email": "maria@exemplo.com", "password": "senha-forte-123" }

// response 201
{ "id": "uuid", "name": "Maria Silva", "email": "maria@exemplo.com", "createdAt": 1780000000000 }

// erros: 400 (validação) · 409 (e-mail já cadastrado)
```

### `POST /auth/login`

```json
// request
{ "email": "maria@exemplo.com", "password": "senha-forte-123" }

// response 200
{ "accessToken": "<jwt>", "user": { "id": "uuid", "name": "Maria Silva", "email": "maria@exemplo.com", "createdAt": 1780000000000 } }

// erros: 400 (validação) · 401 (credenciais inválidas)
```

### `GET /auth/me`

```json
// headers: Authorization: Bearer <jwt>
// response 200
{ "id": "uuid", "name": "Maria Silva", "email": "maria@exemplo.com", "createdAt": 1780000000000 }

// erros: 401 (token ausente/inválido/expirado)
```

## 10. Tratamento de Erros

- Envelope global: `{ "statusCode": number, "message": string | string[], "error": string }` (padrão NestJS, mantido consistente).
- Validação (Zod/`safeParse` no pipe): `400` com `message` em array de strings.
- Conflito de e-mail: `409`. Credenciais inválidas: `401` (mensagem única). Rota protegida sem token: `401`.
- Nenhuma senha ou hash aparece em respostas/logs.

## 11. Critérios de Sucesso (SC)

- **SC-001**: Nenhum `passwordHash` ou segredo aparece em resposta de API, Swagger ou logs (verificável por inspeção e teste e2e).
- **SC-002**: Toda rota que acessa dados de usuário exige token válido e filtra por `userId` (verificável por teste e2e).

## 12. Perguntas em aberto (Open Questions)

- Nenhuma — verificação de e-mail, refresh token e roles foram deliberadamente descartados (Não-objetivos). Decisões de stack registradas nos ADRs 0001 e 0002.

## 13. Referências / Evidências

- README.md — Requisitos Técnicos (login, cadastro de usuários, persistência).
- [ADR-0001](../adr/0001-drizzle-orm-e-sqlite.md) — escolha do banco/ORM.
- [ADR-0002](../adr/0002-jwt-access-token.md) — estratégia de autenticação.
- Evidências esperadas: testes unitários (service de auth com repositório mockado) e e2e (register/login/me via supertest).
