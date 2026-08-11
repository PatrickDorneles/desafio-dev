import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from '../../users/repositories/users.repository';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const SECRET = 'test-secret-at-least-16-chars';
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let realJwt: JwtService;
  let usersRepository: jest.Mocked<Pick<UsersRepository, 'findById'>>;

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
    usersRepository = { findById: jest.fn() };
    guard = new JwtAuthGuard(
      reflector as unknown as Reflector,
      realJwt,
      usersRepository as unknown as UsersRepository,
    );
  });

  it('allows @Public() routes without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = mockContext({});
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('passes a valid token and sets request.user to the DB user (id/name/email)', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    usersRepository.findById.mockReturnValue({
      id: 'uuid-1',
      name: 'Alice',
      email: 'alice@example.com',
      passwordHash: 'hashed-password',
      createdAt: 1780000000000,
      updatedAt: 1780000000000,
    });
    const token = await realJwt.signAsync({ sub: 'uuid-1' });
    const context = mockContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(usersRepository.findById).toHaveBeenCalledWith('uuid-1');
    expect(context.request.user).toEqual({
      id: 'uuid-1',
      name: 'Alice',
      email: 'alice@example.com',
    });
  });

  it('throws 401 when the token has no backing user (stale/deleted)', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    usersRepository.findById.mockReturnValue(undefined);
    const token = await realJwt.signAsync({ sub: 'uuid-1' });
    const context = mockContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(context.request.user).toBeUndefined();
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
