# 🔧 Documentação da API

Documentação operacional do backend NestJS da aplicação de movimentações financeiras.

## Stack

- **NestJS 11** com adapter **Fastify**
- **Drizzle ORM** + **SQLite** (`better-sqlite3`) — migrations via `drizzle-kit` (auto-aplicadas no boot)
- **Zod** + `nestjs-zod` (DTOs com validação e integração Swagger)
- **JWT** (HS256) + **bcrypt** (cost 12)
- **Swagger** em `/swagger` · **Jest** (unit + e2e)

## Guias rápidos

- **Como rodar / instalar / testar:** [`api/README.md`](../README.md) — guia operacional completo (install, `.env`, variáveis, endpoints, migrations).
- **Convenções de código:** [`api/AGENTS.md`](../AGENTS.md) — estrutura em camadas (ADR-0003), DTOs, Drizzle.

## Documentação do projeto

- Especificações de funcionalidades (contratos/aceitação): [`docs/specs/`](../../docs/specs/)
- Architecture Decision Records: [`docs/adr/`](../../docs/adr/)
- Roadmap de implementação: [`docs/tasks.md`](../../docs/tasks.md)
