import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { TransactionsRepository } from '../repositories/transactions.repository';
import {
  TransactionRow,
  TransactionSummary,
  TransactionType,
  UpdateTransactionData,
} from '../types/transaction.types';

/**
 * Domain logic for transactions (ADR-0003). All methods scope by `userId` from
 * the token (SC-001). better-sqlite3 is synchronous, so these methods are
 * intentionally NOT async.
 */
@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  /** FR-001/FR-003: category (when given) must exist AND belong to the user → else 400. */
  create(userId: string, dto: CreateTransactionDto): TransactionRow {
    this.assertCategoryOwned(userId, dto.categoryId);
    return this.transactionsRepository.create({
      userId,
      categoryId: dto.categoryId ?? null,
      type: dto.type,
      amountCents: dto.amountCents,
      description: dto.description,
      date: dto.date,
    });
  }

  /** FR-004: pass-through of the owner-scoped, ordered list. */
  findAll(userId: string): TransactionRow[] {
    return this.transactionsRepository.findAllByUserId(userId);
  }

  /** FR-005/CA-005: 404 for missing OR other-user rows — no distinction. */
  findOne(userId: string, id: string): TransactionRow {
    const transaction = this.transactionsRepository.findByIdAndUserId(
      id,
      userId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  /** FR-006/CA-006: ownership first; `categoryId: null` clears the link; new uuid revalidated (FR-003). */
  update(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): TransactionRow {
    const existing = this.transactionsRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    // Key presence distinguishes `categoryId: null` (clear link) from absent.
    if ('categoryId' in dto && dto.categoryId !== null) {
      this.assertCategoryOwned(userId, dto.categoryId);
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

    const updated = this.transactionsRepository.update(id, userId, updateData);
    if (!updated) {
      // Transaction deleted between the ownership check and the update (race).
      throw new NotFoundException('Transaction not found');
    }
    return updated;
  }

  /** FR-007: ownership first, then delete. */
  remove(userId: string, id: string): void {
    const existing = this.transactionsRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }
    this.transactionsRepository.delete(id, userId);
  }

  /** FR-008/CA-007/CA-008/SC-002: income − expense = balance; empty → zeros. */
  getSummary(userId: string): TransactionSummary {
    const totalIncomeCents = this.transactionsRepository.sumByType(
      userId,
      TransactionType.INCOME,
    );
    const totalExpenseCents = this.transactionsRepository.sumByType(
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
  private assertCategoryOwned(
    userId: string,
    categoryId: string | null | undefined,
  ): void {
    if (categoryId === null || categoryId === undefined) {
      return;
    }
    if (!this.categoriesRepository.existsByIdAndUserId(categoryId, userId)) {
      throw new BadRequestException(
        'Category does not exist or does not belong to the user',
      );
    }
  }
}
