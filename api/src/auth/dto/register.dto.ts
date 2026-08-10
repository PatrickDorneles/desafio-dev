import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * POST /auth/register — Spec 001, §9.
 * Email is normalized (trim + lowercase) in the schema (FR-010).
 * Password: min 8 chars AND ≤ 72 bytes (bcrypt limit, FR-012) — char count alone
 * is not enough, so we check `Buffer.byteLength`.
 */
export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z
    .string()
    .min(8)
    .superRefine((value, ctx) => {
      if (Buffer.byteLength(value, 'utf8') > 72) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password must be at most 72 bytes',
        });
      }
    }),
});

export class RegisterDto extends createZodDto(registerSchema) {}
