---
name: zod-shared-schemas
description: Use when defining or using Zod validation schemas in this project — API DTOs, request/response validation, form validation, or deriving TypeScript types. Keep contracts consistent between the NestJS api/ and Next.js ui/. Trigger keywords: zod, schema, validation, dto, contract, z.infer, safeParse.
---

# Zod shared schemas (API ↔ UI)

Zod is the **single source of truth** for data contracts in this project. One definition per contract; types and validation derive from it. Never maintain two drifting copies for api and ui.

## Where schemas live

- Define entity/DTO schemas once (api `dto/` area or a shared contracts module) and share/mirror with the UI — the rule is **one definition, derived everywhere**.
- The UI imports the shared definitions to parse API responses and validate forms.

## Core patterns

- Derive types, never duplicate:

  ```ts
  const createTransactionSchema = z.object({
    description: z.string().min(1).max(200),
    amountCents: z.number().int().positive(),
    categoryId: z.string().uuid(),
  });
  type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
  ```

- Parse at boundaries with `safeParse` — map failures to structured 4xx (API) or field errors (UI forms). Don't let `parse` throw raw errors to the client.
- With `.transform()`, `z.input` ≠ `z.output` — type consumers accordingly.
- SQLite has no enums: model them as `z.enum([...])` / `z.union([z.literal('x'), ...])` over `text` columns.

## Validation strategy

- API: validate at the pipe/DTO boundary; never trust the raw request body.
- UI: reuse the same schemas for form validation and response parsing; keep messages user-friendly.
- Validate once per boundary, not in every layer.

## Anti-patterns

- Hand-writing parallel TS interfaces instead of `z.infer`.
- Two copies of a schema (api + ui) that can drift.
- Using `parse` (throw) in request paths without error mapping.
