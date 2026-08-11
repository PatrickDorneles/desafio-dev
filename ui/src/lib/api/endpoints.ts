import { z } from 'zod';
import { apiFetch } from './client';
import {
  authResponseSchema,
  categorySchema,
  transactionPageSchema,
  transactionSchema,
  transactionSummarySchema,
  userProfileSchema,
} from '@/lib/schemas';
import type {
  AuthResponse,
  Category,
  CreateCategoryInput,
  CreateTransactionInput,
  LoginInput,
  RegisterInput,
  Transaction,
  TransactionPage,
  TransactionSummary,
  UpdateCategoryInput,
  UpdateTransactionInput,
  UserProfile,
} from '@/lib/schemas';

// --- Auth ---

export function register(payload: RegisterInput): Promise<AuthResponse> {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: payload,
    schema: authResponseSchema,
  });
}

export function login(payload: LoginInput): Promise<AuthResponse> {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: payload,
    schema: authResponseSchema,
  });
}

export function me(): Promise<UserProfile> {
  return apiFetch('/auth/me', { schema: userProfileSchema });
}

// --- Categories ---

export function listCategories(): Promise<Category[]> {
  return apiFetch('/categories', { schema: z.array(categorySchema) });
}

export function createCategory(payload: CreateCategoryInput): Promise<Category> {
  return apiFetch('/categories', {
    method: 'POST',
    body: payload,
    schema: categorySchema,
  });
}

export function updateCategory(
  id: string,
  payload: UpdateCategoryInput,
): Promise<Category> {
  return apiFetch(`/categories/${id}`, {
    method: 'PATCH',
    body: payload,
    schema: categorySchema,
  });
}

export function deleteCategory(id: string): Promise<void> {
  return apiFetch(`/categories/${id}`, { method: 'DELETE' });
}

// --- Transactions ---

export interface ListTransactionsParams {
  page: number;
  pageSize: number;
}

export function listTransactions({
  page,
  pageSize,
}: ListTransactionsParams): Promise<TransactionPage> {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return apiFetch(`/transactions?${query.toString()}`, {
    schema: transactionPageSchema,
  });
}

export function createTransaction(
  payload: CreateTransactionInput,
): Promise<Transaction> {
  return apiFetch('/transactions', {
    method: 'POST',
    body: payload,
    schema: transactionSchema,
  });
}

export function updateTransaction(
  id: string,
  payload: UpdateTransactionInput,
): Promise<Transaction> {
  return apiFetch(`/transactions/${id}`, {
    method: 'PATCH',
    body: payload,
    schema: transactionSchema,
  });
}

export function deleteTransaction(id: string): Promise<void> {
  return apiFetch(`/transactions/${id}`, { method: 'DELETE' });
}

export function getSummary(): Promise<TransactionSummary> {
  return apiFetch('/transactions/summary', { schema: transactionSummarySchema });
}