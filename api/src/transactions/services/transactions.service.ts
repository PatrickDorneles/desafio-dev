import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { buildPaginationMeta } from '../../common/utils/pagination.util';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { TransactionsRepository } from '../repositories/transactions.repository';
import {
  TransactionPage,
  TransactionRow,
  TransactionSummary,
  TransactionType,
  UpdateTransactionData,
} from '../types/transaction.types';

/**
 * Domain logic for transactions (ADR-0003). All methods scope by `userId` from
 * the token (SC-001). Repos are async (dual-driver: better-sqlite3 sync /
 * libsql async), so every repository call is awaited.
 */
@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  /** FR-001/FR-003: category (when given) must exist AND belong to the user → else 400. */
  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionRow> {
    await this.assertCategoryOwned(userId, dto.categoryId);
    return await this.transactionsRepository.create({
      userId,
      categoryId: dto.categoryId ?? null,
      type: dto.type,
      amountCents: dto.amountCents,
      description: dto.description,
      date: dto.date,
    });
  }

  /** FR-004/ADR-0007: owner-scoped, paginated list with meta. */
  async findAll(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<TransactionPage> {
    const { page, pageSize } = query;
    const totalItems = await this.transactionsRepository.countByUserId(userId);
    const data = await this.transactionsRepository.findAllByUserId(userId, {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) };
  }

  /** FR-005/CA-005: 404 for missing OR other-user rows — no distinction. */
  async findOne(userId: string, id: string): Promise<TransactionRow> {
    const transaction = await this.transactionsRepository.findByIdAndUserId(
      id,
      userId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  /** FR-006/CA-006: ownership first; `categoryId: null` clears the link; new uuid revalidated (FR-003). */
  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionRow> {
    const existing = await this.transactionsRepository.findByIdAndUserId(
      id,
      userId,
    );
    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    // Key presence distinguishes `categoryId: null` (clear link) from absent.
    if ('categoryId' in dto && dto.categoryId !== null) {
      await this.assertCategoryOwned(userId, dto.categoryId);
    }

    const updateData: UpdateTransactionData = { updatedAt: Date.now() };
    if (dto.type !== undefined) {
      updateData.type = dto.type;
    }
    if (dto.amountCents !== undefined) {
      updateData.amountCents = dto.amountCents;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }
    if (dto.date !== undefined) {
      updateData.date = dto.date;
    }
    if ('categoryId' in dto) {
      updateData.categoryId = dto.categoryId;
    }

    const updated = await this.transactionsRepository.update(
      id,
      userId,
      updateData,
    );
    if (!updated) {
      // Transaction deleted between the ownership check and the update (race).
      throw new NotFoundException('Transaction not found');
    }
    return updated;
  }

  /** FR-007: ownership first, then delete. */
  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.transactionsRepository.findByIdAndUserId(
      id,
      userId,
    );
    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }
    await this.transactionsRepository.delete(id, userId);
  }

  /** FR-008/CA-007/CA-008/SC-002: income − expense = balance; empty → zeros. */
  async getSummary(userId: string): Promise<TransactionSummary> {
    const totalIncomeCents = await this.transactionsRepository.sumByType(
      userId,
      TransactionType.INCOME,
    );
    const totalExpenseCents = await this.transactionsRepository.sumByType(
      userId,
      TransactionType.EXPENSE,
    );
    return {
      totalIncomeCents,
      totalExpenseCents,
      balanceCents: totalIncomeCents - totalExpenseCents,
    };
  }

  /** FR-003/CA-003: non-null categoryId must exist AND belong to the user → 400 (NOT 404). */
  private async assertCategoryOwned(
    userId: string,
    categoryId: string | null | undefined,
  ): Promise<void> {
    if (categoryId === null || categoryId === undefined) {
      return;
    }
    if (
      !(await this.categoriesRepository.existsByIdAndUserId(categoryId, userId))
    ) {
      throw new BadRequestException(
        'Category does not exist or does not belong to the user',
      );
    }
  }
}
