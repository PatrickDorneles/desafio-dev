"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Transaction } from "@/lib/schemas";
import { TransactionForm } from "./transaction-form";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit mode ("Editar movimentação"); absent → create (FR-016/019). */
  transaction?: Transaction | null;
}

/**
 * "Nova/Editar movimentação" modal (FR-016..FR-022). Controlled from the
 * dashboard, which owns `open` and the row being edited. The form remounts
 * per target via `key` (and unmounts on close), so no state leaks between
 * create/edit sessions.
 */
export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionDialogProps) {
  const isEdit = transaction != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar movimentação" : "Nova movimentação"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajuste os dados abaixo e salve as alterações."
              : "Registre uma receita ou despesa na sua carteira."}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          key={transaction?.id ?? "create"}
          transaction={transaction ?? null}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
