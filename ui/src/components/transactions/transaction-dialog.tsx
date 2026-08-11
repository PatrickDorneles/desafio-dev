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
      {/* `p-0 flex flex-col` shell: the header pads itself, the form owns a
          scrolling body + a full-width footer bar pinned flush to the bottom.
          The base grid/padding are overridden here so nothing inside has to
          "break out" of the dialog with negative margins. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-4 pb-2 pt-4">
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
