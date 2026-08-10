# 📋 Specs — Convenções

Specs descrevem **o que** construir: comportamento, requisitos e contratos. São o contrato entre a intenção humana e a execução de agentes de IA. A spec é a fonte da verdade; o código é o artefato verificado contra ela.

## Numeração

- Arquivo: `NNN-<nome-curto-com-hifens>.md` — 3 dígitos sequenciais com zero à esquerda (`001-`, `002-`...).
- IDs nunca são renumerados; gaps são aceitos; o número é a identidade permanente da spec.
- Cada spec cobre **uma** funcionalidade/épico. Funcionalidades separadas → specs separadas.

## Ciclo de vida

```text
Draft → Proposed → Approved → Implemented → Superseded
```

| Status | Significado |
|---|---|
| **Draft** | Em elaboração; ainda não revisada. |
| **Proposed** | Pronta para revisão/validação. |
| **Approved** | Aprovada; a implementação pode começar. |
| **Implemented** | Funcionalidade entregue e verificada (testes/aceitação). |
| **Superseded** | Substituída por outra spec — linkar nos dois sentidos. |

Regras:

- A spec é um **documento vivo**: atualize conforme o entendimento evolui e mantenha o status atualizado.
- Mudança significativa de escopo → nova spec ou incremento com status atualizado; nunca reescrever o histórico de specs aprovadas.

## IDs de requisitos

| Prefixo | Tipo | Formato |
|---|---|---|
| `US-###` | User story | Given/When/Then em linguagem natural |
| `FR-###` | Requisito funcional | EARS (`QUANDO ... O SISTEMA DEVE ...`) |
| `CA-###` | Critério de aceitação | Given/When/Then verificável |
| `SC-###` | Critério de sucesso | Métrica mensurável com limiar |

Requisitos com IDs são rastreáveis para tarefas e testes.

## Como escrever requisitos (EARS)

- `QUANDO <gatilho> O SISTEMA DEVE <comportamento>` — obrigatório.
- `QUANDO <gatilho> O SISTEMA NÃO DEVE <comportamento>` — proibição.
- `QUANDO <gatilho> O SISTEMA PODE <comportamento>` — opcional.
- **Um comportamento por requisito.** Evite "should/must/will" ambíguos.
- Cubra **edge cases explicitamente** (estados vazios, erros, limites, concorrência, estados degradados) — agentes são bons no happy path, mas não inferem intenção em casos de borda.

## Template

Use [`_template.md`](./_template.md).
