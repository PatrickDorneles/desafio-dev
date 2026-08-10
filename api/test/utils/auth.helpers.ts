import { NestFastifyApplication } from '@nestjs/platform-fastify';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

function json<T>(res: { json: () => unknown }): T {
  return res.json() as T;
}

/**
 * Registers a fresh user and logs in, returning the access token + profile.
 * Reused by categories (Fase 2) and transactions (Fase 3) e2e specs.
 */
export async function registerAndLogin(
  app: NestFastifyApplication,
  name: string,
  email: string,
  password = 'senha-forte-123',
): Promise<AuthSession> {
  const registerRes = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name, email, password },
  });
  if (registerRes.statusCode !== 201) {
    throw new Error(
      `register failed: ${registerRes.statusCode} ${registerRes.body}`,
    );
  }

  const loginRes = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password },
  });
  if (loginRes.statusCode !== 200) {
    throw new Error(`login failed: ${loginRes.statusCode} ${loginRes.body}`);
  }

  const body = json<{ accessToken: string; user: AuthUser }>(loginRes);
  return { token: body.accessToken, user: body.user };
}
