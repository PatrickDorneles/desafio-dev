// espelha api/src/auth/dto/user-profile.dto.ts, register.dto.ts, login.dto.ts
import { z } from 'zod';

export const userProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.number(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z
    .string()
    .min(8)
    .superRefine((value, ctx) => {
      if (utf8ByteLength(value) > 72) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password must be at most 72 bytes',
        });
      }
    }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: userProfileSchema,
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;

/** Browser-safe UTF-8 byte length — mirrors the API's `Buffer.byteLength`. */
function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}