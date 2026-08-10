import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Public category response shape — Spec 002, §9.
 * DB snake_case columns are mapped to camelCase by Drizzle's property names
 * (`userId`, `createdAt`, `updatedAt`), so rows already match this shape.
 * Used for Swagger response docs only; actual responses are the row objects.
 */
export const categoryResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export class CategoryResponseDto extends createZodDto(categoryResponseSchema) {}
