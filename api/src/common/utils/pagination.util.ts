import { PaginationMeta } from '../types/pagination';

/**
 * ADR-0007: computes the pagination meta for a `{ data, meta }` response.
 * `totalPages = ceil(totalItems / pageSize)` (0 when there are no items);
 * `hasNextPage = page < totalPages`; `hasPreviousPage = page > 1`.
 * Pure and reusable by any paginated listing.
 */
export function buildPaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number,
): PaginationMeta {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
