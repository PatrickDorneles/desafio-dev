import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const SECRET = 'test-secret-at-least-16-chars';
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let realJwt: JwtService;

  function mockContext(
    headers: Record<string, string | undefined>,
  ): ExecutionContext & {
    request: { headers: Record<string, string | undefined>; user?: unknown };
  } {
    const request: {
      headers: Record<string, string | undefined>;
      user?: unknown;
    } = { headers };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
      request,
    } as unknown as ExecutionContext & {
      request: { headers: Record<string, string | undefined>; user?: unknown };
    };
    return context;
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    realJwt = new JwtService({ secret: SECRET });
    guard = new JwtAuthGuard(reflector as unknown as Reflector, realJwt);
  });

  it('allows @Public() routes without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = mockContext({});
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('passes a valid token and sets request.user.sub', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const token = await realJwt.signAsync({ sub: 'uuid-1' });
    const context = mockContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.request.user).toEqual({ sub: 'uuid-1' });
  });

  it('throws 401 when the Authorization header is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = mockContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws 401 for a malformed token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = mockContext({ authorization: 'Bearer garbage-token' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws 401 for an expired token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const expiredToken = await realJwt.signAsync(
      { sub: 'uuid-1' },
      { expiresIn: '-1s' },
    );
    const context = mockContext({ authorization: `Bearer ${expiredToken}` });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
