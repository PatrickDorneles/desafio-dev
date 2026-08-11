// espelha api/src/categories/dto/category-response.dto.ts, create-category.dto.ts, update-category.dto.ts
import { z } from 'zod';

export const categorySchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().trim().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
  icon: z.string().trim().min(1).max(50).nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().trim().min(1).max(50).optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
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

export type Category = z.infer<typeof categorySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;