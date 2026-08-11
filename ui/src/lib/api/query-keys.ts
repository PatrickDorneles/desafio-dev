export const queryKeys = {
  me: ['me'] as const,
  categories: ['categories'] as const,
  transactions: (page: number, pageSize: number) =>
    ['transactions', { page, pageSize }] as const,
  summary: ['summary'] as const,
};