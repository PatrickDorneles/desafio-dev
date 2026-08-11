import { buildPaginationMeta } from './pagination.util';

describe('buildPaginationMeta', () => {
  it('empty result → totalPages 0, no next/previous (ADR-0007)', () => {
    expect(buildPaginationMeta(1, 10, 0)).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('exact multiple → totalPages is the exact quotient (12 items, pageSize 3)', () => {
    expect(buildPaginationMeta(1, 3, 12)).toMatchObject({
      totalPages: 4,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it('partial last page → totalPages rounds up (13 items, pageSize 3)', () => {
    expect(buildPaginationMeta(1, 3, 13)).toMatchObject({
      totalPages: 5,
      hasNextPage: true,
    });
  });

  it('middle page → both navigation flags true (page 2 of 4)', () => {
    expect(buildPaginationMeta(2, 10, 34)).toMatchObject({
      page: 2,
      totalPages: 4,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('first page → hasPreviousPage false', () => {
    expect(buildPaginationMeta(1, 10, 34).hasPreviousPage).toBe(false);
  });

  it('last page → hasNextPage false', () => {
    expect(buildPaginationMeta(4, 10, 34)).toMatchObject({
      totalPages: 4,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });
});
