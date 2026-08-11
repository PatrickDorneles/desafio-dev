import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { TransactionRow } from '../types/transaction.types';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionsRepository: jest.Mocked<
    Pick<
      TransactionsRepository,
      | 'findAllByUserId'
      | 'countByUserId'
      | 'findByIdAndUserId'
      | 'create'
      | 'update'
      | 'delete'
      | 'sumByType'
    >
  >;
  let categoriesRepository: jest.Mocked<
    Pick<CategoriesRepository, 'existsByIdAndUserId'>
  >;

  const transactionRow: TransactionRow = {
    id: 'uuid-tx-1',
    userId: 'uuid-user-1',
    categoryId: 'uuid-cat-1',
    type: 'EXPENSE',
    amountCents: 5000,
    description: 'Almoço',
    date: '2026-08-10',
    createdAt: 1780000000000,
    updatedAt: 1780000000000,
  };

  beforeEach(async () => {
    transactionsRepository = {
      findAllByUserId: jest.fn(),
      countByUserId: jest.fn(),
      findByIdAndUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      sumByType: jest.fn(),
    };
    categoriesRepository = {
      existsByIdAndUserId: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: TransactionsRepository, useValue: transactionsRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
      ],
    }).compile();

    service = moduleRef.get(TransactionsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('creates a transaction and returns the row (FR-001)', async () => {
      categoriesRepository.existsByIdAndUserId.mockResolvedValue(true);
      transactionsRepository.create.mockResolvedValue(transactionRow);

      const result = await service.create('uuid-user-1', {
        type: 'EXPENSE',
        amountCents: 5000,
        description: 'Almoço',
        date: '2026-08-10',
        categoryId: 'uuid-cat-1',
      });

      expect(categoriesRepository.existsByIdAndUserId).toHaveBeenCalledWith(
        'uuid-cat-1',
        'uuid-user-1',
      );
      expect(transactionsRepository.create).toHaveBeenCalledWith({
        userId: 'uuid-user-1',
        categoryId: 'uuid-cat-1',
        type: 'EXPENSE',
        amountCents: 5000,
        description: 'Almoço',
        date: '2026-08-10',
      });
      expect(result).toEqual(transactionRow);
    });

    it('creates without a category (absent → null)', async () => {
      transactionsRepository.create.mockResolvedValue({
        ...transactionRow,
        categoryId: null,
      });

      const result = await service.create('uuid-user-1', {
        type: 'INCOME',
        amountCents: 1000,
        description: 'x',
        date: '2026-08-01',
      });

      expect(categoriesRepository.existsByIdAndUserId).not.toHaveBeenCalled();
      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: null }),
      );
      expect(result.categoryId).toBeNull();
    });

    it('throws BadRequestException (400) when the category is unknown or foreign (FR-003)', async () => {
      categoriesRepository.existsByIdAndUserId.mockResolvedValue(false);

      await expect(
        service.create('uuid-user-1', {
          type: 'EXPENSE',
          amountCents: 5000,
          description: 'Almoço',
          date: '2026-08-10',
          categoryId: 'uuid-cat-999',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('defaults to page 1 / pageSize 10 → offset 0, limit 10 (ADR-0007)', async () => {
      transactionsRepository.countByUserId.mockResolvedValue(25);
      transactionsRepository.findAllByUserId.mockResolvedValue([
        transactionRow,
      ]);

      const result = await service.findAll('uuid-user-1', {
        page: 1,
        pageSize: 10,
      });

      expect(transactionsRepository.countByUserId).toHaveBeenCalledWith(
        'uuid-user-1',
      );
      expect(transactionsRepository.findAllByUserId).toHaveBeenCalledWith(
        'uuid-user-1',
        { limit: 10, offset: 0 },
      );
      expect(result.data).toEqual([transactionRow]);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('delegates offset/limit for later pages (page 3 of 25 @ 10)', async () => {
      transactionsRepository.countByUserId.mockResolvedValue(25);
      transactionsRepository.findAllByUserId.mockResolvedValue([]);

      await service.findAll('uuid-user-1', { page: 3, pageSize: 10 });

      expect(transactionsRepository.findAllByUserId).toHaveBeenCalledWith(
        'uuid-user-1',
        { limit: 10, offset: 20 },
      );
    });

    it('last page → hasNextPage false (page 3 of 25 @ 10)', async () => {
      transactionsRepository.countByUserId.mockResolvedValue(25);
      transactionsRepository.findAllByUserId.mockResolvedValue([]);

      const result = await service.findAll('uuid-user-1', {
        page: 3,
        pageSize: 10,
      });

      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(true);
      expect(result.meta.totalPages).toBe(3);
    });

    it('out-of-range page → empty data with correct meta (never 404)', async () => {
      transactionsRepository.countByUserId.mockResolvedValue(25);
      transactionsRepository.findAllByUserId.mockResolvedValue([]);

      const result = await service.findAll('uuid-user-1', {
        page: 99,
        pageSize: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({
        page: 99,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('empty store → totalPages 0, no navigation flags', async () => {
      transactionsRepository.countByUserId.mockResolvedValue(0);
      transactionsRepository.findAllByUserId.mockResolvedValue([]);

      const result = await service.findAll('uuid-user-1', {
        page: 1,
        pageSize: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });
  });

  describe('findOne', () => {
    it('returns the transaction when owned (FR-005)', async () => {
      transactionsRepository.findByIdAndUserId.mockResolvedValue(
        transactionRow,
      );

      await expect(
        service.findOne('uuid-user-1', 'uuid-tx-1'),
      ).resolves.toEqual(transactionRow);
    });

    it('throws NotFoundException (404) when missing or not owned (FR-005)', async () => {
      transactionsRepository.findByIdAndUserId.mockResolvedValue(undefined);

      await expect(
        service.findOne('uuid-user-1', 'uuid-tx-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates fields and returns the updated row (FR-006)', async () => {
      transactionsRepository.findByIdAndUserId.mockResolvedValue(
        transactionRow,
      );
      transactionsRepository.update.mockResolvedValue({
        ...transactionRow,
        amountCents: 5500,
        updatedAt: 1780000000100,
      });

      const result = await service.update('uuid-user-1', 'uuid-tx-1', {
        amountCents: 5500,
      });

      expect(transactionsRepository.update).toHaveBeenCalledTimes(1);
      const [calledId, calledUserId, calledData] =
        transactionsRepository.update.mock.calls[0];
      expect(calledId).toBe('uuid-tx-1');
      expect(calledUserId).toBe('uuid-user-1');
      expect(calledData.amountCents).toBe(5500);
      expect(typeof calledData.updatedAt).toBe('number');
      expect(result.amountCents).toBe(5500);
      expect(result.updatedAt).toBe(1780000000100);
    });

    it('clears the category link when categoryId is null (CA-006)', async () => {
      transactionsRepository.findByIdAndUserId.mockResolvedValue(
        transactionRow,
      );
      transactionsRepository.update.mockResolvedValue({
        ...transactionRow,
        categoryId: null,
      });

      const result = await service.update('uuid-user-1', 'uuid-tx-1', {
        categoryId: null,
      });

      expect(categoriesRepository.existsByIdAndUserId).not.toHaveBeenCalled();
      const calledData = transactionsRepository.update.mock.calls[0][2];
      expect(calledData.categoryId).toBeNull();
      expect(result.categoryId).toBeNull();
    });

    it('revalidates a new categoryId and throws 400 when invalid (FR-003/FR-006)', async () => {
      transactionsRepository.findByIdAndUserId.mockResolvedValue(
        transactionRow,
      );
      categoriesRepository.existsByIdAndUserId.mockResolvedValue(false);

      await expect(
        service.update('uuid-user-1', 'uuid-tx-1', {
          categoryId: 'uuid-cat-999',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transactionsRepository.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException (404) when the transaction is missing', async () => {
      transactionsRepository.findByIdAndUserId.mockResolvedValue(undefined);

      await expect(
        service.update('uuid-user-1', 'uuid-tx-1', { amountCents: 5500 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(transactionsRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the transaction (FR-007)', async () => {
      transactionsRepository.findByIdAndUserId.mockResolvedValue(
        transactionRow,
      );
      transactionsRepository.delete.mockResolvedValue(true);

      await expect(
        service.remove('uuid-user-1', 'uuid-tx-1'),
      ).resolves.toBeUndefined();
      expect(transactionsRepository.delete).toHaveBeenCalledWith(
        'uuid-tx-1',
        'uuid-user-1',
      );
    });

    it('throws NotFoundException (404) when missing or not owned', async () => {
      transactionsRepository.findByIdAndUserId.mockResolvedValue(undefined);

      await expect(
        service.remove('uuid-user-1', 'uuid-tx-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(transactionsRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    it('computes income − expense = balance (FR-008/SC-002)', async () => {
      transactionsRepository.sumByType.mockImplementation((_userId, type) =>
        Promise.resolve(type === 'INCOME' ? 10000 : 3000),
      );

      await expect(service.getSummary('uuid-user-1')).resolves.toEqual({
        totalIncomeCents: 10000,
        totalExpenseCents: 3000,
        balanceCents: 7000,
      });
    });

    it('returns zeros when there are no transactions (CA-008)', async () => {
      transactionsRepository.sumByType.mockResolvedValue(0);

      await expect(service.getSummary('uuid-user-1')).resolves.toEqual({
        totalIncomeCents: 0,
        totalExpenseCents: 0,
        balanceCents: 0,
      });
    });
  });
});
