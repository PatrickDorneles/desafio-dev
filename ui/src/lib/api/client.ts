import { z } from 'zod';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const TOKEN_STORAGE_KEY = 'dsf.auth.token';

export type ApiErrorKind = 'NETWORK' | 'HTTP' | 'RESPONSE_SCHEMA';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;

  constructor(kind: ApiErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

type UnauthorizedHandler = () => void;

let onUnauthorizedHandler: UnauthorizedHandler | null = null;

/** Registered by the session module (ADR-0008): any 401 clears the session. */
export function registerOnUnauthorized(handler: UnauthorizedHandler): void {
  onUnauthorizedHandler = handler;
}

interface ApiFetchOptions<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema?: z.ZodType<T>;
}

/**
 * Typed fetch against the API. Reads the token from localStorage
 * (`dsf.auth.token`), validates every JSON response with the provided zod
 * schema (`safeParse` — never trust the wire), and normalizes failures into
 * `ApiError`. 204 responses are treated as empty success.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions<T> = {},
): Promise<T> {
  const { method = 'GET', body, schema } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      'NETWORK',
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    );
  }

  if (response.status === 401) {
    onUnauthorizedHandler?.();
  }

  if (!response.ok) {
    throw new ApiError('HTTP', await extractErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!schema) {
    return undefined as T;
  }

  const raw: unknown = await response.json();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(
      'RESPONSE_SCHEMA',
      'Resposta da API em formato inesperado.',
      response.status,
    );
  }

  return parsed.data;
}

/** Reads the global error envelope `{ statusCode, message, error }` (T-003). */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const envelope: unknown = await response.json();
    if (envelope && typeof envelope === 'object' && 'message' in envelope) {
      const message = (envelope as { message: unknown }).message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
      if (Array.isArray(message)) {
        const parts = message.filter(
          (part): part is string => typeof part === 'string',
        );
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    }
  } catch {
    // Non-JSON error body — fall through to the generic message.
  }
  return `Erro inesperado (${response.status}).`;
}