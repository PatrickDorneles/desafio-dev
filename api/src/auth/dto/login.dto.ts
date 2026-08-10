import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * POST /auth/login — Spec 001, §9.
 * Email normalized the same way as register. Password only requires min 1 char —
 * we do NOT reveal the length policy on login (FR-004 / CA-004).
 */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

export class LoginDto extends createZodDto(loginSchema) {}
