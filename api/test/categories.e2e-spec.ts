import { randomUUID } from 'node:crypto';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './utils/test-app';
import { registerAndLogin } from './utils/auth.helpers';

interface CategoryBody {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  icon: string | null;
  createdAt: number;
  updatedAt: number;
}

interface ErrorEnvelope {
  statusCode: number;
  message: string | string[];
  error: string;
}

function json<T>(res: { json: () => unknown }): T {
  return res.json() as T;
}

describe('Categories (e2e)', () => {
  let app: NestFastifyApplication;
  let tokenA: string;
  let userIdA: string;
  let tokenB: string;
  let tokenC: string;

  beforeAll(async () => {
    app = await createTestApp();
    const a = await registerAndLogin(
      app,
      'Alice Categorias',
      'alice.cat@example.com',
    );
    tokenA = a.token;
    userIdA = a.user.id;
    const b = await registerAndLogin(
      app,
      'Bob Categorias',
      'bob.cat@example.com',
    );
    tokenB = b.token;
    const c = await registerAndLogin(
      app,
      'Carol Categorias',
      'carol.cat@example.com',
    );
    tokenC = c.token;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = (token: string): { authorization: string } => ({
    authorization: `Bearer ${token}`,
  });

  async function createCategory(
    token: string,
    payload: Record<string, unknown>,
  ): Promise<CategoryBody> {
    const res = await app.inject({
      method: 'POST',
      url: '/categories',
      headers: auth(token),
      payload,
    });
    expect(res.statusCode).toBe(201);
    return json<CategoryBody>(res);
  }

  it('CA-001: POST /categories → 201 with full body (id, userId, timestamps)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/categories',
      headers: auth(tokenA),
      payload: { name: 'Alimentação', color: '#FF5733', icon: 'utensils' },
    });

    expect(res.statusCode).toBe(201);
    const category = json<CategoryBody>(res);
    expect(category).toMatchObject({
      userId: userIdA,
      name: 'Alimentação',
      color: '#FF5733',
      icon: 'utensils',
    });
    expect(typeof category.id).toBe('string');
    expect(typeof category.createdAt).toBe('number');
    expect(typeof category.updatedAt).toBe('number');
  });

  it('CA-002: duplicate name different case → 409', async () => {
    await createCategory(tokenA, { name: 'Duplicada' });

    const res = await app.inject({
      method: 'POST',
      url: '/categories',
      headers: auth(tokenA),
      payload: { name: 'duplicada' },
    });

    expect(res.statusCode).toBe(409);
    expect(json<ErrorEnvelope>(res)).toEqual({
      statusCode: 409,
      message: 'Category name already exists',
      error: 'Conflict',
    });
  });

  it('CA-003: GET /categories returns only own categories ordered by name (case-insensitive)', async () => {
    await createCategory(tokenA, { name: 'Zebra' });
    await createCategory(tokenA, { name: 'mercado' });
    await createCategory(tokenB, { name: 'Bob-only' });

    const res = await app.inject({
      method: 'GET',
      url: '/categories',
      headers: auth(tokenA),
    });

    expect(res.statusCode).toBe(200);
    const list = json<CategoryBody[]>(res);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((c) => c.userId === userIdA)).toBe(true);
    expect(list.some((c) => c.name === 'Bob-only')).toBe(false);
    const names = list.map((c) => c.name);
    const sorted = [...names].sort((x, y) =>
      x.toLowerCase().localeCompare(y.toLowerCase()),
    );
    expect(names).toEqual(sorted);
  });

  it('CA-004: other user id / nonexistent id → identical 404 (GET/PATCH/DELETE)', async () => {
    const category = await createCategory(tokenA, { name: 'Privada' });

    const otherUserGet = await app.inject({
      method: 'GET',
      url: `/categories/${category.id}`,
      headers: auth(tokenB),
    });
    const missingGet = await app.inject({
      method: 'GET',
      url: `/categories/${randomUUID()}`,
      headers: auth(tokenA),
    });
    expect(otherUserGet.statusCode).toBe(404);
    expect(missingGet.statusCode).toBe(404);
    expect(json<ErrorEnvelope>(otherUserGet)).toEqual(
      json<ErrorEnvelope>(missingGet),
    );

    const otherUserPatch = await app.inject({
      method: 'PATCH',
      url: `/categories/${category.id}`,
      headers: auth(tokenB),
      payload: { name: 'Hack' },
    });
    const missingPatch = await app.inject({
      method: 'PATCH',
      url: `/categories/${randomUUID()}`,
      headers: auth(tokenA),
      payload: { name: 'X' },
    });
    expect(otherUserPatch.statusCode).toBe(404);
    expect(missingPatch.statusCode).toBe(404);

    const otherUserDelete = await app.inject({
      method: 'DELETE',
      url: `/categories/${category.id}`,
      headers: auth(tokenB),
    });
    const missingDelete = await app.inject({
      method: 'DELETE',
      url: `/categories/${randomUUID()}`,
      headers: auth(tokenA),
    });
    expect(otherUserDelete.statusCode).toBe(404);
    expect(missingDelete.statusCode).toBe(404);
  });

  it('FR-011: empty PATCH body → 400 with array message', async () => {
    const category = await createCategory(tokenA, { name: 'Patch-me' });

    const res = await app.inject({
      method: 'PATCH',
      url: `/categories/${category.id}`,
      headers: auth(tokenA),
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    const body = json<ErrorEnvelope>(res);
    expect(Array.isArray(body.message)).toBe(true);
  });

  it('FR-012: invalid uuid → 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/categories/not-a-uuid',
      headers: auth(tokenA),
    });

    expect(res.statusCode).toBe(400);
  });

  it('FR-014: empty list → []', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/categories',
      headers: auth(tokenC),
    });

    expect(res.statusCode).toBe(200);
    expect(json<CategoryBody[]>(res)).toEqual([]);
  });

  it('CA-006: no token → 401, garbage token → 401', async () => {
    const noToken = await app.inject({ method: 'GET', url: '/categories' });
    expect(noToken.statusCode).toBe(401);

    const garbage = await app.inject({
      method: 'GET',
      url: '/categories',
      headers: auth('garbage-token'),
    });
    expect(garbage.statusCode).toBe(401);
  });

  it('PATCH updates fields and returns updatedAt changed', async () => {
    const category = await createCategory(tokenA, {
      name: 'Antiga',
      color: '#000000',
      icon: 'a',
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/categories/${category.id}`,
      headers: auth(tokenA),
      payload: { name: 'Nova', color: '#00AA55' },
    });

    expect(res.statusCode).toBe(200);
    const updated = json<CategoryBody>(res);
    expect(updated.name).toBe('Nova');
    expect(updated.color).toBe('#00AA55');
    expect(updated.icon).toBe('a');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(category.updatedAt);
  });

  it('PATCH renaming to an existing name → 409', async () => {
    await createCategory(tokenA, { name: 'Existente' });
    const category = await createCategory(tokenA, { name: 'Renomear' });

    const res = await app.inject({
      method: 'PATCH',
      url: `/categories/${category.id}`,
      headers: auth(tokenA),
      payload: { name: 'existente' },
    });

    expect(res.statusCode).toBe(409);
  });

  it('PATCH renaming to the SAME name (self) is allowed', async () => {
    const category = await createCategory(tokenA, { name: 'MesmoNome' });

    const res = await app.inject({
      method: 'PATCH',
      url: `/categories/${category.id}`,
      headers: auth(tokenA),
      payload: { name: 'mesmonome' },
    });

    expect(res.statusCode).toBe(200);
    expect(json<CategoryBody>(res).name).toBe('mesmonome');
  });

  it('DELETE → 204, then GET → 404', async () => {
    const category = await createCategory(tokenA, { name: 'Deletar' });

    const del = await app.inject({
      method: 'DELETE',
      url: `/categories/${category.id}`,
      headers: auth(tokenA),
    });
    expect(del.statusCode).toBe(204);
    expect(del.body).toBe('');

    const get = await app.inject({
      method: 'GET',
      url: `/categories/${category.id}`,
      headers: auth(tokenA),
    });
    expect(get.statusCode).toBe(404);
  });
});
