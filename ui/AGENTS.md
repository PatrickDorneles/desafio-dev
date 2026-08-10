# AGENTS.md — UI (Next.js)

Conventions for the `ui/` package. Read the root `AGENTS.md` first.

## Stack & Commands

- Next.js 15 App Router (`next dev --turbopack`) · React 19 · TypeScript strict
- Tailwind CSS v4 (CSS-first config) · shadcn/ui · TanStack Query · zustand (only if needed) · Zod
- Dev server: `npm run dev` → `http://localhost:3000`
- Env: `NEXT_PUBLIC_API_URL` (API base URL, see `.env.example`)
- Build: `npm run build` · Lint: `npm run lint`

## Next.js App Router Conventions

- Routes in `src/app/`; layouts `layout.tsx`, pages `page.tsx`.
- **Server Components by default.** Add `"use client"` only for hooks/events/browser APIs; keep client components as leaves.
- Fetch on the server when possible; client-side data via TanStack Query.
- Mutations: route handlers or server actions + `revalidatePath`/`revalidateTag` — pick one pattern per feature; don't mix.

## Tailwind CSS v4 + shadcn/ui

- CSS-first: design tokens in `globals.css` via `@theme` — **no `tailwind.config.js`**.
- shadcn/ui components live in `src/components/ui/`; add via `npx shadcn@latest add <component>` — don't hand-write variants; customize with `cn()` and CSS variables.
- Prefer existing tokens over ad-hoc values.

## TanStack Query + zustand

- Server state → TanStack Query: query-key factories, deliberate `staleTime`, invalidate on mutations, optimistic updates where UX demands.
- Client-only UI state → zustand (small stores, selector subscriptions).
- Never mirror server data in zustand — the query cache is the source of truth.

## Zod / API contracts

- Parse API responses and form inputs with the shared Zod schemas; type with `z.infer`.
- Validate client-side with the same schemas used by the API (see the `zod-shared-schemas` skill).

## Verification

- `npm run build` and `npm run lint` must pass before finishing a task.
- Responsive + accessible UI is expected (use the `frontend-design` / `web-design-guidelines` skills when touching UI).
