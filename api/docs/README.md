# 🔧 Documentação da API

Backend NestJS da aplicação de movimentações financeiras.

## Stack

- **NestJS 11** com adapter **Fastify**
- **Swagger** (`@nestjs/swagger`) — documentação interativa em `/swagger`
- TypeScript · Jest (testes unitários e e2e)

## Como rodar

```bash
npm install
npm run start:dev       # dev com watch → http://localhost:3001
npm run build && npm run start:prod
npm test                # testes unitários
npm run test:e2e        # testes e2e
```

- Porta configurável via `PORT` (default `3001`).
- CORS liberado (habilitado no bootstrap).

## Documentação

- Especificações da aplicação: [`docs/specs/`](../../docs/specs/)
- Decisões de arquitetura: [`docs/adr/`](../../docs/adr/)
- Especificações específicas da API serão listadas aqui quando criadas.
