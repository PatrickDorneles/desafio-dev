# 🧭 ADRs — Architecture Decision Records

ADRs registram decisões de arquitetura importantes: **o contexto, as opções consideradas e o porquê da escolha**. São a memória durável do projeto — e contexto de alta qualidade para agentes de IA (e para quem mantém o código no futuro).

## Numeração e arquivo

- Arquivo: `NNNN-<título-curto-com-hifens>.md` — 4 dígitos sequenciais com zero à esquerda (`0001-`, `0002-`...).
- IDs nunca são renumerados; gaps são aceitos. **Nunca deletar** um ADR.
- Título: frase nominal curta (< 50 caracteres), pesquisável (ex: `0001-orm-e-migrations`).

## Ciclo de vida

| Status | Significado |
|---|---|
| **Proposed** | Rascunho em revisão. |
| **Accepted** | Operativo e autoritativo. **Imutável** — apenas typos/correções de links. |
| **Superseded** | Substituído por um ADR específico — linkar nos dois sentidos. |
| **Deprecated** | Não é mais operativo, sem substituto específico. |
| **Rejected** | Avaliado e descartado (registra o "por que não"). |

## Regras

- Escreva **no momento da decisão**, não retroativamente. **Uma decisão por ADR.**
- Decisão significativa (ORM, auth, estrutura, padrões) → o ADR faz parte do Definition of Done.
- `Accepted` é imutável: mudança de significado = novo ADR que supersede o antigo.
- 1–2 páginas; link material de apoio em vez de embutir.
- Front matter YAML (`id`, `status`, `date`, `deciders`, `tags`) para filtragem por ferramentas e agentes.
- ADR trata de arquitetura/decisão técnica — **não** incluir escopo de produto (isso pertence às specs).

## Template

Use [`_template.md`](./_template.md).
