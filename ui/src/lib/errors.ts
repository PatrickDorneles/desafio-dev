import { ApiError } from "@/lib/api/client";

/**
 * Error → user-displayable message. `ApiError` carries the API envelope
 * message (already pt-BR); anything else gets a safe generic fallback so we
 * never leak raw exceptions to the user (FR-027).
 */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
