import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoriesRepository } from '../repositories/categories.repository';
import { CategoryRow, UpdateCategoryData } from '../types/category.types';

/**
 * Domain logic for categories (ADR-0003). All methods scope by `userId` from
 * the token (SC-001). Repos are async (dual-driver: better-sqlite3 sync /
 * libsql async), so every repository call is awaited.
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  /** FR-001/FR-002/FR-013: pre-check + DB constraint race → 409. */
  async create(userId: string, dto: CreateCategoryDto): Promise<CategoryRow> {
    const existing = await this.categoriesRepository.findByNameForUser(
      userId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException('Category name already exists');
    }

    try {
      return await this.categoriesRepository.create({
        userId,
        name: dto.name,
        color: dto.color,
        icon: dto.icon,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Category name already exists');
      }
      throw error;
    }
  }

  /** FR-003/FR-014: pass-through of the owner-scoped, ordered list. */
  async findAll(userId: string): Promise<CategoryRow[]> {
    return await this.categoriesRepository.findAllByUserId(userId);
  }

  /** FR-004/CA-004: 404 for missing OR other-user rows — no distinction. */
  async findOne(userId: string, id: string): Promise<CategoryRow> {
    const category = await this.categoriesRepository.findByIdAndUserId(
      id,
      userId,
    );
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  /** FR-005/FR-002: ownership first, then case-insensitive duplicate check excluding self. */
  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryRow> {
    const existing = await this.categoriesRepository.findByIdAndUserId(
      id,
      userId,
    );
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    if (
      dto.name !== undefined &&
      dto.name.toLowerCase() !== existing.name.toLowerCase()
    ) {
      const duplicate = await this.categoriesRepository.findByNameForUser(
        userId,
        dto.name,
      );
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('Category name already exists');
      }
    }

    const updateData: UpdateCategoryData = { updatedAt: Date.now() };
    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.color !== undefined) {
      updateData.color = dto.color;
    }
    if (dto.icon !== undefined) {
      updateData.icon = dto.icon;
    }

    try {
      const updated = await this.categoriesRepository.update(
        id,
        userId,
        updateData,
      );
      if (!updated) {
        // Category deleted between the ownership check and the update (race).
        throw new NotFoundException('Category not found');
      }
      return updated;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Category name already exists');
      }
      throw error;
    }
  }

  /** FR-006: ownership first, then delete. SET NULL of transactions is Fase 3. */
  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.categoriesRepository.findByIdAndUserId(
      id,
      userId,
    );
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    await this.categoriesRepository.delete(id, userId);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE'
    );
  }
}
