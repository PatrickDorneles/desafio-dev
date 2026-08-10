import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CategoryRow } from '../entities/category.entity';
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
    it('creates a category and returns the row', () => {
      repository.findByNameForUser.mockReturnValue(undefined);
      repository.create.mockReturnValue(categoryRow);

      const result = service.create('uuid-user-1', {
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

    it('throws ConflictException (409) when the name already exists (pre-check, FR-002)', () => {
      repository.findByNameForUser.mockReturnValue(categoryRow);

      expect(() =>
        service.create('uuid-user-1', { name: 'Alimentação' }),
      ).toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException (409) on SQLITE_CONSTRAINT_UNIQUE (race, FR-013)', () => {
      repository.findByNameForUser.mockReturnValue(undefined);
      const error = new Error(
        'UNIQUE constraint failed: categories.user_id, categories.name',
      );
      (error as { code?: string }).code = 'SQLITE_CONSTRAINT_UNIQUE';
      repository.create.mockImplementation(() => {
        throw error;
      });

      expect(() =>
        service.create('uuid-user-1', { name: 'Alimentação' }),
      ).toThrow(ConflictException);
    });

    it('re-throws non-unique errors', () => {
      repository.findByNameForUser.mockReturnValue(undefined);
      const error = new Error('disk I/O error');
      repository.create.mockImplementation(() => {
        throw error;
      });

      expect(() =>
        service.create('uuid-user-1', { name: 'Alimentação' }),
      ).toThrow(error);
    });
  });

  describe('findAll', () => {
    it('passes through the repository list (FR-003)', () => {
      repository.findAllByUserId.mockReturnValue([categoryRow]);

      const result = service.findAll('uuid-user-1');

      expect(repository.findAllByUserId).toHaveBeenCalledWith('uuid-user-1');
      expect(result).toEqual([categoryRow]);
    });
  });

  describe('findOne', () => {
    it('returns the category when owned', () => {
      repository.findByIdAndUserId.mockReturnValue(categoryRow);

      expect(service.findOne('uuid-user-1', 'uuid-cat-1')).toEqual(categoryRow);
    });

    it('throws NotFoundException (404) when missing or not owned (FR-004)', () => {
      repository.findByIdAndUserId.mockReturnValue(undefined);

      expect(() => service.findOne('uuid-user-1', 'uuid-cat-1')).toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates fields and returns the updated row (FR-005)', () => {
      repository.findByIdAndUserId.mockReturnValue(categoryRow);
      repository.update.mockReturnValue({
        ...categoryRow,
        name: 'Mercado',
        updatedAt: 1780000000100,
      });

      const result = service.update('uuid-user-1', 'uuid-cat-1', {
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

    it('throws NotFoundException (404) when the category is missing', () => {
      repository.findByIdAndUserId.mockReturnValue(undefined);

      expect(() =>
        service.update('uuid-user-1', 'uuid-cat-1', { name: 'Mercado' }),
      ).toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException (409) when renaming to an existing name (excluding self)', () => {
      repository.findByIdAndUserId.mockReturnValue(categoryRow);
      const other = { ...categoryRow, id: 'uuid-cat-2', name: 'Mercado' };
      repository.findByNameForUser.mockReturnValue(other);

      expect(() =>
        service.update('uuid-user-1', 'uuid-cat-1', { name: 'Mercado' }),
      ).toThrow(ConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('allows renaming to the SAME name (case-insensitive, self)', () => {
      repository.findByIdAndUserId.mockReturnValue(categoryRow);
      repository.update.mockReturnValue(categoryRow);

      const result = service.update('uuid-user-1', 'uuid-cat-1', {
        name: 'alimentação',
      });

      expect(repository.findByNameForUser).not.toHaveBeenCalled();
      expect(result).toEqual(categoryRow);
    });

    it('throws ConflictException (409) on SQLITE_CONSTRAINT_UNIQUE (race)', () => {
      repository.findByIdAndUserId.mockReturnValue(categoryRow);
      repository.findByNameForUser.mockReturnValue(undefined);
      const error = new Error('UNIQUE constraint failed');
      (error as { code?: string }).code = 'SQLITE_CONSTRAINT_UNIQUE';
      repository.update.mockImplementation(() => {
        throw error;
      });

      expect(() =>
        service.update('uuid-user-1', 'uuid-cat-1', { name: 'Mercado' }),
      ).toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes the category (FR-006)', () => {
      repository.findByIdAndUserId.mockReturnValue(categoryRow);
      repository.delete.mockReturnValue(true);

      expect(() => service.remove('uuid-user-1', 'uuid-cat-1')).not.toThrow();
      expect(repository.delete).toHaveBeenCalledWith(
        'uuid-cat-1',
        'uuid-user-1',
      );
    });

    it('throws NotFoundException (404) when missing or not owned', () => {
      repository.findByIdAndUserId.mockReturnValue(undefined);

      expect(() => service.remove('uuid-user-1', 'uuid-cat-1')).toThrow(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
