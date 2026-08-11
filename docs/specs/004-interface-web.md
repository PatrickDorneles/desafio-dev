---
spec-id: "004"
title: "Interface web (landing + dashboard)"
status: "Proposed"
author: "PatrickDorneles"
created: "2026-08-11"
updated: "2026-08-11"
related-specs: ["001-autenticacao-e-usuarios", "002-categorias", "003-movimentacoes"]
related-adrs: ["0002-jwt-access-token", "0007-paginacao-por-pagina", "0008-sessao-e-fetch-na-ui", "0009-contratos-zod-espelhados-na-ui"]
---

# Spec 004 — Interface web (landing + dashboard)

> Interface web do app de transações financeiras: uma landing com login/cadastro e uma breve explicação do app, e um dashboard com resumo financeiro, tabela paginada de movimentações e CRUD completo de movimentações e categorias via modais.

## 1. Objetivo (Goal)

- O visitante se cadastra ou entra pela landing e acessa o dashboard.
- No dashboard, o usuário vê seu resumo financeiro (receitas, despesas, saldo), consulta o histórico de movimentações em uma tabela paginada e mantém o registro atualizado — criando, editando e excluindo movimentações e categorias.
- O usuário consegue sair da sessão e, quando o token expira ou é revogado, é devolvido à landing.

## 2. Não-objetivos (Non-Goals)

- **Não** há i18n/multi-idioma (pt-BR fixo) nem toggle claro/escuro (tema escuro fixo — preferência).
- **Não** há recuperação/troca de senha, edição de perfil, refresh token nem logout server-side (a API não suporta — ADR-0002; logout = descarte do token no cliente).
- **Não** há filtros/busca na tabela em v1 (filtros continuam possíveis client-side, conforme Spec 003, mas ficam fora deste ciclo).
- **Não** há suíte automatizada de UI (component/e2e) em v1 — verificação via `lint` + `build` + fluxos manuais; Playwright/component tests ficam como follow-up (Open Questions).
- **Não** há PWA/offline, auditoria formal de acessibilidade (WCAG) nem pacote compartilhado de schemas (ver ADR-0009).
- **Não** há SSR para páginas autenticadas (ver ADR-0008).

## 3. Escopo e premissas (Scope & Assumptions)

- Stack declarada no `ui/AGENTS.md`: Next.js 15 App Router · React 19 · Tailwind CSS v4 · shadcn/ui · TanStack Query · zod · lucide-react. **Dependências ainda não instaladas** — a Fase 6 do roadmap começa com o setup.
- API em `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`); CORS `origin: *` já habilitado na API (`api/src/main.ts`).
- Sessão: token em `localStorage`, dados autenticados client-side via TanStack Query (ADR-0008).
- Contratos: zod espelhado em `ui/src/lib/schemas/`, API como fonte da verdade (ADR-0009).
- Nenhuma mudança na API nesta spec; todos os endpoints consumidos já existem (Specs 001–003).
- Componentização: componentes em `src/components/` (shadcn em `src/components/ui/`), hooks em `src/hooks/` (regra dos hooks), schemas em `src/lib/schemas/`, API client em `src/lib/api/`.

## 4. User Stories

| ID | Prioridade | História | Justificativa da prioridade |
|---|---|---|---|
| US-01 | P1 | Como visitante, quero me cadastrar e entrar pela landing, para acessar meu dashboard. | Porta de entrada do app — sem ela nada mais funciona. |
| US-02 | P1 | Como usuário autenticado, quero ver meu resumo de receitas/despesas/saldo, para avaliar minha situação financeira de relance. | Valor central do produto; endpoint `GET /transactions/summary` já existe. |
| US-03 | P1 | Como usuário autenticado, quero consultar meu histórico em tabela paginada, para navegar pelas minhas movimentações. | Uso primário do dashboard; API já é paginada (ADR-0007). |
| US-04 | P1 | Como usuário autenticado, quero criar, editar e excluir movimentações, para manter o histórico correto. | Manutenção do dado principal; CRUD da API completo. |
| US-05 | P1 | Como usuário autenticado, quero criar, editar e excluir categorias, para organizar minhas movimentações. | Dependência do formulário de movimentação (seletor de categoria). |
| US-06 | P2 | Como usuário autenticado, quero sair da sessão, para proteger o acesso à conta. | Trivial; só depois da sessão existir. |

## 5. Requisitos Funcionais (FR)

### Landing e autenticação

- **FR-001**: QUANDO o visitante acessa `/` O SISTEMA DEVE exibir a landing com uma breve explicação do app e o acesso por abas (login | cadastro).
- **FR-002**: QUANDO o visitante submete o cadastro com dados válidos O SISTEMA DEVE criar a conta via `POST /auth/register` e entrar automaticamente, redirecionando para `/dashboard`.
- **FR-003**: QUANDO o visitante submete o login com credenciais válidas O SISTEMA DEVE autenticar via `POST /auth/login` e redirecionar para `/dashboard`.
- **FR-004**: QUANDO login (`401`) ou cadastro (`400`/`409`) falham O SISTEMA DEVE exibir a mensagem de erro da API no formulário, sem expor dados sensíveis.
- **FR-005**: QUANDO um usuário já autenticado acessa `/` O SISTEMA DEVE redirecionar para `/dashboard`.
- **FR-006**: QUANDO o visitante acessa `/dashboard` sem token O SISTEMA DEVE redirecionar para `/`.

### Sessão e segurança

- **FR-007**: QUANDO o usuário se autentica O SISTEMA DEVE armazenar o token em `localStorage` e enviar `Authorization: Bearer <token>` em toda requisição autenticada.
- **FR-008**: QUANDO o usuário clica em "Sair" O SISTEMA DEVE remover o token e redirecionar para `/`.
- **FR-009**: QUANDO qualquer requisição autenticada retorna `401` O SISTEMA DEVE limpar a sessão e redirecionar para `/` (token expirado/revogado ou usuário inexistente).
- **FR-010**: QUANDO existe token em `localStorage` O SISTEMA DEVE validar a sessão com o servidor (`GET /auth/me`) antes de liberar o dashboard.

### Dashboard

- **FR-011**: QUANDO o usuário acessa `/dashboard` O SISTEMA DEVE exibir: cabeçalho com o nome do usuário e ação "Sair", cards de resumo (receitas, despesas, saldo), tabela de movimentações e os botões "Nova movimentação" e "Gerenciar categorias".
- **FR-012**: QUANDO o dashboard carrega O SISTEMA DEVE buscar em paralelo o resumo (`GET /transactions/summary`), a primeira página de movimentações (`GET /transactions?page=1&pageSize=10`) e as categorias (`GET /categories`).
- **FR-013**: QUANDO o usuário navega na paginação O SISTEMA DEVE buscar a página solicitada e exibir indicador (página atual / total) e controles anterior/próxima, conforme `meta`.
- **FR-014**: QUANDO não há movimentações O SISTEMA DEVE exibir estado vazio com orientação (criar a primeira movimentação).
- **FR-015**: QUANDO não há categorias O SISTEMA DEVE exibir estado vazio no modal de categorias, orientando a criação.

### Movimentações

- **FR-016**: QUANDO o usuário clica em "Nova movimentação" O SISTEMA DEVE abrir um modal com formulário: tipo (receita/despesa), valor em R$, descrição, data e categoria (opcional).
- **FR-017**: QUANDO o formulário é submetido O SISTEMA DEVE validar client-side com o schema zod espelhado antes de enviar; erros exibidos campo a campo.
- **FR-018**: QUANDO a criação ou edição tem sucesso O SISTEMA DEVE fechar o modal e refletir a mudança na tabela e no resumo.
- **FR-019**: QUANDO o usuário aciona "editar" numa linha O SISTEMA DEVE abrir o modal pré-preenchido e salvar via `PATCH /transactions/:id`.
- **FR-020**: QUANDO o usuário aciona "excluir" numa linha O SISTEMA DEVE pedir confirmação e então chamar `DELETE /transactions/:id`; sucesso reflete na tabela e no resumo.
- **FR-021**: QUANDO o usuário remove a categoria de uma movimentação na edição O SISTEMA DEVE enviar `categoryId: null` (desvincular — a API distingue `null` de ausente).
- **FR-022**: QUANDO não há categorias e o usuário abre o formulário de movimentação O SISTEMA DEVE exibir a categoria como opcional com orientação para criar categorias (não bloqueia o envio — categoria é opcional na API).

### Categorias

- **FR-023**: QUANDO o usuário clica em "Gerenciar categorias" O SISTEMA DEVE abrir um modal listando as categorias com ações criar/editar/excluir.
- **FR-024**: QUANDO o usuário exclui uma categoria em uso O SISTEMA DEVE avisar que as movimentações vinculadas ficarão sem categoria (a API faz `SET NULL`) e pedir confirmação.
- **FR-025**: QUANDO o nome de categoria é duplicado (`409`) ou inválido O SISTEMA DEVE exibir a mensagem de erro da API no formulário.

### Geral

- **FR-026**: QUANDO dados estão sendo carregados O SISTEMA DEVE exibir estados de carregamento (skeleton/spinner) por seção.
- **FR-027**: QUANDO uma chamada falha (rede/`5xx`) O SISTEMA DEVE exibir erro legível — mensagem do envelope da API quando disponível — e permitir tentar novamente.
- **FR-028**: QUANDO a viewport é menor que desktop O SISTEMA DEVE manter usabilidade (layout responsivo; tabela com overflow horizontal ou adaptação mobile).
- **FR-029**: O SISTEMA DEVE exibir valores monetários em BRL (centavos → `R$ 1.234,56`) e datas `YYYY-MM-DD` no formato `dd/mm/aaaa`.
- **FR-030**: QUANDO o usuário navega por teclado ou leitor de tela O SISTEMA DEVE preservar rótulos, foco em modais e semântica básica (base fornecida pelos componentes shadcn).
- **FR-031**: QUANDO há ações repetitivas na tabela/modais O SISTEMA DEVE usar ícones (lucide) para reforçar o significado das ações, com texto de apoio onde a clareza exigir.

## 6. Critérios de Aceitação (Given/When/Then)

- **CA-001 (cadastro)**:
  - DADO um visitante em `/`
  - QUANDO ele cadastra com dados válidos
  - ENTÃO é autenticado e redirecionado para `/dashboard`, que exibe resumo zerado e estado vazio.
- **CA-002 (login inválido)**:
  - DADO um visitante em `/`
  - QUANDO ele tenta entrar com credenciais inválidas
  - ENTÃO vê a mensagem de erro no formulário e permanece na landing.
- **CA-003 (dashboard)**:
  - DADO um usuário autenticado
  - QUANDO acessa `/dashboard`
  - ENTÃO vê resumo em BRL, tabela paginada com seus dados e ações de CRUD; os dados são **apenas dele** (a API isola por usuário).
- **CA-004 (rota protegida)**:
  - DADO um visitante sem token
  - QUANDO acessa `/dashboard`
  - ENTÃO é redirecionado para `/`.
- **CA-005 (token expirado)**:
  - DADO um usuário com token expirado/revogado
  - QUANDO qualquer requisição retorna `401`
  - ENTÃO a sessão é limpa e o usuário volta para `/`.
- **CA-006 (criar movimentação)**:
  - DADO um dashboard com movimentações
  - QUANDO o usuário cria uma movimentação válida
  - ENTÃO o modal fecha, a movimentação aparece na tabela e o resumo é recalculado.
- **CA-007 (excluir movimentação)**:
  - DADO uma linha da tabela
  - QUANDO o usuário exclui após confirmação
  - ENTÃO a linha some e o resumo é recalculado.
- **CA-008 (categorias)**:
  - DADO o modal de categorias
  - QUANDO o usuário cria/edita/exclui categorias
  - ENTÃO a lista reflete a mudança e o seletor de categoria do formulário de movimentação é atualizado.
- **CA-009 (excluir categoria em uso)**:
  - DADO uma categoria com movimentações vinculadas
  - QUANDO o usuário a exclui confirmando o aviso
  - ENTÃO a categoria some e as movimentações ficam sem categoria, sem erro.
- **CA-010 (validação)**:
  - DADO um formulário com campos inválidos (ex: descrição vazia, valor zero, data impossível)
  - QUANDO o usuário submete
  - ENTÃO erros aparecem campo a campo e nada é enviado.
- **CA-011 (página além do fim)**:
  - DADO uma página além da última
  - QUANDO a API responde `data: []`
  - ENTÃO a tabela mostra estado vazio consistente com os controles de paginação.
- **CA-012 (logout)**:
  - DADO um dashboard autenticado
  - QUANDO o usuário clica em "Sair"
  - ENTÃO o token é removido, o usuário volta para `/` e acessar `/dashboard` redireciona novamente.

## 7. Casos de borda (Edge Cases)

- **FR-014**: QUANDO não há movimentações O SISTEMA DEVE mostrar estado vazio amigável (sem erro, com orientação).
- **FR-015**: QUANDO não há categorias O SISTEMA DEVE permitir criar categorias pelo modal e só então vincular.
- **FR-024**: QUANDO a categoria excluída tem movimentações O SISTEMA DEVE informar o impacto (`SET NULL`) antes de confirmar.
- **FR-004**: QUANDO o cadastro usa e-mail já existente O SISTEMA DEVE exibir o `409` da API no formulário.
- **FR-017**: QUANDO o usuário submete duas vezes seguidas O SISTEMA DEVE desabilitar o botão durante o envio (evita duplicidade).
- **FR-027**: QUANDO a API está fora do ar O SISTEMA DEVE exibir erro de conexão e permitir nova tentativa (sem quebrar o layout).
- **FR-026**: QUANDO o resumo carrega antes da tabela (ou vice-versa) O SISTEMA DEVE mostrar cada seção independente em loading.
- **FR-029**: QUANDO o valor é 0 ou muito grande O SISTEMA DEVE formatar corretamente (`R$ 0,00`; milhares com ponto).
- **FR-009**: QUANDO o token expira entre abas O SISTEMA DEVE tratar o próximo `401` como logout automático.

## 8. Contratos de Dados (Entities)

Schemas zod espelhados em `ui/src/lib/schemas/` (ADR-0009) — regras copiadas dos DTOs da API (Specs 001–003):

| Schema | Campos (nome: tipo, obrigatório?) | Fonte na API |
|---|---|---|
| `userProfile` | `id: string` · `name: string` · `email: string` · `createdAt: number` | `auth/dto/user-profile.dto.ts` |
| `authResponse` | `accessToken: string` · `user: userProfile` | resposta de register/login |
| `category` | `id: string` · `userId: string` · `name: string (1–50, trim)` · `color: string\|null (#RRGGBB)` · `icon: string\|null (1–50)` · `createdAt: number` · `updatedAt: number` | `categories/dto/*.ts` |
| `transaction` | `id: string` · `userId: string` · `categoryId: string\|null` · `type: 'INCOME'\|'EXPENSE'` · `amountCents: int > 0` · `description: string (1–200, trim)` · `date: YYYY-MM-DD válida` · `createdAt: number` · `updatedAt: number` | `transactions/dto/*.ts` |
| `paginationMeta` | `page: number` · `pageSize: number` · `totalItems: number` · `totalPages: number` · `hasNextPage: boolean` · `hasPreviousPage: boolean` | `common/types/pagination.ts` (ADR-0007) |
| `summary` | `totalIncomeCents: number` · `totalExpenseCents: number` · `balanceCents: number` | `transactions/dto/transaction-summary.dto.ts` |

Sessão (ADR-0008): token JWT em `localStorage` (chave de app), usuário em memória, validado via `GET /auth/me`.

## 9. Contratos de API

Todos os endpoints já existem e estão documentados nas Specs 001–003 e no Swagger (`/swagger`). Consumidos pela UI:

| Método/rota | Resposta | Erros relevantes |
|---|---|---|
| `POST /auth/register` | `201` `{ accessToken, user }` | `400` validação · `409` e-mail duplicado |
| `POST /auth/login` | `200` `{ accessToken, user }` | `400` validação · `401` credenciais inválidas |
| `GET /auth/me` | `200` `user` | `401` não autenticado |
| `GET /categories` | `200` `Category[]` (ordenado por nome, case-insensitive) | `401` |
| `POST /categories` | `201` `Category` | `400` · `409` nome duplicado |
| `PATCH /categories/:id` | `200` `Category` | `400` · `404` |
| `DELETE /categories/:id` | `204` (sem corpo) | `400` · `404` |
| `GET /transactions?page&pageSize` | `200` `{ data: Transaction[], meta: PaginationMeta }` | `400` query inválida (pageSize > 100) |
| `POST /transactions` | `201` `Transaction` | `400` (inclui categoria alheia — regra da API) |
| `PATCH /transactions/:id` | `200` `Transaction` | `400` · `404` |
| `DELETE /transactions/:id` | `204` (sem corpo) | `400` · `404` |
| `GET /transactions/summary` | `200` `{ totalIncomeCents, totalExpenseCents, balanceCents }` | `401` |

- Erros no formato do envelope global `{ statusCode, message, error }` (T-003) — a UI deve exibir `message` quando disponível.
- Registro de login/cadastro da Spec 001: `name` 1–100 (register), `email` normalizado (trim+lowercase), `password` 8–72 bytes (register) / mínimo 1 (login, sem revelar política).
- `204` não tem corpo — o cliente deve tratar como sucesso vazio.

## 10. Tratamento de Erros

- **API client** (`ui/src/lib/api/`): parse da resposta com os schemas espelhados (`safeParse`); falha de parse → erro de contrato (bug), exibido como erro genérico.
- **Envelope**: erros 4xx/5xx normalizados para `{ statusCode, message, error }`; a UI exibe `message` no contexto certo (campo do formulário para validação/duplicidade; toast para falhas de operação).
- **401**: tratado globalmente — limpa sessão e redireciona para `/` (FR-009).
- **Rede/offline**: mensagem de conexão + botão de nova tentativa (FR-027).
- **Submissões**: botão desabilitado durante envio; erros de servidor exibidos no próprio formulário/modal.

## 11. Critérios de Sucesso (SC)

- **SC-001**: `npm run lint` e `npm run build` na `ui/` sem erros.
- **SC-002**: fluxos manuais completos contra a API real: cadastro → login → CRUD de movimentações e categorias → logout; token expirado → `401` → volta para `/`.
- **SC-003**: navegação de páginas na tabela e abertura de modais **não recarregam a página** (client-side, TanStack Query).
- **SC-004**: nenhuma mudança no código da `api/` durante a Fase 6 (contratos consumidos como estão).

## 12. Perguntas em aberto (Open Questions)

- [ ] **[NEEDS CLARIFICATION]** Testes automatizados de UI (Playwright/component tests) — manter como follow-up pós-v1 ou incluir no escopo? (default: follow-up)
- [ ] **[NEEDS CLARIFICATION]** Filtros client-side na tabela (data/categoria/tipo) — fora do v1 ou incluir? (default: fora do v1)
- [ ] Detalhes visuais finais (tom exato do tema, densidade da tabela, ícones) — decididos na implementação pela diretriz de design, sem nova spec.

## 13. Referências / Evidências

- [Spec 001 — Autenticação e usuários](../specs/001-autenticacao-e-usuarios.md) · [Spec 002 — Categorias](../specs/002-categorias.md) · [Spec 003 — Movimentações](../specs/003-movimentacoes.md) — contratos de API consumidos.
- [ADR-0002](./0002-jwt-access-token.md) — JWT Bearer; logout client-side.
- [ADR-0007](./0007-paginacao-por-pagina.md) — resposta paginada `{ data, meta }`.
- [ADR-0008](./0008-sessao-e-fetch-na-ui.md) — sessão em `localStorage`, fetch client-side.
- [ADR-0009](./0009-contratos-zod-espelhados-na-ui.md) — schemas espelhados na UI.
- [ui/AGENTS.md](../../ui/AGENTS.md) — stack e convenções da UI.
- Evidências: `npm run lint` · `npm run build` · fluxos manuais com a API rodando.
