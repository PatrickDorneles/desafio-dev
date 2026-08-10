# AGENTS.md

> Guide for AI coding agents working in this repository. Read this file first.
> Before implementing any feature, read the relevant spec in `docs/specs/` and related ADRs in `docs/adr/`.

## Project Overview

Full-stack **financial transactions** application (technical challenge):

- `api/` — NestJS 11 backend (Fastify adapter, Swagger)
- `ui/` — Next.js 15 frontend (App Router, React 19, Tailwind CSS v4)
- `docs/` — spec-driven documentation: `docs/specs/` (what to build) + `docs/adr/` (why decisions were made)

Development is **spec-driven**: implement from specs in `docs/specs/`, record architectural decisions as ADRs in `docs/adr/`.

## Tech Stack (non-negotiable)

- **API:** NestJS 11 · Fastify · Drizzle ORM + SQLite · Zod (schemas) · Swagger
- **UI:** Next.js 15 App Router · React 19 · Tailwind CSS v4 · shadcn/ui · TanStack Query · zustand (only if needed) · Zod
- **Both:** TypeScript strict. Zod is the single source of truth for data contracts (see the `zod-shared-schemas` skill).

## Commands

```bash
# API (port 3001)
npm install --prefix api
npm run start:dev --prefix api
npm run build --prefix api
npm test --prefix api             # jest unit
npm run test:e2e --prefix api

# UI (port 3000)
npm install --prefix ui
npm run dev --prefix ui
npm run build --prefix ui
npm run lint --prefix ui
```

## Project Structure

```text
docs/specs/    # feature specs (contracts) — read before implementing
docs/adr/      # architecture decision records — append-only
docs/tasks.md  # implementation roadmap (task breakdown with verification steps)
api/docs/      # API operational docs
ui/docs/       # UI operational docs
api/src/       # NestJS source (see api/AGENTS.md)
ui/src/app/    # Next.js App Router pages (see ui/AGENTS.md)
```

## Documentation Pointers

- **Read first, then code:** no implementation starts without reading the relevant spec in `docs/specs/` and its related ADRs in `docs/adr/`.
- **Follow the roadmap:** `docs/tasks.md` breaks implementation into ordered tasks (T-001…) with explicit verification steps. Mark tasks done as you complete them; don't skip the order.
- No spec for a feature? Create one with `docs/specs/_template.md`, get it Approved, then implement.
- New architectural decision → new ADR with `docs/adr/_template.md`. `docs/adr/` is append-only; Accepted ADRs are immutable (only a new superseding ADR may change them).
- Per-app conventions: `api/AGENTS.md` and `ui/AGENTS.md`.

## Code Style

- TypeScript strict; no `any`; derive types from Zod schemas (`z.infer`) instead of hand-written interfaces for contracts.
- NestJS: module-per-feature, constructor DI, thin controllers, logic in services. Entity-per-module (ADR-0004): each Drizzle entity has its own module that exports its repository. Minimal exports, types in `types/` (ADR-0005): module types/interfaces live in `src/<module>/types/` (and `src/common/types/` for global ones); entity/service/repository files export only schema/class.
- Next.js: Server Components by default; `"use client"` only when interactivity requires it.
- Format with Prettier, lint with the provided ESLint configs.

## Git Workflow

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Branches: `feature/<spec-id>-<slug>` or `fix/<slug>`.
- Commit docs (specs/ADRs) separately from code when practical.

## Boundaries / Do Not Touch

- Generated: `node_modules/`, `dist/`, `.next/`, coverage output.
- Drizzle migration output — change only via `drizzle-kit generate`, never by hand.
- `docs/adr/` — append-only.
- `.env` files and secrets — never commit.

## Security Rules

- Validate every external input with Zod (`safeParse`) before use.
- All DB access through Drizzle (parameterized) — no string-concatenated SQL.
- Never log passwords, tokens, or personal data.
- Passwords must be hashed (bcrypt/argon2) — never plain text.
