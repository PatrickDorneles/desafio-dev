import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * POST /categories — Spec 002, §9.
 * `name`: trim + 1–50 (FR-009: empty/whitespace-only rejected after trim).
 * `color`: optional hex `#RRGGBB` (FR-010).
 * `icon`: optional trim + 1–50.
 * Uniqueness (case-insensitive) is enforced in the service (FR-002) + DB (FR-013).
 */
export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().trim().min(1).max(50).optional(),
});

export class CreateCategoryDto extends createZodDto(createCategorySchema) {}
