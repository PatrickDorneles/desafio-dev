import { BadRequestException } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';
import { ZodError } from 'zod';

/**
 * Maps Zod issues to a BadRequestException whose `message` is an array of
 * strings (Spec 001, §10: validation 400 → `message: string[]`).
 * The default nestjs-zod exception uses a single "Validation failed" string,
 * so we override the exception factory while keeping the official pipe.
 */
function createValidationException(error: unknown): BadRequestException {
  const issues = error instanceof ZodError ? error.issues : [];
  const messages = issues.map((issue) => issue.message);

  return new BadRequestException({
    statusCode: 400,
    message: messages,
    error: 'Bad Request',
  });
}

export const ZodValidationPipe = createZodValidationPipe({
  createValidationException,
});
