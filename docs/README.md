# 📚 Documentação

Este repositório usa documentação orientada a **especificações e decisões** (*spec-driven development*) para guiar o desenvolvimento — humano e agêntico (agentes de IA).

> **Para agentes de IA:** leia este índice antes de implementar. Consulte `docs/specs/` para entender **o que** construir e `docs/adr/` para entender **por que** determinadas decisões foram tomadas.

## Estrutura

```text
docs/
├── README.md          # este arquivo — porta de entrada da documentação
├── specs/             # especificações de funcionalidades (o QUE construir)
│   ├── README.md      # convenções de specs (numeração, status, EARS)
│   └── _template.md   # template de spec
├── adr/               # Architecture Decision Records (POR QUE foi decidido)
│   ├── README.md      # convenções de ADRs (numeração, ciclo de vida)
│   └── _template.md   # template de ADR
└── tasks.md           # roadmap de implementação (T-001…, fases, verificação)
```

Documentação específica de cada aplicação:

- 🔧 [`api/docs/`](../api/docs/) — backend (NestJS)
- 🎨 [`ui/docs/`](../ui/docs/) — frontend (Next.js)

## Como usar

1. **Specs** (`docs/specs/`): descrevem comportamento, requisitos e contratos de cada funcionalidade. Uma spec por funcionalidade/épico, numerada (`001-<nome>.md`). A implementação só começa com a spec revisada e aprovada.
2. **ADRs** (`docs/adr/`): registram decisões de arquitetura importantes (ORM, autenticação, estrutura de pastas). Um ADR por decisão, numerado (`0001-<título>.md`).
3. **Tasks** (`docs/tasks.md`): roadmap de implementação — tarefas ordenadas (T-001…), com dono de validação e passo de verificação de cada uma.
4. **Docs de projeto** (`api/docs/`, `ui/docs/`): informações específicas de cada aplicação (como rodar, convenções locais).

## Fluxo de trabalho (spec → implementação → registro)

1. Crie ou atualize uma spec em `docs/specs/` usando o template.
2. Defina critérios de aceitação verificáveis (Given/When/Then) — são a definição de pronto.
3. Implemente com a spec como contrato; atualize a spec se o entendimento mudar.
4. Acompanhe e marque o progresso em `docs/tasks.md` (roadmap de implementação).
5. Decisões arquiteturais relevantes → crie um ADR em `docs/adr/`.
6. O status da spec acompanha o ciclo: `Draft → Proposed → Approved → Implemented → Superseded`.

## Convenções resumidas

| Conceito | Local | Numeração | Status |
|---|---|---|---|
| Spec de funcionalidade | `docs/specs/` | `NNN-<nome>.md` (3 dígitos) | Draft · Proposed · Approved · Implemented · Superseded |
| ADR | `docs/adr/` | `NNNN-<nome>.md` (4 dígitos) | Proposed · Accepted · Superseded · Deprecated · Rejected |

## Templates

- Template de spec: [`docs/specs/_template.md`](./specs/_template.md)
- Template de ADR: [`docs/adr/_template.md`](./adr/_template.md)
