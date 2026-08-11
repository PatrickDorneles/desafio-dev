import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { CurrentUserPayload } from '../../common/types/current-user';
import { UsersRepository } from '../../users/repositories/users.repository';
import { JwtUser } from '../types/auth.types';

type AuthenticatedRequest = FastifyRequest & { user?: CurrentUserPayload };

/**
 * Global guard (registered as APP_GUARD). No passport — plain JwtService.
 * - `@Public()` routes skip authentication entirely.
 * - Otherwise requires `Authorization: Bearer <token>`; the token is verified
 *   with `verifyAsync(..., { algorithms: ['HS256'] })` and the backing user is
 *   resolved from the DB (SC-001). `request.user` carries the actual user data
 *   `{ id, name, email }` — never the password hash.
 * - A token whose `sub` has no backing user (stale/deleted) is rejected: the
 *   token alone must NOT authorize.
 * - Every failure (missing/malformed/expired token, unknown user) maps to the
 *   SAME generic 401 (CA-006): we never distinguish expired vs malformed.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtUser>(token, {
        algorithms: ['HS256'],
      });
      const user = await this.usersRepository.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Unauthorized');
      }
      request.user = { id: user.id, name: user.name, email: user.email };
      return true;
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }
}
