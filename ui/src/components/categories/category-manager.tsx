"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteCategory, listCategories } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/query-keys";
import { errorMessage } from "@/lib/errors";
import type { Category } from "@/lib/schemas";
import {
  Bike,
  Banknote,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Cat,
  Coffee,
  CreditCard,
  Dog,
  Dumbbell,
  Film,
  Flower,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  HeartPulse,
  House,
  Loader2,
  Music,
  Pencil,
  Phone,
  PiggyBank,
  Plane,
  Receipt,
  RotateCw,
  Scale,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Tags,
  Trash2,
  TriangleAlert,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CategoryForm } from "./category-form";

/** Free-text icons may hold a lucide name ("utensils") or an emoji (🛒). */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  car: Car,
  bus: Bus,
  house: House,
  plane: Plane,
  briefcase: Briefcase,
  "piggy-bank": PiggyBank,
  gift: Gift,
  shirt: Shirt,
  coffee: Coffee,
  film: Film,
  music: Music,
  dumbbell: Dumbbell,
  "heart-pulse": HeartPulse,
  phone: Phone,
  zap: Zap,
  banknote: Banknote,
  wallet: Wallet,
  "credit-card": CreditCard,
  "gamepad-2": Gamepad2,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  heart: Heart,
  dog: Dog,
  cat: Cat,
  flower: Flower,
  bike: Bike,
  stethoscope: Stethoscope,
  receipt: Receipt,
  fuel: Fuel,
  scale: Scale,
};

/**
 * "Gerenciar categorias" list + delete (FR-023..FR-025). Owns the edit target
 * and the delete confirm dialog; the create/edit form is `CategoryForm`,
 * remounted via `key` when the target changes.
 */
export function CategoryManager() {
  const queryClient = useQueryClient();

  const categories = useQuery({
    queryKey: queryKeys.categories,
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });

  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setDeleting(null);
      setDeleteError(null);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <CategoryForm
        key={editing?.id ?? "new"}
        editing={editing}
        onReset={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />

      {categories.isPending ? (
        <CategoryListSkeleton />
      ) : categories.isError ? (
        <div className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5">
          <TriangleAlert className="size-4 shrink-0 text-expense" aria-hidden />
          <p className="flex-1 text-sm">
            {errorMessage(categories.error, "Não foi possível carregar as categorias.")}
          </p>
          <Button variant="outline" size="sm" onClick={() => void categories.refetch()}>
            <RotateCw className="size-3.5" aria-hidden />
            Tentar novamente
          </Button>
        </div>
      ) : categories.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-foreground/10 px-4 py-8 text-center">
          <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground ring-1 ring-foreground/5">
            <Tags className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium">Nenhuma categoria ainda</p>
            <p className="text-sm text-muted-foreground">
              Crie a primeira no formulário acima.
            </p>
          </div>
        </div>
      ) : (
        <ul className="max-h-64 divide-y divide-border/60 overflow-y-auto" aria-label="Suas categorias">
          {categories.data.map((category) => (
            <li key={category.id} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-foreground/60 ring-1 ring-foreground/5">
                <CategoryIcon icon={category.icon} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {category.name}
              </span>
              {category.color && (
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
              )}
              <div className="flex shrink-0 gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Editar ${category.name}`}
                  onClick={() => setEditing(category)}
                >
                  <Pencil className="size-3.5" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Excluir ${category.name}`}
                  className="hover:text-destructive"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleting(category);
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* FR-024: deleting a category in use unlinks transactions (SET NULL). */}
      <AlertDialog
        open={deleting != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-expense/10 text-expense">
              <Trash2 aria-hidden />
            </AlertDialogMedia>
            <AlertDialogTitle>Excluir “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              As movimentações vinculadas ficarão sem categoria. Essa ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <TriangleAlert className="size-4" aria-hidden />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!deleting) return;
                setDeleteError(null);
                deleteMutation.mutate(deleting.id);
              }}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Excluindo…
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Renders a known lucide icon by name, the raw glyph (emoji) or a fallback. */
function CategoryIcon({ icon }: { icon: string | null }) {
  if (!icon) return <Tags className="size-3.5" aria-hidden />;
  const Icon = CATEGORY_ICONS[icon.trim().toLowerCase()];
  if (Icon) return <Icon className="size-3.5" aria-hidden />;
  return <span className="max-w-5 truncate text-xs leading-none">{icon}</span>;
}

function CategoryListSkeleton() {
  return (
    <div className="space-y-2" aria-busy>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  );
}
