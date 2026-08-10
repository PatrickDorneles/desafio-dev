import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserPayload } from '../types/current-user';

/**
 * Injects the authenticated user (`{ sub }`) set by JwtAuthGuard.
 * Only valid on routes protected by the global guard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserPayload => {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: CurrentUserPayload }>();
    return request.user as CurrentUserPayload;
  },
);
