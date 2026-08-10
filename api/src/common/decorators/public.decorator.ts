import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as public — the global JwtAuthGuard skips authentication
 * for handlers/controllers carrying this metadata (ADR-0002).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
