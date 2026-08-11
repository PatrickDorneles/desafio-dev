"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listCategories, listTransactions } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/query-keys";
import { errorMessage } from "@/lib/errors";
import { formatBRL, formatDate } from "@/lib/format";
import { TransactionType } from "@/lib/schemas";
import type { Category, Transaction } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  RotateCw,
  SearchX,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

interface TransactionsTableProps {
  onNewTransaction: () => void;
}

export function TransactionsTable({
  onNewTransaction,
}: TransactionsTableProps) {
  const [page, setPage] = useState(1);

  const transactions = useQuery({
    queryKey: queryKeys.transactions(page, PAGE_SIZE),
    queryFn: () => listTransactions({ page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const categories = useQuery({
    queryKey: queryKeys.categories,
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const category of categories.data ?? []) {
      map.set(category.id, category);
    }
    return map;
  }, [categories.data]);

  const rows = transactions.data?.data ?? [];
  const meta = transactions.data?.meta;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-end justify-between gap-3">
        <div>
          <CardTitle>Movimentações</CardTitle>
          <CardDescription>
            Histórico das suas entradas e saídas
          </CardDescription>
        </div>
        {transactions.isPlaceholderData && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </CardHeader>

      {transactions.isPending ? (
        <TableSkeleton />
      ) : transactions.isError ? (
        <TableError
          message={errorMessage(
            transactions.error,
            "Não foi possível carregar as movimentações.",
          )}
          onRetry={() => void transactions.refetch()}
        />
      ) : rows.length === 0 && meta && meta.totalItems > 0 ? (
        <PageBeyondEnd onBack={() => setPage(1)} />
      ) : rows.length === 0 ? (
        <EmptyState onNewTransaction={onNewTransaction} />
      ) : (
        <>
          <div
            className={cn(
              "overflow-x-auto px-5 transition-opacity sm:px-8",
              transactions.isPlaceholderData && "opacity-60",
            )}
          >
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-0 text-muted-foreground">
                    Data
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Descrição
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Categoria
                  </TableHead>
                  <TableHead className="text-muted-foreground">Tipo</TableHead>
                  <TableHead className="pr-0 text-right text-muted-foreground">
                    Valor
                  </TableHead>
                  <TableHead className="pr-0">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    category={transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          {meta && (
            <PaginationFooter
              page={page}
              pageSize={PAGE_SIZE}
              totalItems={meta.totalItems}
              totalPages={meta.totalPages}
              hasPreviousPage={meta.hasPreviousPage}
              hasNextPage={meta.hasNextPage}
              isLoading={transactions.isPlaceholderData}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </Card>
  );
}

function TransactionRow({
  transaction,
  category,
}: {
  transaction: Transaction;
  category: Category | undefined;
}) {
  const isIncome = transaction.type === TransactionType.INCOME;

  return (
    <TableRow className="group/row">
      <TableCell className="pl-0 text-muted-foreground tabular-nums">
        {formatDate(transaction.date)}
      </TableCell>
      <TableCell className="max-w-56 truncate font-medium">
        {transaction.description}
      </TableCell>
      <TableCell>
        {category ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            {category.color && (
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
            )}
            <span className="max-w-32 truncate">{category.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            isIncome
              ? "bg-income/10 text-income"
              : "bg-expense/10 text-expense",
          )}
        >
          {isIncome ? (
            <ArrowUpRight className="size-3" aria-hidden />
          ) : (
            <ArrowDownRight className="size-3" aria-hidden />
          )}
          {isIncome ? "Receita" : "Despesa"}
        </span>
      </TableCell>
      <TableCell
        className={cn(
          "pr-0 text-right font-medium tabular-nums",
          isIncome ? "text-income" : "text-expense",
        )}
      >
        {formatBRL(transaction.amountCents)}
      </TableCell>
      <TableCell className="pr-0">
        <div className="flex justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/row:opacity-100 sm:focus-within:opacity-100">
          {/* Edit/delete are wired by the next lane — visible now for affordance. */}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Editar ${transaction.description}`}
            onClick={() => {
              /* no-op (próxima etapa) */
            }}
          >
            <Pencil className="size-3.5" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Excluir ${transaction.description}`}
            className="hover:text-destructive"
            onClick={() => {
              /* no-op (próxima etapa) */
            }}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function PaginationFooter({
  page,
  pageSize,
  totalItems,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  isLoading,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <p className="text-sm text-muted-foreground tabular-nums">
        {from}–{to} de {totalItems}
      </p>
      <div className="flex items-center gap-2">
        {isLoading && (
          <Loader2 className="mr-1 size-3.5 animate-spin text-muted-foreground" />
        )}
        <span className="mr-1 text-sm text-muted-foreground tabular-nums">
          Página {page} de {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
          <ChevronRight className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ onNewTransaction }: { onNewTransaction: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-foreground/5">
        <Receipt className="size-5" aria-hidden />
      </span>
      <div>
        <p className="font-medium">Nenhuma movimentação ainda</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre sua primeira receita ou despesa para começar.
        </p>
      </div>
      <Button onClick={onNewTransaction} className="mt-2">
        <Plus className="size-3.5" aria-hidden />
        Nova movimentação
      </Button>
    </div>
  );
}

/** CA-011: requested a page beyond the last one — not "no data at all". */
function PageBeyondEnd({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-foreground/5">
        <SearchX className="size-5" aria-hidden />
      </span>
      <div>
        <p className="font-medium">Nada por aqui nesta página</p>
        <p className="mt-1 text-sm text-muted-foreground">
          As movimentações começam na primeira página.
        </p>
      </div>
      <Button variant="outline" onClick={onBack} className="mt-2">
        Voltar para a primeira página
      </Button>
    </div>
  );
}

function TableError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-12 sm:px-8">
      <TriangleAlert className="size-4 shrink-0 text-expense" aria-hidden />
      <p className="flex-1 text-sm">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCw className="size-3.5" aria-hidden />
        Tentar novamente
      </Button>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2.5 px-5 py-4 sm:px-8" aria-busy>
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
