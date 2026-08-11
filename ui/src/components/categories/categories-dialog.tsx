"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryManager } from "./category-manager";

interface CategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Gerenciar categorias" modal (FR-023..FR-025): inline create/edit form +
 * compact list with per-row edit/delete. Controlled from the dashboard.
 */
export function CategoriesDialog({ open, onOpenChange }: CategoriesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar categorias</DialogTitle>
          <DialogDescription>
            Crie, edite e exclua as categorias das suas movimentações.
          </DialogDescription>
        </DialogHeader>
        <CategoryManager />
      </DialogContent>
    </Dialog>
  );
}
