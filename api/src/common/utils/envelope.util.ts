import { ErrorEnvelope } from '../types/error-envelope';

export function buildErrorEnvelope(
  statusCode: number,
  message: string | string[],
  error: string,
): ErrorEnvelope {
  return { statusCode, message, error };
}
