import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/types/current-user';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { TransactionPageDto } from '../dto/transaction-page.dto';
import { TransactionResponseDto } from '../dto/transaction-response.dto';
import { TransactionSummaryDto } from '../dto/transaction-summary.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { TransactionsService } from '../services/transactions.service';
import {
  TransactionPage,
  TransactionRow,
  TransactionSummary,
} from '../types/transaction.types';

/**
 * Spec 003, §9. All routes protected by the global JwtAuthGuard (no @Public,
 * no per-route guard) — `@CurrentUser()` always resolves `{ id, name, email }`.
 * IMPORTANT: `GET summary` is declared BEFORE `GET :id` so Fastify never
 * captures `summary` as an `:id` segment (spec §3).
 */
@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a transaction' })
  @ApiResponse({
    status: 201,
    description: 'Transaction created',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid category',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: CurrentUserPayload,
  ): TransactionRow {
    return this.transactionsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my transactions (paginated)' })
  @ApiResponse({
    status: 200,
    description:
      'Paginated transactions ordered by date DESC, createdAt DESC, id DESC',
    type: TransactionPageDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: PaginationQueryDto,
  ): TransactionPage {
    return this.transactionsService.findAll(user.id, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get income/expense/balance summary' })
  @ApiResponse({
    status: 200,
    description: 'Summary of my transactions',
    type: TransactionSummaryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSummary(@CurrentUser() user: CurrentUserPayload): TransactionSummary {
    return this.transactionsService.getSummary(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by id' })
  @ApiResponse({
    status: 200,
    description: 'Transaction',
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid uuid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): TransactionRow {
    return this.transactionsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction updated',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid category',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser() user: CurrentUserPayload,
  ): TransactionRow {
    return this.transactionsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiResponse({ status: 204, description: 'Transaction deleted' })
  @ApiResponse({ status: 400, description: 'Invalid uuid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): void {
    this.transactionsService.remove(user.id, id);
  }
}
