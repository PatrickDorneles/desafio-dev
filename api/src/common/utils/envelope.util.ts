export interface ErrorEnvelope {
  statusCode: number;
  message: string | string[];
  error: string;
}

export function buildErrorEnvelope(
  statusCode: number,
  message: string | string[],
  error: string,
): ErrorEnvelope {
  return { statusCode, message, error };
}
