import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './utils/test-app';

interface UserProfileBody {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

interface LoginBody {
  accessToken: string;
  user: UserProfileBody;
}

interface ErrorEnvelope {
  statusCode: number;
  message: string | string[];
  error: string;
}

function json<T>(res: { json: () => unknown }): T {
  return res.json() as T;
}

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const registerBody = {
    name: 'Maria Silva',
    email: 'maria@example.com',
    password: 'senha-forte-123',
  };

  it('POST /auth/register → 201, body has NO passwordHash (CA-001/SC-001)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: registerBody,
    });

    expect(res.statusCode).toBe(201);
    const profile = json<UserProfileBody>(res);
    expect(profile).not.toHaveProperty('passwordHash');
    expect(profile).toMatchObject({
      name: 'Maria Silva',
      email: 'maria@example.com',
    });
    expect(typeof profile.id).toBe('string');
    expect(typeof profile.createdAt).toBe('number');
  });

  it('POST /auth/register duplicate email (different case) → 409 (CA-002)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { ...registerBody, email: 'MARIA@example.com' },
    });

    expect(res.statusCode).toBe(409);
    expect(json<ErrorEnvelope>(res)).toEqual({
      statusCode: 409,
      message: 'Email already registered',
      error: 'Conflict',
    });
  });

  it('POST /auth/login → 200 with accessToken + user (CA-003)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: registerBody.email, password: registerBody.password },
    });

    expect(res.statusCode).toBe(200);
    const login = json<LoginBody>(res);
    expect(typeof login.accessToken).toBe('string');
    expect(login.accessToken.split('.')).toHaveLength(3);
    expect(login.user).toMatchObject({ email: 'maria@example.com' });
    expect(login.user).not.toHaveProperty('passwordHash');
  });

  it('POST /auth/login wrong password and unknown email → IDENTICAL 401 body (CA-004)', async () => {
    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: registerBody.email, password: 'senha-errada' },
    });

    const unknownEmail = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@example.com', password: 'qualquer-coisa' },
    });

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(json<ErrorEnvelope>(wrongPassword)).toEqual(
      json<ErrorEnvelope>(unknownEmail),
    );
    expect(json<ErrorEnvelope>(wrongPassword)).toEqual({
      statusCode: 401,
      message: 'Invalid credentials',
      error: 'Unauthorized',
    });
  });

  it('GET /auth/me with valid token → 200 profile (CA-005)', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: registerBody.email, password: registerBody.password },
    });
    const login = json<LoginBody>(loginRes);

    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${login.accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    const profile = json<UserProfileBody>(res);
    expect(profile).toMatchObject({ email: 'maria@example.com' });
    expect(profile).not.toHaveProperty('passwordHash');
  });

  it('GET /auth/me without token → 401 (CA-006)', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });

    expect(res.statusCode).toBe(401);
    expect(json<ErrorEnvelope>(res)).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized',
    });
  });

  it('GET /auth/me with garbage token → 401 (CA-006)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer garbage-token' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('GET /health without token → 200 (public)', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(json<{ status: string }>(res)).toEqual({ status: 'ok' });
  });
});
