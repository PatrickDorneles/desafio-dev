import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Public user profile shape — Spec 001, §9 (`GET /auth/me`, register/login responses).
 * Used for Swagger response docs and guarantees no `passwordHash` leaks (SC-001).
 */
export const userProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.number(),
});

export class UserProfileDto extends createZodDto(userProfileSchema) {}
