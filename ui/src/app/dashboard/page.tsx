"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useSessionStore } from "@/store/session";
import { CategoriesDialog } from "@/components/categories/categories-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TransactionsTable } from "@/components/dashboard/transactions-table";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Transaction } from "@/lib/schemas";
import { RotateCw, TriangleAlert } from "lucide-react";

export default function DashboardPage() {
  const { user, isReady } = useRequireAuth();
  const restore = useSessionStore((state) => state.restore);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [sessionStalled, setSessionStalled] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  // `restore()` swallows network failures, so `user` can stay null forever.
  // After a grace period, surface a connection error with retry (FR-027)
  // instead of a perpetual skeleton.
  useEffect(() => {
    if (!isReady || user) {
      setSessionStalled(false);
      return;
    }
    const timer = window.setTimeout(() => setSessionStalled(true), 6_000);
    return () => window.clearTimeout(timer);
  }, [isReady, user, retryNonce]);

  // While the token is validated via GET /auth/me, keep a clean shell —
  // no partial content flash (FR-010, FR-026).
  if (!isReady || !user) {
    if (sessionStalled) {
      return (
        <SessionError
          onRetry={() => {
            setSessionStalled(false);
            setRetryNonce((nonce) => nonce + 1);
            void restore();
          }}
        />
      );
    }
    return <DashboardSkeleton />;
  }

  function openNewTransaction() {
    setEditingTransaction(null);
    setTransactionOpen(true);
  }

  function openEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction);
    setTransactionOpen(true);
  }

  function handleTransactionOpenChange(open: boolean) {
    setTransactionOpen(open);
    if (!open) setEditingTransaction(null);
  }

  return (
    <div className="relative min-h-dvh">
      {/* Subtle top wash, calmer than the landing — flat navy, no glow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(45%_100%_at_50%_0%,oklch(0.42_0.12_262/0.16),transparent_75%)]"
      />

      <DashboardHeader
        user={user}
        onNewTransaction={openNewTransaction}
        onManageCategories={() => setCategoriesOpen(true)}
      />

      <main className="mx-auto w-full max-w-6xl space-y-6 px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <SummaryCards />
        <TransactionsTable
          onNewTransaction={openNewTransaction}
          onEditTransaction={openEditTransaction}
        />
      </main>

      <TransactionDialog
        open={transactionOpen}
        onOpenChange={handleTransactionOpenChange}
        transaction={editingTransaction}
      />
      <CategoriesDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />
    </div>
  );
}

function SessionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <Card className="flex w-full max-w-md flex-col items-center gap-3 p-8 text-center">
        <span className="grid size-11 place-items-center rounded-xl bg-expense/10 text-expense ring-1 ring-expense/20">
          <TriangleAlert className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-medium">Não foi possível validar sua sessão</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
        </div>
        <Button onClick={onRetry} className="mt-2">
          <RotateCw className="size-3.5" aria-hidden />
          Tentar novamente
        </Button>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="hidden h-8 w-36 sm:block" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-3 h-7 w-32" />
            </Card>
          ))}
        </div>

        <Card>
          <div className="px-5 pt-5 sm:px-8">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <div className="space-y-2.5 px-5 py-4 sm:px-8">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
