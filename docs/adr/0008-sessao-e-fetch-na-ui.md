---
id: 0008
status: "Accepted"
date: "2026-08-11"
deciders: ["PatrickDorneles"]
consulted: []
informed: []
tags: [frontend, ui, auth, security]
technologies: [nextjs, tanstack-query, localstorage]
related: [0002]
supersedes: []
superseded_by: []
---

# ADR-0008 — Sessão na UI em `localStorage` e dados autenticados via TanStack Query (client-side)

## Contexto e Problema (Context and Problem Statement)

A UI precisa autenticar contra a API (Bearer JWT — ADR-0002). Com o guard resolvendo o usuário a partir do banco a cada requisição (Spec 001, T-047), o token precisa acompanhar **toda** chamada autenticada. A pergunta central: onde a UI guarda o token e como isso afeta a estratégia de renderização/fetch do Next.js. A API não possui refresh token nem logout — a sessão é exclusivamente o JWT de 1h, descartado no cliente (ADR-0002). Decisão do usuário: **`localStorage`** (sessão sobrevive a refresh; exposição a XSS aceita no escopo, conforme já previsto na ADR-0002).

## Drivers de Decisão (Decision Drivers)

1. **Persistência de sessão:** o usuário não deve relogar a cada refresh (UX de demo).
2. **Segurança proporcional:** manter o risco XSS mapeado e aceito (ADR-0002); sem investimento em infraestrutura de cookie/CSRF.
3. **SSR "preferido, não obrigatório":** página pública (`/`) pode ser server-rendered; páginas autenticadas **não podem** ser — o servidor não enxerga `localStorage`.
4. **Um padrão por feature:** dados de servidor via TanStack Query (client-side), evitando misturar server components/server actions/route handlers para dados autenticados.

## Opções Consideradas (Considered Options)

### Opção 1: `localStorage` + fetch client-side (TanStack Query) — escolhida

- **Prós:** sessão persiste entre refreshes; implementação simples; nenhuma mudança na API; alinhada à ADR-0002 (exposição a XSS já aceita).
- **Contras:** token vulnerável a XSS persistente (aceito); sem SSR para páginas autenticadas.
- **Riscos:** baixos dentro do escopo do desafio.

### Opção 2: Token em memória + fetch client-side

- **Prós:** elimina o alvo XSS persistente.
- **Contras:** refresh derruba a sessão (UX ruim em demo); mesmo custo client-side da Opção 1.
- **Riscos:** médios (UX).

### Opção 3: Cookie `httpOnly` + fetch no servidor (SSR real)

- **Prós:** mais seguro; habilita server components autenticados.
- **Contras:** exige mudanças na API (emitir cookie, CORS com credentials, CSRF), redesenho da arquitetura de auth — desproporcional ao escopo.
- **Riscos:** médios (complexidade).

## Decisão (Decision Outcome)

**A UI mantém o access token em `localStorage` e busca dados autenticados client-side via TanStack Query:**

- **Armazenamento:** token em `localStorage` (chave de app, ex: `dsf.auth.token`), escrito no login/cadastro, removido no logout e em qualquer `401`.
- **Requisições:** todo fetch autenticado envia `Authorization: Bearer <token>`; respostas `401` → limpar sessão e redirecionar para `/` (token expirado/revogado — o guard da API retorna `401` genérico).
- **Renderização:** `/` (landing) é server component; `/dashboard` e toda superfície autenticada são client components com TanStack Query (query-key factories, `staleTime` deliberado, invalidação após mutações).
- **Proteção de rota:** client-side — sem token → redireciona `/` → `/dashboard`; com token → validação via `GET /auth/me` (o guard da API resolve o usuário real; token de usuário inexistente → `401`).
- **Nenhuma mudança na API:** CORS `origin: *` já habilitado em `api/src/main.ts`.

## Consequências (Consequences)

- **Positivas:** sessão persistente; autenticação reutiliza o guard da API (stale tokens morrem com `401`); stack declarada no `ui/AGENTS.md` (TanStack Query) finalmente usada para o propósito dela.
- **Negativas:** SSR não cobre páginas autenticadas (aceito — "preferido, não obrigatório"); token exposto a XSS (aceito — ADR-0002).
- **Neutras / follow-ups:** se um dia houver refresh token ou cookies, esta ADR é substituída e o fetch pode migrar para server components.

## Critérios de Reavaliação (Revisit Criteria)

- Introdução de refresh tokens, cookie de sessão ou requisito de SSR autenticado → substituir esta ADR.
- XSS em produção/uso real → migrar para cookie `httpOnly` (com mudanças na API).

## Links

- [Spec 004](../specs/004-interface-web.md) — interface web (esta ADR define sessão + fetch).
- [ADR-0002](./0002-jwt-access-token.md) — JWT Bearer; exposição a XSS aceita.
- [ui/AGENTS.md](../../ui/AGENTS.md) — convenções da UI (atualizado).
