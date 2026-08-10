import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * PATCH /categories/:id — Spec 002, §9.
 * Same field validators as create, all optional. FR-011: at least one field
 * must be present (empty body → 400 with a `string[]` message via the pipe).
 */
export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    icon: z.string().trim().min(1).max(50).optional(),
  })
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided',
      });
    }
  });

export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}
