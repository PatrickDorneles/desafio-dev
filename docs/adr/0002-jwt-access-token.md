---
id: 0002
status: "Accepted"
date: "2026-08-10"
deciders: ["PatrickDorneles"]
consulted: []
informed: []
tags: [seguranca, backend]
technologies: [jwt, bcrypt, nestjs]
related: [0001]
supersedes: []
superseded_by: []
---

# ADR-0002 — JWT access token para autenticação

## Contexto e Problema (Context and Problem Statement)

A aplicação exige login de usuário e movimentações associadas ao usuário autenticado. A UI (Next.js) roda em porta separada da API (NestJS/Fastify), com CORS liberado. Precisamos de autenticação simples, stateless e compatível com essa separação, com "segurança básica" (critério do desafio).

## Drivers de Decisão (Decision Drivers)

1. Simplicidade (prazo curto, escopo de desafio).
2. Stateless — sem tabela de sessões, sem estado no servidor.
3. Compatível com SPA + API em origens diferentes (CORS já habilitado).
4. Segurança básica: senhas hasheadas, sem dados sensíveis no token.

## Opções Consideradas (Considered Options)

### Opção 1: JWT access token (Bearer header) — escolhida

- **Prós:** stateless; padrão de mercado; trivial com NestJS (`@nestjs/jwt`); funciona com CORS `origin: *`; expiração curta limita janela de exposição.
- **Contras:** revogação só por expiração; cliente guarda o token (risco XSS se em `localStorage`).
- **Riscos:** baixos para o escopo (mitigados por expiração default `1h`).

### Opção 2: JWT access + refresh token

- **Prós:** sessão mais longa com rotação/revogação.
- **Contras:** dobra a superfície (rotas, armazenamento do refresh, revogação); complexidade desproporcional ao desafio.
- **Riscos:** médios (complexidade/tempo).

### Opção 3: Session cookies (httpOnly)

- **Prós:** não exposto a XSS; revogável no servidor.
- **Contras:** precisa de store de sessão (quebra stateless); CORS com `credentials` + CSRF care nas origens separadas; mais fricção com o setup atual.
- **Riscos:** médios (CSRF/CORS).

### Opção 4: Não fazer nada / auth básica

- **Prós:** nenhum.
- **Contras:** não atende o requisito.
- **Riscos:** altos. Descartada.

## Decisão (Decision Outcome)

Vamos usar **JWT access token apenas**, enviado em `Authorization: Bearer <token>`, assinado HS256 com segredo forte via env (`JWT_SECRET`), expiração default `1h` (`JWT_EXPIRES_IN`). Senhas com **bcrypt** (cost 10–12). Guard global no NestJS com decorator de rota pública para `register`/`login`. Não estamos otimizando para revogação ativa de token ou sessões longas.

## Consequências (Consequences)

- **Positivas:** simples, stateless, padrão; UI consome via Bearer sem configuração extra de CORS.
- **Negativas:** token só expira por tempo (logout efetivo só no cliente); se o cliente usar `localStorage`, fica exposto a XSS (aceito no escopo; a UI pode manter em memória).
- **Neutras / follow-ups:** exigir `JWT_SECRET` no `.env` (sem default inseguro); registrar esquema Bearer no Swagger; se surgir requisito de sessão longa → novo ADR para refresh tokens.

## Critérios de Reavaliação (Revisit Criteria)

- Necessidade de revogação/logout server-side, sessões longas, ou 2FA → reavaliar com ADR de refresh tokens.

## Links

- Spec [001-autenticacao-e-usuarios](../specs/001-autenticacao-e-usuarios.md).
- [ADR-0001](./0001-drizzle-orm-e-sqlite.md) (relacionado — fundação da API).
