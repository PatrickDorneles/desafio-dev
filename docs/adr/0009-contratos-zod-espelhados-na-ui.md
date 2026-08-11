---
id: 0009
status: "Accepted"
date: "2026-08-11"
deciders: ["PatrickDorneles"]
consulted: []
informed: []
tags: [frontend, ui, contracts, zod]
technologies: [zod, nextjs]
related: [0005, 0008]
supersedes: []
superseded_by: []
---

# ADR-0009 — Contratos Zod espelhados na UI (mirror), sem pacote compartilhado

## Contexto e Problema (Context and Problem Statement)

O `AGENTS.md` (raiz e `ui/`) manda: *"Zod é a única fonte de verdade para contratos"* e *"valide com os mesmos schemas usados pela API"* — remetendo a uma skill `zod-shared-schemas` (referenciada, mas **não instalada**) e a um esquema de pacote compartilhado que **não existe** no repositório. Os schemas da API vivem embutidos nos DTOs de cada módulo (`api/src/<módulo>/dto/`, ADR-0003/0005). A UI precisa dos mesmos contratos para (a) validar formulários client-side e (b) tipar/parsear respostas da API. Fazer a UI "enxergar" os schemas da API exige uma reestruturação: ou extrair um `packages/shared`, ou espelhar na UI. Decisão do usuário: **espelhar na UI**.

## Drivers de Decisão (Decision Drivers)

1. **Nada de reestruturação na API:** a API está concluída, comemorada em ADRs e coberta por unit + e2e; mexer em imports/estrutura de workspace para um desafio de 2 páginas é custo alto e risco.
2. **Tipagem e validação idênticas na prática:** o que importa para a UI é que os schemas espelhados sejam **semanticamente iguais** aos DTOs (mesmas regras: trims, limites, formato de moeda/data).
3. **Drift controlado:** a API é a fonte da verdade; o espelho referencia o arquivo-fonte da API em cada schema, e os testes e2e da API cobrem os contratos.
4. **Leveza:** sem npm workspaces, sem pacote novo, sem mudança de tooling.

## Opções Consideradas (Considered Options)

### Opção 1: Espelho na UI (`ui/src/lib/schemas/`) — escolhida

- **Prós:** zero mudança na API; simples; schemas colados à UI; upgrades fáceis (editar em um lugar da API → refletir em um lugar da UI).
- **Contras:** duplicação de código; risco de drift entre API e UI se ninguém revisar.
- **Riscos:** baixos no escopo (contratos pequenos e estáveis); mitigados por comentário `// espelha api/src/...` + revisão.

### Opção 2: Pacote compartilhado `packages/shared` (npm workspaces)

- **Prós:** fonte única; zero duplicação; é o destino "ideal" do AGENTS.md.
- **Contras:** reestrutura workspace (raiz `package.json`, extração e refactor dos DTOs da API, build/verificação em dois pacotes), tocando uma API estável e testada; desproporcional ao escopo.
- **Riscos:** médios (regressão silenciosa de imports na API).

### Opção 3: Tipos "na mão" na UI (sem zod)

- **Prós:** rápido.
- **Contras:** viola o mandato do AGENTS.md ("Zod é a fonte da verdade"; "valide com zod"); perde validação client-side de formulários e respostas; drift garantido.
- **Riscos:** altos.

## Decisão (Decision Outcome)

**A UI espelha em `ui/src/lib/schemas/` os contratos Zod da API que consome, com a API como fonte da verdade:**

- **Schemas espelhados (um arquivo por domínio, padrão ADR-0005):** `auth` (register/login/me + resposta `{ accessToken, user }`), `category` (create/update/response), `transaction` (create/update/response), `pagination` (`PaginationMeta` — ADR-0007), `summary` (income/expense/balance em centavos). Regras copiadas dos DTOs: trim + limites (nome 1–50, descrição 1–200), cor `#RRGGBB`, `amountCents` inteiro positivo, data `YYYY-MM-DD` com calendário real, `type` INCOME/EXPENSE (valores do objeto `as const` — ADR-0006).
- **Cada schema traz um comentário apontando o arquivo-fonte na API** (ex: `// espelha api/src/transactions/dto/create-transaction.dto.ts`).
- **Tipos derivados com `z.infer`** — nunca interfaces manuais para contratos (regra do AGENTS.md).
- **Uso:** formulários validam com `safeParse` antes do submit; respostas da API são parseadas no API client (`ui/src/lib/api/`) com os mesmos schemas; erros de validação exibidos campo a campo.
- **Revisão de drift:** mudança de contrato na API exige espelhar na UI no mesmo PR/commit; testes e2e da API são a rede de segurança dos contratos.

## Consequências (Consequences)

- **Positivas:** API intacta; UI tipada e validada por zod de ponta a ponta; padrão simples e legível.
- **Negativas:** duplicação deliberada de schemas; drift exige disciplina (mitigada por comentários + revisão).
- **Neutras / follow-ups:** se o drift virar problema real (vários domínios, mutações frequentes), extrair `packages/shared` — caminho já mapeado na Opção 2.

## Critérios de Reavaliação (Revisit Criteria)

- Contratos mudando com frequência ou crescente divergência entre espelho e API → migrar para `packages/shared`.
- Instalação da skill `zod-shared-schemas` com convenção própria → revisar esta ADR.

## Links

- [Spec 004](../specs/004-interface-web.md) — interface web (esta ADR define o contrato de schemas).
- [ADR-0005](./0005-tipos-por-modulo.md) — tipos por módulo (mesmo princípio aplicado à UI).
- [ui/AGENTS.md](../../ui/AGENTS.md) — convenções da UI (atualizado).
