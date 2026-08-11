# UI — Next.js

Frontend da aplicação de **movimentações financeiras** (desafio técnico).

- **Stack:** Next.js 15 (App Router) · React 19 · Tailwind CSS 4 · shadcn/ui · TanStack Query · TypeScript
- **Rodar:** `npm install` → `npm run dev` (porta `3000`)
- **Ambiente:** `NEXT_PUBLIC_API_URL` — URL base da API (default: `http://localhost:3001`; ver `.env.example`)
- **Pré-requisito:** API rodando em `http://localhost:3001` (ver [`../api/README.md`](../api/README.md))

## Testes

```bash
npm run lint              # eslint
npm run build             # type-check + build
npx playwright test       # e2e (fluxos principais; sobe API + UI automaticamente, se preciso)
```

📚 Documentação detalhada em [`docs/`](./docs/) e na raiz do projeto ([`docs/`](../docs/)).
