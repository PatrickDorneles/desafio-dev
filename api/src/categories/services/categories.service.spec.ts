import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CategoryRow } from '../types/category.types';
import { CategoriesRepository } from '../repositories/categories.repository';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: jest.Mocked<
    Pick<
      CategoriesRepository,
      | 'findAllByUserId'
      | 'findByIdAndUserId'
      | 'findByNameForUser'
      | 'create'
      | 'update'
      | 'delete'
    >
  >;

  const categoryRow: CategoryRow = {
    id: 'uuid-cat-1',
    userId: 'uuid-user-1',
    name: 'Alimentação',
    color: '#FF5733',
    icon: 'utensils',
    createdAt: 1780000000000,
    updatedAt: 1780000000000,
  };

  beforeEach(async () => {
    repository = {
      findAllByUserId: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByNameForUser: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CategoriesRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('creates a category and returns the row', async () => {
      repository.findByNameForUser.mockResolvedValue(undefined);
      repository.create.mockResolvedValue(categoryRow);

      const result = await service.create('uuid-user-1', {
        name: 'Alimentação',
        color: '#FF5733',
        icon: 'utensils',
      });

      expect(repository.findByNameForUser).toHaveBeenCalledWith(
        'uuid-user-1',
        'Alimentação',
      );
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'uuid-user-1',
        name: 'Alimentação',
        color: '#FF5733',
        icon: 'utensils',
      });
      expect(result).toEqual(categoryRow);
    });

    it('throws ConflictException (409) when the name already exists (pre-check, FR-002)', async () => {
      repository.findByNameForUser.mockResolvedValue(categoryRow);

      await expect(
        service.create('uuid-user-1', { name: 'Alimentação' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException (409) on SQLITE_CONSTRAINT_UNIQUE (race, FR-013)', async () => {
      repository.findByNameForUser.mockResolvedValue(undefined);
      const error = new Error(
        'UNIQUE constraint failed: categories.user_id, categories.name',
      );
      (error as { code?: string }).code = 'SQLITE_CONSTRAINT_UNIQUE';
      repository.create.mockRejectedValue(error);

      await expect(
        service.create('uuid-user-1', { name: 'Alimentação' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('re-throws non-unique errors', async () => {
      repository.findByNameForUser.mockResolvedValue(undefined);
      const error = new Error('disk I/O error');
      repository.create.mockRejectedValue(error);

      await expect(
        service.create('uuid-user-1', { name: 'Alimentação' }),
      ).rejects.toBe(error);
    });
  });

  describe('findAll', () => {
    it('passes through the repository list (FR-003)', async () => {
      repository.findAllByUserId.mockResolvedValue([categoryRow]);

      const result = await service.findAll('uuid-user-1');

      expect(repository.findAllByUserId).toHaveBeenCalledWith('uuid-user-1');
      expect(result).toEqual([categoryRow]);
    });
  });

  describe('findOne', () => {
    it('returns the category when owned', async () => {
      repository.findByIdAndUserId.mockResolvedValue(categoryRow);

      await expect(
        service.findOne('uuid-user-1', 'uuid-cat-1'),
      ).resolves.toEqual(categoryRow);
    });

    it('throws NotFoundException (404) when missing or not owned (FR-004)', async () => {
      repository.findByIdAndUserId.mockResolvedValue(undefined);

      await expect(
        service.findOne('uuid-user-1', 'uuid-cat-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates fields and returns the updated row (FR-005)', async () => {
      repository.findByIdAndUserId.mockResolvedValue(categoryRow);
      repository.update.mockResolvedValue({
        ...categoryRow,
        name: 'Mercado',
        updatedAt: 1780000000100,
      });

      const result = await service.update('uuid-user-1', 'uuid-cat-1', {
        name: 'Mercado',
      });

      expect(repository.update).toHaveBeenCalledTimes(1);
      const [calledId, calledUserId, calledData] =
        repository.update.mock.calls[0];
      expect(calledId).toBe('uuid-cat-1');
      expect(calledUserId).toBe('uuid-user-1');
      expect(calledData.name).toBe('Mercado');
      expect(typeof calledData.updatedAt).toBe('number');
      expect(result.name).toBe('Mercado');
      expect(result.updatedAt).toBe(1780000000100);
    });

    it('throws NotFoundException (404) when the category is missing', async () => {
      repository.findByIdAndUserId.mockResolvedValue(undefined);

      await expect(
        service.update('uuid-user-1', 'uuid-cat-1', { name: 'Mercado' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException (409) when renaming to an existing name (excluding self)', async () => {
      repository.findByIdAndUserId.mockResolvedValue(categoryRow);
      const other = { ...categoryRow, id: 'uuid-cat-2', name: 'Mercado' };
      repository.findByNameForUser.mockResolvedValue(other);

      await expect(
        service.update('uuid-user-1', 'uuid-cat-1', { name: 'Mercado' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('allows renaming to the SAME name (case-insensitive, self)', async () => {
      repository.findByIdAndUserId.mockResolvedValue(categoryRow);
      repository.update.mockResolvedValue(categoryRow);

      const result = await service.update('uuid-user-1', 'uuid-cat-1', {
        name: 'alimentação',
      });

      expect(repository.findByNameForUser).not.toHaveBeenCalled();
      expect(result).toEqual(categoryRow);
    });

    it('throws ConflictException (409) on SQLITE_CONSTRAINT_UNIQUE (race)', async () => {
      repository.findByIdAndUserId.mockResolvedValue(categoryRow);
      repository.findByNameForUser.mockResolvedValue(undefined);
      const error = new Error('UNIQUE constraint failed');
      (error as { code?: string }).code = 'SQLITE_CONSTRAINT_UNIQUE';
      repository.update.mockRejectedValue(error);

      await expect(
        service.update('uuid-user-1', 'uuid-cat-1', { name: 'Mercado' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes the category (FR-006)', async () => {
      repository.findByIdAndUserId.mockResolvedValue(categoryRow);
      repository.delete.mockResolvedValue(true);

      await expect(
        service.remove('uuid-user-1', 'uuid-cat-1'),
      ).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith(
        'uuid-cat-1',
        'uuid-user-1',
      );
    });

    it('throws NotFoundException (404) when missing or not owned', async () => {
      repository.findByIdAndUserId.mockResolvedValue(undefined);

      await expect(
        service.remove('uuid-user-1', 'uuid-cat-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
