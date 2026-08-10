---
spec-id: "001"
title: "<Título curto da funcionalidade>"
status: "Draft"                 # Draft | Proposed | Approved | Implemented | Superseded
author: "<seu nome ou handle>"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
related-specs: []               # ex: ["002-categorias"]
related-adrs: []                # ex: ["0001-orm"]
---

# Spec 001 — <Título curto da funcionalidade>

> Resumo em 1–2 frases: o que será construído e por quê.

## 1. Objetivo (Goal)

- O que o usuário consegue fazer após esta funcionalidade existir (jornadas, outcomes de sucesso).
- **Não** descreva stack/implementação aqui.

## 2. Não-objetivos (Non-Goals)

- Lista explícita do que está **fora** do escopo desta spec (evita scope creep e invenção de requisitos).

## 3. Escopo e premissas (Scope & Assumptions)

- Limites da funcionalidade, dependências, sistemas reaproveitados, premissas de ambiente.

## 4. User Stories

| ID | Prioridade | História | Justificativa da prioridade |
|---|---|---|---|
| US-01 | P1 | Como <ator>, quero <ação>, para <benefício>. | <por que essa prioridade> |
| US-02 | P2 | ... | ... |

## 5. Requisitos Funcionais (FR)

Formato EARS — um comportamento por requisito:

- **FR-001**: QUANDO <gatilho> O SISTEMA DEVE <comportamento>.
- **FR-002**: QUANDO <gatilho> O SISTEMA NÃO DEVE <comportamento>.
- **FR-003**: QUANDO <gatilho> O SISTEMA PODE <comportamento>.

## 6. Critérios de Aceitação (Given/When/Then)

Critérios verificáveis por funcionalidade — mapeiam diretamente para testes.

- **CA-001**:
  - DADO <estado inicial>
  - QUANDO <ação do usuário>
  - ENTÃO <resultado esperado>
- **CA-002**: ...

## 7. Casos de borda (Edge Cases)

Cada caso com seu próprio WHEN: estados vazios, erros, limites, concorrência, estados degradados.

- **FR-00X**: QUANDO <lista vazia> O SISTEMA DEVE <estado vazio claro, sem erro>.
- **FR-00Y**: QUANDO <concorrência/limite> O SISTEMA DEVE <comportamento definido>.

## 8. Contratos de Dados (Entities)

Entidades, atributos e relacionamentos — **sem** detalhe de implementação.

| Entidade | Atributos | Relacionamentos |
|---|---|---|
| <nome> | <campo: tipo, obrigatório?> | <1:N com ..., N:M com ...> |

## 9. Contratos de API

Endpoints, schemas de request/response, semântica de erros, exemplos.

### `POST /<recurso>`

```json
// request
{ }

// response 201
{ }

// erros: 400 (validação) · 401 (não autenticado) · 403 (sem permissão) · 404 (não encontrado) · 409 (conflito)
```

## 10. Tratamento de Erros

Convenções: códigos de status, formato da resposta de erro, idempotência/retry, o que logar vs rejeitar.

## 11. Critérios de Sucesso (SC)

Métricas mensuráveis (perf, concorrência, UX) — se aplicável.

- **SC-001**: <métrica com limiar> (ex: resposta < 200ms p95).

## 12. Perguntas em aberto (Open Questions)

- [ ] **[NEEDS CLARIFICATION]** <pergunta a resolver antes de implementar>

## 13. Referências / Evidências

- Links para requisitos de origem, specs relacionadas, ADRs, expectativa de evidências de teste.
