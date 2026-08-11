"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Receipt } from "lucide-react";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Nova movimentação" modal (FR-016). Controlled from the dashboard so both
 * the header button and the empty-state CTA can open it. The form lives in
 * the next lane — only the body below is meant to be replaced.
 */
export function TransactionDialog({
  open,
  onOpenChange,
}: TransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova movimentação</DialogTitle>
          <DialogDescription>
            Registre uma receita ou despesa na sua carteira.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-foreground/15 px-4 py-10 text-center">
          <Receipt className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Formulário em construção — em breve.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
