/**
 * Global pagination meta shape (ADR-0007) — returned alongside `data` by every
 * paginated GET. Computed by `buildPaginationMeta` in `src/common/utils/`.
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
