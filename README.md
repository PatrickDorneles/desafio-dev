# 💼 Desafio Técnico Dev Fullstack
Este é um desafio técnico para a vaga de Desenvolvedor Pleno. Seu objetivo é desenvolver uma aplicação movimentações financeiras, com autenticação de usuário, associação de categorias e persistência em banco de dados.

## 🧰 Requisitos Técnicos
- Usar a estrutura inicial deste repositório (API utilizando NestJS e UI utilizando NextJS+Tailwind).
- Login de usuário.
- Cadastro de Usuários.
- Cadastro de Movimentações.
- Cadastro de Categorias
- As movimentações devem ser associadas ao usuário autenticado.

## ✅ O que será avaliado?

- **📁 Organização do Código**  
  Estrutura clara de pastas e arquivos, padronização e uso adequado de convenções do framework.

- **🧹 Legibilidade e Clareza**  
  Código limpo, bem nomeado e fácil de entender. Comentários úteis (quando necessário) e ausência de complexidade desnecessária.

- **🛠️ Boas Práticas de Desenvolvimento**  
  Uso de princípios como DRY (Don't Repeat Yourself), SOLID, controle de erros, validações e segurança básica.

- **💾 Persistência de Dados**  
  Implementação correta de banco de dados, com relacionamentos adequados entre usuários, categorias e movimentações.  
  **Dica:** Use um ORM 👀

- **📝 Documentação**  
  README com orientações completas sobre instalação*, execução e stack utilizada.  
  A API deve estar documentada com **Swagger**.

> ⚠️ **Importante:** Projetos que **não rodarem seguindo as instruções do README** poderão **ser desconsiderados** na avaliação.


## 🌟 Diferenciais
Não são obrigatórios, mas serão considerados um **bônus** na sua avaliação:

- 🧪 **Testes Automatizados**  
  Cobertura de testes (unitários e/ou de integração).

- 📱 **Responsividade no Frontend**  
  Interface adaptada para diferentes tamanhos de tela.

- 🚀 **Deploy do Projeto**  
  Aplicação hospedada (ex: Vercel, Netlify, Render, Railway, etc), com link acessível no README.

- 🛡️ **Tratamento de Erros e Validações**  
  Respostas consistentes e mensagens claras de erro na API.

- 🧩 **Arquitetura Escalável**  
  Separação por camadas (ex: controllers, services, repositories), facilitando manutenção e evolução do projeto.

- 🗂️ **Documentação Extra**  
  Diagramas, fluxos ou qualquer outro material que ajude a entender a arquitetura ou decisões técnicas.

## 📁 Estrutura do Projeto

O projeto está dividido em duas aplicações separadas:
```text
📦 projeto-raiz/
├── 📁 docs/                     # Documentação (specs + ADRs)
├── 📁 api/                      # Backend (NestJS)
│   ├── 📁 docs/                 # Documentação da API
│   ├── 📁 node_modules/
│   ├── 📁 src/                  # Código-fonte da API
│   ├── 📁 test/                 # Testes automatizados
│   ├── ...
│
├── 📁 ui/                       # Frontend (Next.js)
│   ├── 📁 docs/                 # Documentação da UI
│   ├── 📁 node_modules/
│   ├── 📁 public/               # Arquivos estáticos
│   ├── 📁 src/
│   │   └── 📁 app/              # Código-fonte do frontend
│   ├── ...
```

## 📚 Documentação

O projeto usa documentação orientada a **especificações e decisões** (spec-driven development) para guiar o desenvolvimento — humano e agêntico (agentes de IA):

- 📋 **`docs/specs/`** — Especificações de funcionalidades (o que construir): requisitos, critérios de aceitação e contratos.
- 🧭 **`docs/adr/`** — Architecture Decision Records (por que foi decidido): contexto, opções e consequências de cada decisão de arquitetura.
- 🔧 **`api/docs/`** — Documentação específica do backend.
- 🎨 **`ui/docs/`** — Documentação específica do frontend.

Templates prontos para criação de novas specs e ADRs: [`docs/specs/_template.md`](./docs/specs/_template.md) e [`docs/adr/_template.md`](./docs/adr/_template.md).

## 🗄️ Banco de Dados
Se sua aplicação utilizar **banco de dados relacional** (como PostgreSQL, MySQL, etc), é **obrigatório** fornecer um dos seguintes:

- Script SQL para criação das tabelas e estruturas necessárias  
  **ou**
- Migrations configuradas e executáveis via ORM.

> ⚠️ **Importante:** Sem essas informações, **não será possível rodar a aplicação**, e ela poderá ser **desconsiderada** na avaliação.

## ⏱️ Prazo de entrega sugerido:
3 a 5 dias corridos. Qualidade importa mais do que velocidade.

## 🚀 Como Enviar sua Solução
- 🔀 Faça um Fork deste repositório para a sua conta no GitHub.
- 🧑🏽‍💻 Implemente a sua solução no repositório forkado.
- 🌐 Certifique-se de que o repositório esteja público.
- 📩 Envie o link do seu repositório para o e-mail:
  - ti@profissionaissa.com
  - Com cópia para: jonata.martins@profissionaissa.com

---

# 🧑🏽‍💻 Implementação

Status atual: **solução completa** — API (autenticação JWT, categorias, movimentações + resumo financeiro, testes unitários e e2e, Swagger) e UI (landing page, dashboard com resumo, CRUD de categorias e movimentações, tema dark navy, testes e2e com Playwright).

## Stack

- **API:** NestJS 11 · Fastify · Drizzle ORM + SQLite · Zod · JWT + bcrypt · Swagger · Jest
- **UI:** Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · shadcn/ui · TanStack Query · Zod · Playwright

## Como rodar a API

```bash
cd api
npm install
cp .env.example .env      # ajuste JWT_SECRET
npm run start:dev         # http://localhost:3001
```

- Swagger: http://localhost:3001/swagger
- Migrations são aplicadas automaticamente na inicialização (nenhuma etapa manual).
- **Banco dual-driver (ADR-0010):** sem `TURSO_DATABASE_URL` → SQLite local (`DB_PATH`); definido → Turso/libSQL remoto (deploy, dado persistido).
- Instruções completas (variáveis de ambiente, endpoints, testes, migrations): [`api/README.md`](./api/README.md).

## Como rodar a UI

> Pré-requisito: a API rodando em `http://localhost:3001` (ver seção anterior).

```bash
cd ui
npm install
cp .env.example .env      # opcional — default aponta para http://localhost:3001
npm run dev               # http://localhost:3000
```

- `NEXT_PUBLIC_API_URL`: URL base da API (default: `http://localhost:3001`).
- Instruções completas: [`ui/README.md`](./ui/README.md).

## Testes

```bash
cd api
npm test                  # unitários
npm run test:e2e          # e2e
npm run lint

cd ui
npm run lint              # eslint
npm run build             # type-check + build
npx playwright test       # e2e (fluxos principais; sobe API + UI automaticamente, se preciso)
```

## Estrutura

```text
docs/            # spec-driven: docs/specs/ (o quê) + docs/adr/ (por quê) + tasks.md (roadmap)
api/             # backend NestJS (camadas: controllers/services/repositories/dto/entities)
ui/              # frontend Next.js
```

## Documentação

- Especificações e critérios de aceitação: [`docs/specs/`](./docs/specs/)
- Decisões de arquitetura (ADRs 0001–0009): [`docs/adr/`](./docs/adr/)
- Roadmap de implementação: [`docs/tasks.md`](./docs/tasks.md)
- Guias operacionais: [`api/README.md`](./api/README.md) e [`ui/README.md`](./ui/README.md)

