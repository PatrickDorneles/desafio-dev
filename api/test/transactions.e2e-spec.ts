import { randomUUID } from 'node:crypto';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { todayIso } from '../src/common/utils/date.util';
import { createTestApp } from './utils/test-app';
import { registerAndLogin } from './utils/auth.helpers';

interface TransactionBody {
  id: string;
  userId: string;
  categoryId: string | null;
  type: 'INCOME' | 'EXPENSE';
  amountCents: number;
  description: string;
  date: string;
  createdAt: number;
  updatedAt: number;
}

interface SummaryBody {
  totalIncomeCents: number;
  totalExpenseCents: number;
  balanceCents: number;
}

interface ErrorEnvelope {
  statusCode: number;
  message: string | string[];
  error: string;
}

function json<T>(res: { json: () => unknown }): T {
  return res.json() as T;
}

describe('Transactions (e2e)', () => {
  let app: NestFastifyApplication;
  let tokenA: string;
  let userIdA: string;
  let tokenB: string;
  let tokenC: string;
  let tokenD: string;
  let tokenE: string;

  beforeAll(async () => {
    app = await createTestApp();
    const a = await registerAndLogin(app, 'Alice Mov', 'alice.mov@example.com');
    tokenA = a.token;
    userIdA = a.user.id;
    const b = await registerAndLogin(app, 'Bob Mov', 'bob.mov@example.com');
    tokenB = b.token;
    const c = await registerAndLogin(app, 'Carol Mov', 'carol.mov@example.com');
    tokenC = c.token;
    const d = await registerAndLogin(app, 'Dave Mov', 'dave.mov@example.com');
    tokenD = d.token;
    const e = await registerAndLogin(app, 'Eve Mov', 'eve.mov@example.com');
    tokenE = e.token;
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
  ): Promise<{ id: string }> {
    const res = await app.inject({
      method: 'POST',
      url: '/categories',
      headers: auth(token),
      payload,
    });
    expect(res.statusCode).toBe(201);
    return json<{ id: string }>(res);
  }

  async function createTransaction(
    token: string,
    payload: Record<string, unknown>,
  ): Promise<TransactionBody> {
    const res = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: auth(token),
      payload,
    });
    expect(res.statusCode).toBe(201);
    return json<TransactionBody>(res);
  }

  async function listTransactions(token: string): Promise<TransactionBody[]> {
    const res = await app.inject({
      method: 'GET',
      url: '/transactions',
      headers: auth(token),
    });
    expect(res.statusCode).toBe(200);
    return json<TransactionBody[]>(res);
  }

  it('CA-001: POST /transactions with own category → 201 full body, appears in list', async () => {
    const category = await createCategory(tokenA, { name: 'Alimentação' });

    const res = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: auth(tokenA),
      payload: {
        type: 'EXPENSE',
        amountCents: 5000,
        description: 'Almoço',
        date: '2026-08-10',
        categoryId: category.id,
      },
    });

    expect(res.statusCode).toBe(201);
    const tx = json<TransactionBody>(res);
    expect(tx).toMatchObject({
      userId: userIdA,
      categoryId: category.id,
      type: 'EXPENSE',
      amountCents: 5000,
      description: 'Almoço',
      date: '2026-08-10',
    });
    expect(typeof tx.id).toBe('string');
    expect(typeof tx.createdAt).toBe('number');
    expect(typeof tx.updatedAt).toBe('number');

    const list = await listTransactions(tokenA);
    expect(list.some((t) => t.id === tx.id)).toBe(true);
  });

  it('CA-002: amountCents 0 / negative / decimal → 400, nothing created', async () => {
    const before = (await listTransactions(tokenC)).length;

    for (const amountCents of [0, -100, 10.5]) {
      const res = await app.inject({
        method: 'POST',
        url: '/transactions',
        headers: auth(tokenC),
        payload: { type: 'EXPENSE', amountCents, description: 'x' },
      });
      expect(res.statusCode).toBe(400);
    }

    const after = await listTransactions(tokenC);
    expect(after.length).toBe(before);
  });

  it('CA-003: foreign categoryId and unknown uuid → 400, nothing created', async () => {
    const bobCategory = await createCategory(tokenB, { name: 'Bob-cat' });
    const before = (await listTransactions(tokenA)).length;

    const foreign = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: auth(tokenA),
      payload: {
        type: 'EXPENSE',
        amountCents: 1000,
        description: 'x',
        categoryId: bobCategory.id,
      },
    });
    expect(foreign.statusCode).toBe(400);

    const unknown = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: auth(tokenA),
      payload: {
        type: 'EXPENSE',
        amountCents: 1000,
        description: 'x',
        categoryId: randomUUID(),
      },
    });
    expect(unknown.statusCode).toBe(400);

    const after = await listTransactions(tokenA);
    expect(after.length).toBe(before);
  });

  it('CA-004: list ordered by date DESC, same-date tie-break createdAt DESC (FR-018)', async () => {
    await createTransaction(tokenD, {
      type: 'INCOME',
      amountCents: 1000,
      description: 'old',
      date: '2026-08-01',
    });
    await createTransaction(tokenD, {
      type: 'INCOME',
      amountCents: 2000,
      description: 'new',
      date: '2026-08-10',
    });
    await createTransaction(tokenD, {
      type: 'INCOME',
      amountCents: 3000,
      description: 'mid-a',
      date: '2026-08-05',
    });
    // Ensure a distinct createdAt for the same-date tie-break.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await createTransaction(tokenD, {
      type: 'INCOME',
      amountCents: 4000,
      description: 'mid-b',
      date: '2026-08-05',
    });

    const list = await listTransactions(tokenD);

    expect(list.map((t) => t.date)).toEqual([
      '2026-08-10',
      '2026-08-05',
      '2026-08-05',
      '2026-08-01',
    ]);
    expect(list[1].description).toBe('mid-b');
    expect(list[2].description).toBe('mid-a');
    expect(list[1].createdAt).toBeGreaterThan(list[2].createdAt);
  });

  it('CA-005: other user / nonexistent id → identical 404 (GET/PATCH/DELETE)', async () => {
    const tx = await createTransaction(tokenA, {
      type: 'INCOME',
      amountCents: 1000,
      description: 'Privada',
    });

    const otherUserGet = await app.inject({
      method: 'GET',
      url: `/transactions/${tx.id}`,
      headers: auth(tokenB),
    });
    const missingGet = await app.inject({
      method: 'GET',
      url: `/transactions/${randomUUID()}`,
      headers: auth(tokenA),
    });
    expect(otherUserGet.statusCode).toBe(404);
    expect(missingGet.statusCode).toBe(404);
    expect(json<ErrorEnvelope>(otherUserGet)).toEqual(
      json<ErrorEnvelope>(missingGet),
    );

    const otherUserPatch = await app.inject({
      method: 'PATCH',
      url: `/transactions/${tx.id}`,
      headers: auth(tokenB),
      payload: { amountCents: 9999 },
    });
    const missingPatch = await app.inject({
      method: 'PATCH',
      url: `/transactions/${randomUUID()}`,
      headers: auth(tokenA),
      payload: { amountCents: 9999 },
    });
    expect(otherUserPatch.statusCode).toBe(404);
    expect(missingPatch.statusCode).toBe(404);

    const otherUserDelete = await app.inject({
      method: 'DELETE',
      url: `/transactions/${tx.id}`,
      headers: auth(tokenB),
    });
    const missingDelete = await app.inject({
      method: 'DELETE',
      url: `/transactions/${randomUUID()}`,
      headers: auth(tokenA),
    });
    expect(otherUserDelete.statusCode).toBe(404);
    expect(missingDelete.statusCode).toBe(404);
  });

  it('CA-006: PATCH { categoryId: null } → 200 cleared', async () => {
    const category = await createCategory(tokenA, { name: 'Link-me' });
    const tx = await createTransaction(tokenA, {
      type: 'EXPENSE',
      amountCents: 1000,
      description: 'linked',
      categoryId: category.id,
    });
    expect(tx.categoryId).toBe(category.id);

    const res = await app.inject({
      method: 'PATCH',
      url: `/transactions/${tx.id}`,
      headers: auth(tokenA),
      payload: { categoryId: null },
    });

    expect(res.statusCode).toBe(200);
    expect(json<TransactionBody>(res).categoryId).toBeNull();
  });

  it('CA-007: summary math (income − expense = balance)', async () => {
    await createTransaction(tokenE, {
      type: 'INCOME',
      amountCents: 10000,
      description: 'Salário',
      date: '2026-08-01',
    });
    await createTransaction(tokenE, {
      type: 'EXPENSE',
      amountCents: 3000,
      description: 'Aluguel',
      date: '2026-08-02',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/transactions/summary',
      headers: auth(tokenE),
    });

    expect(res.statusCode).toBe(200);
    expect(json<SummaryBody>(res)).toEqual({
      totalIncomeCents: 10000,
      totalExpenseCents: 3000,
      balanceCents: 7000,
    });
  });

  it('CA-008: empty summary → zeros', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/transactions/summary',
      headers: auth(tokenC),
    });

    expect(res.statusCode).toBe(200);
    expect(json<SummaryBody>(res)).toEqual({
      totalIncomeCents: 0,
      totalExpenseCents: 0,
      balanceCents: 0,
    });
  });

  it('FR-009: omitted date → server today', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: auth(tokenA),
      payload: { type: 'INCOME', amountCents: 1000, description: 'sem data' },
    });

    expect(res.statusCode).toBe(201);
    expect(json<TransactionBody>(res).date).toBe(todayIso());
  });

  it('FR-013: invalid date (2026-02-31, wrong format) → 400', async () => {
    for (const date of ['2026-02-31', '10/08/2026', '2026-8-10']) {
      const res = await app.inject({
        method: 'POST',
        url: '/transactions',
        headers: auth(tokenA),
        payload: { type: 'INCOME', amountCents: 1000, description: 'x', date },
      });
      expect(res.statusCode).toBe(400);
    }
  });

  it('FR-014: whitespace-only description → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: auth(tokenA),
      payload: { type: 'INCOME', amountCents: 1000, description: '   ' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('FR-015: empty PATCH body → 400 with array message', async () => {
    const tx = await createTransaction(tokenA, {
      type: 'INCOME',
      amountCents: 1000,
      description: 'patch-me',
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/transactions/${tx.id}`,
      headers: auth(tokenA),
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(Array.isArray(json<ErrorEnvelope>(res).message)).toBe(true);
  });

  it('FR-016: invalid uuid in URL → 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/transactions/not-a-uuid',
      headers: auth(tokenA),
    });

    expect(res.statusCode).toBe(400);
  });

  it('FR-017: invalid type → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: auth(tokenA),
      payload: { type: 'TRANSFER', amountCents: 1000, description: 'x' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('FR-010/SC-003: deleting a category SET NULLs linked transactions', async () => {
    const category = await createCategory(tokenA, { name: 'Set-null' });
    const tx = await createTransaction(tokenA, {
      type: 'EXPENSE',
      amountCents: 1000,
      description: 'linked',
      categoryId: category.id,
    });
    expect(tx.categoryId).toBe(category.id);

    const del = await app.inject({
      method: 'DELETE',
      url: `/categories/${category.id}`,
      headers: auth(tokenA),
    });
    expect(del.statusCode).toBe(204);

    const get = await app.inject({
      method: 'GET',
      url: `/transactions/${tx.id}`,
      headers: auth(tokenA),
    });
    expect(get.statusCode).toBe(200);
    expect(json<TransactionBody>(get).categoryId).toBeNull();
  });

  it('CA-009: no token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/transactions' });
    expect(res.statusCode).toBe(401);
  });

  it('PATCH updates fields and returns updatedAt changed', async () => {
    const tx = await createTransaction(tokenA, {
      type: 'EXPENSE',
      amountCents: 5000,
      description: 'Antiga',
      date: '2026-08-01',
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/transactions/${tx.id}`,
      headers: auth(tokenA),
      payload: { amountCents: 5500, description: 'Nova', type: 'INCOME' },
    });

    expect(res.statusCode).toBe(200);
    const updated = json<TransactionBody>(res);
    expect(updated.amountCents).toBe(5500);
    expect(updated.description).toBe('Nova');
    expect(updated.type).toBe('INCOME');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(tx.updatedAt);
  });

  it('DELETE → 204, then GET → 404', async () => {
    const tx = await createTransaction(tokenA, {
      type: 'INCOME',
      amountCents: 1000,
      description: 'deletar',
    });

    const del = await app.inject({
      method: 'DELETE',
      url: `/transactions/${tx.id}`,
      headers: auth(tokenA),
    });
    expect(del.statusCode).toBe(204);
    expect(del.body).toBe('');

    const get = await app.inject({
      method: 'GET',
      url: `/transactions/${tx.id}`,
      headers: auth(tokenA),
    });
    expect(get.statusCode).toBe(404);
  });
});
