---
id: 0003
status: "Accepted"
date: "2026-08-10"
deciders: ["PatrickDorneles"]
consulted: []
informed: []
tags: [backend, arquitetura]
technologies: [nestjs, drizzle-orm, zod, nestjs-zod]
related: [0001, 0002]
supersedes: []
superseded_by: []
---

# ADR-0003 — Arquitetura em camadas por módulo (controllers/services/repositories)

## Contexto e Problema (Context and Problem Statement)

O NestJS sugere módulos, mas não impõe organização interna dos arquivos. Os critérios de avaliação do desafio incluem organização de código, SOLID/DRY e "arquitetura escalável com separação por camadas". Precisamos de uma estrutura de pastas padrão, consistente e previsível — para humanos e para agentes de IA que implementarão as specs.

## Drivers de Decisão (Decision Drivers)

1. Atender os critérios de avaliação (organização, SOLID/DRY, camadas).
2. Testabilidade: serviços testáveis com repositórios mockados.
3. Consistência entre módulos (padrão previsível).
4. Simplicidade proporcional ao escopo (evitar over-engineering).

## Opções Consideradas (Considered Options)

### Opção 1: Camadas por módulo — escolhida

`controllers/` + `services/` + `repositories/` + `dto/` + `entities/` dentro de cada módulo; globais em `src/common/`.

- **Prós:** separação clara de responsabilidades; repositórios isolam o ORM (testável com mocks); alinhada aos critérios de avaliação.
- **Contras:** mais arquivos por módulo; risco de camadas "vazias" (anemia) se mal usadas.
- **Riscos:** baixos.

### Opção 2: Flat (controllers + services com tudo no service)

- **Prós:** menos arquivos.
- **Contras:** services acoplados ao ORM; DRY e testabilidade menores; não atende "separação por camadas".
- **Riscos:** médios (avaliação).

### Opção 3: Hexagonal / ports & adapters

- **Prós:** desacoplamento máximo.
- **Contras:** complexidade desproporcional ao escopo do desafio.
- **Riscos:** altos (tempo).

### Opção 4: Não fazer nada (status quo do scaffold)

- Sem padrão definido → cada módulo organizado de um jeito. Descartada.

## Decisão (Decision Outcome)

Estrutura por módulo (padrão NestJS + camadas):

```text
src/
├── common/                 # global, sem vínculo de módulo
│   ├── utils/              # helpers reutilizáveis
│   └── constants/          # valores imutáveis (chaves, nomes)
└── <modulo>/
    ├── controllers/        # rotas + decorators (guards, validação, Swagger)
    ├── services/           # lógica de domínio
    ├── repositories/       # integração ORM (Drizzle) — consumidos pelos services
    ├── dto/                # schemas Zod por função (create/update/login...)
    └── entities/           # schema Drizzle do módulo
```

- **SOLID** e **DRY** orientam a escrita: responsabilidade única por camada; lógica duplicada extraída para `common/utils` ou services compartilhados.
- **DTOs via `nestjs-zod`** (`createZodDto` + `ZodValidationPipe`): mantém Zod como fonte única (Skill `zod-shared-schemas`) e integra com o Swagger automaticamente. A alternativa "pipe de validação próprio" foi descartada para não reimplementar integração já resolvida.
- **Vínculo módulo-entidade:** cada módulo normalmente possui uma entidade; exceções aceitas (ex: módulo `auth` gerencia a entidade `users` e seu repositório).
- Não estamos otimizando para complexidade enterprise além do necessário.

## Consequências (Consequences)

- **Positivas:** consistência entre módulos, testabilidade, Swagger documentado sem código extra, padrão previsível para agentes.
- **Negativas:** mais arquivos por módulo; disciplina necessária para não "vazar" lógica entre camadas (controller não chama ORM; service não expõe DTO cru).
- **Neutras / follow-ups:** documentar o padrão no `AGENTS.md` (já feito) e no roadmap `docs/tasks.md`.

## Critérios de Reavaliação (Revisit Criteria)

- Se um requisito futuro exigir desacoplamento real (múltiplos providers de banco, filas, eventos) → avaliar ports & adapters com novo ADR.

## Links

- Specs [001](../specs/001-autenticacao-e-usuarios.md), [002](../specs/002-categorias.md), [003](../specs/003-movimentacoes.md).
- [ADR-0001](./0001-drizzle-orm-e-sqlite.md) e [ADR-0002](./0002-jwt-access-token.md).
- Roadmap de implementação: [tasks](../tasks.md).
