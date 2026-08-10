---
id: 0005
status: "Accepted"
date: "2026-08-10"
deciders: ["PatrickDorneles"]
consulted: []
informed: []
tags: [backend, arquitetura]
technologies: [typescript]
related: [0003, 0004]
supersedes: []
superseded_by: []
---

# ADR-0005 — Tipos por módulo em `types/` (exports mínimos por arquivo)

## Contexto e Problema (Context and Problem Statement)

Os ADRs-0003/0004 organizaram **camadas e posse de entidades**, mas não definiram onde vivem os **tipos e interfaces de nível de módulo**. Com o crescimento da API, serviços, repositórios e entidades passaram a **definir e exportar tipos** junto do comportamento:

- `auth.service.ts` exportava `UserProfile`, `RegisterInput`, `LoginInput`, `LoginResult`;
- `transactions.service.ts` exportava `TransactionSummary`;
- repositórios exportavam payloads de dados (`CreateUserData`, `CreateCategoryData`, `UpdateTransactionData`, `TransactionType`);
- entidades exportavam row types (`UserRow`, `CategoryRow`, `TransactionRow` via `$inferSelect`);
- decorators/guards exportavam tipos de payload (`CurrentUserPayload`, `JwtUser`).

Isso viola o princípio de que **cada arquivo exporta apenas o necessário e o que faz sentido para sua responsabilidade**: um arquivo de comportamento (service/repository) passa a ser também o "dono" de contratos de tipo, forçando importers a saber em qual camada o tipo foi declarado e dificultando encontrar tipos de um módulo.

## Drivers de Decisão (Decision Drivers)

1. **Export mínimo:** arquivos de comportamento exportam comportamento; arquivos de schema exportam schema; tipos têm seu próprio lugar.
2. **Localização previsível:** um único caminho por módulo para procurar tipos (`src/<modulo>/types/`).
3. **Imports estáveis:** tipos não mudam de arquivo quando a implementação é refatorada (ex: extrair método, trocar ORM internamente).
4. **Coesão:** tipos de um módulo ficam no módulo (não em uma pasta global única), e tipos globais ficam em `common/`.

## Opções Consideradas (Considered Options)

### Opção 1: Pasta `types/` por módulo — escolhida

Cada módulo possui `src/<modulo>/types/` para seus tipos e interfaces de nível de módulo; `common/` ganha `types/` para tipos globais.

- **Prós:** regra simples e uniforme; localização previsível; arquivos de comportamento ficam enxutos; alinha com ADR-0003/0004 (coesão por módulo).
- **Contras:** indireção adicional para tipos intrinsecamente ligados ao schema (row types); ajuste único de imports.
- **Riscos:** baixos.

### Opção 2: Manter tipos onde são usados (status quo)

- **Prós:** nenhuma mudança.
- **Contras:** tipos espalhados por services/repos/entidades; importers acoplados à camada onde o tipo foi declarado; sem regra para novos tipos.
- **Riscos:** médios (manutenção, inconsistência).

### Opção 3: Pasta global única (`src/common/types/` para tudo)

- **Prós:** um lugar só.
- **Contras:** pasta "god" desconectada dos módulos; repete o anti-padrão rejeitado na ADR-0004 (entidades centralizadas); perde coesão por feature.
- **Riscos:** médios (manutenção).

## Decisão (Decision Outcome)

**Cada módulo concentra seus tipos e interfaces em `src/<modulo>/types/`.** Arquivos de comportamento e schema exportam apenas o que é de sua responsabilidade:

```text
src/
├── common/
│   ├── types/               # tipos globais entre módulos
│   │   ├── error-envelope.ts
│   │   └── current-user.ts
│   ├── utils/
│   └── constants/
└── <modulo>/
    ├── types/               # tipos/interfaces de nível de módulo
    ├── entities/            # APENAS o schema Drizzle (sem exports de tipos)
    ├── repositories/        # APENAS a classe (sem exports de tipos)
    ├── services/            # APENAS a classe (sem exports de tipos)
    ├── controllers/
    └── dto/
```

Regras:

1. **Tipos de módulo vivem em `types/`:** row types (`typeof x.$inferSelect`), shapes de entrada/saída de services, payloads de dados de repositórios, unions/enums (ex: `TransactionType`).
2. **Arquivos de entidade exportam apenas o schema** (a const `sqliteTable`) — nenhum type exportado.
3. **Services e repositories exportam apenas a classe** — nenhuma interface/type exportado.
4. **DTOs mantêm schema + tipo inferido juntos** (`createZodDto` + `z.infer`): o tipo inferido é intrinsecamente ligado ao schema Zod e continua no arquivo do DTO.
5. **Tipos globais** (envelope de erro, payload do usuário autenticado) ficam em `src/common/types/`.
6. **Exceção:** um tipo pode permanecer no arquivo de implementação apenas quando é estritamente local àquele arquivo (não exportado e sem uso externo).

Refatoração aplicada nesta decisão:

| Módulo | Arquivo de origem | Tipos movidos para |
| --- | --- | --- |
| `auth` | `services/auth.service.ts`, `guards/jwt-auth.guard.ts` | `types/auth.types.ts` (`UserProfile`, `RegisterInput`, `LoginInput`, `LoginResult`, `JwtUser`) |
| `users` | `entities/users.entity.ts`, `repositories/users.repository.ts` | `types/user.types.ts` (`UserRow`, `CreateUserData`) |
| `categories` | `entities/category.entity.ts`, `repositories/categories.repository.ts` | `types/category.types.ts` (`CategoryRow`, `CreateCategoryData`, `UpdateCategoryData`) |
| `transactions` | `entities/transaction.entity.ts`, `repositories/transactions.repository.ts`, `services/transactions.service.ts` | `types/transaction.types.ts` (`TransactionRow`, `TransactionType`, `CreateTransactionData`, `UpdateTransactionData`, `TransactionSummary`) |
| `common` | `utils/envelope.util.ts`, `decorators/current-user.decorator.ts` | `types/error-envelope.ts`, `types/current-user.ts` |

## Consequências (Consequences)

- **Positivas:** arquivos de comportamento enxutos e com export mínimo; um lugar previsível por módulo para tipos; imports estáveis perante refatorações; regra documentável para agentes.
- **Negativas:** indireção extra para row types (importar de `types/` em vez da entidade); atualização de imports em todos os consumidores.
- **Neutras / follow-ups:** atualizar `AGENTS.md` e o roadmap `docs/tasks.md`; em caso de duplicação entre tipos de service e tipos inferidos de DTO, preferir o tipo inferido do DTO quando o DTO já é o contrato (avaliar caso a caso, fora do escopo desta ADR).

## Critérios de Reavaliação (Revisit Criteria)

- Se surgirem imports circulares causados apenas por tipos (type-only), reavaliar a separação `types/` vs schema.
- Se a indireção de row types se provar onerosa na prática, revisitar a regra de entidades exportarem apenas o schema.
- Se `types/` de vários módulos ficar repetitivo, consolidar tipos compartilhados em `common/types/` — sem afrouxar o export mínimo por arquivo.

## Links

- [ADR-0003](./0003-arquitetura-em-camadas.md) — camadas por módulo.
- [ADR-0004](./0004-modulo-por-entidade.md) — módulo por entidade (esta decisão complementa, sem substituir).
- Specs [001](../specs/001-autenticacao-e-usuarios.md), [002](../specs/002-categorias.md), [003](../specs/003-movimentacoes.md).
- Roadmap: [tasks](../tasks.md).
