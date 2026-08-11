"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tags } from "lucide-react";

interface CategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Gerenciar categorias" modal (FR-023). Controlled from the dashboard. The
 * category list + CRUD forms live in the next lane — only the body below is
 * meant to be replaced.
 */
export function CategoriesDialog({
  open,
  onOpenChange,
}: CategoriesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar categorias</DialogTitle>
          <DialogDescription>
            Crie, edite e exclua as categorias das suas movimentações.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-foreground/15 px-4 py-10 text-center">
          <Tags className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Formulário em construção — em breve.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
