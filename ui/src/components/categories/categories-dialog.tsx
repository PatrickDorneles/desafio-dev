"use client";

import { useMemo, useState, type FormEvent } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/query-keys";
import { errorMessage } from "@/lib/errors";
import { createCategorySchema, updateCategorySchema } from "@/lib/schemas";
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
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
  Paintbrush,
  Pencil,
  Phone,
  PiggyBank,
  Plane,
  Plus,
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

interface CategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Small preset palette — echoes the emerald accent plus usable tones on the
 * dark surface. `input[type="color"]` covers anything outside it.
 */
const COLOR_PRESETS = [
  "#34d399",
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#fb7185",
  "#fbbf24",
  "#f97316",
];

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

interface CategoryFormValues {
  name: string;
  color: string;
  icon: string;
}

const EMPTY_VALUES: CategoryFormValues = { name: "", color: "", icon: "" };

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

function CategoryManager() {
  const queryClient = useQueryClient();

  const categories = useQuery({
    queryKey: queryKeys.categories,
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });

  const [editing, setEditing] = useState<Category | null>(null);
  const [values, setValues] = useState<CategoryFormValues>(EMPTY_VALUES);
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (payload: CreateCategoryInput | UpdateCategoryInput) =>
      editing
        ? updateCategory(editing.id, payload as UpdateCategoryInput)
        : createCategory(payload as CreateCategoryInput),
    onSuccess: () => {
      // CA-008: list + the transaction form's category select refresh.
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setDeleting(null);
      setDeleteError(null);
    },
  });

  const schema = editing ? updateCategorySchema : createCategorySchema;

  const parseError = useMemo(() => {
    if (!attempted) return null;
    const parsed = schema.safeParse(buildCategoryCandidate(values));
    return parsed.success ? null : parsed.error;
  }, [values, attempted, schema]);

  function setField<F extends keyof CategoryFormValues>(
    field: F,
    value: CategoryFormValues[F],
  ) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setServerError(null);
  }

  function fieldError(field: "name" | "icon"): string | undefined {
    if (!parseError) return undefined;
    const issue = parseError.issues.find((item) => item.path[0] === field);
    if (!issue) return undefined;
    if (field === "name") {
      return values.name.trim() === "" ? "Informe o nome." : "Máximo de 50 caracteres.";
    }
    return "Máximo de 50 caracteres.";
  }

  function startEdit(category: Category) {
    setEditing(category);
    setValues({ name: category.name, color: category.color ?? "", icon: category.icon ?? "" });
    setAttempted(false);
    setServerError(null);
  }

  function resetForm() {
    setEditing(null);
    setValues(EMPTY_VALUES);
    setAttempted(false);
    setServerError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const parsed = schema.safeParse(buildCategoryCandidate(values));
    if (!parsed.success) return;
    setServerError(null);
    try {
      await saveMutation.mutateAsync(parsed.data);
    } catch (error) {
      setServerError(errorMessage(error, "Não foi possível salvar a categoria."));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-3"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Nome</Label>
            <Input
              id="category-name"
              name="name"
              placeholder="Ex.: Alimentação"
              maxLength={50}
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              aria-invalid={Boolean(fieldError("name"))}
            />
            {fieldError("name") && (
              <p className="text-xs text-expense">{fieldError("name")}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-icon">Ícone</Label>
            <Input
              id="category-icon"
              name="icon"
              placeholder="Ex.: 🛒"
              maxLength={50}
              value={values.icon}
              onChange={(event) => setField("icon", event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium leading-none">Cor</p>
          <div
            role="group"
            aria-label="Cor"
            className="flex flex-wrap items-center gap-1.5"
          >
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                aria-pressed={values.color === color}
                aria-label={`Usar cor ${color}`}
                onClick={() => setField("color", values.color === color ? "" : color)}
                className={cn(
                  "size-6 rounded-full outline-none transition-transform focus-visible:ring-3 focus-visible:ring-ring/50",
                  values.color === color
                    ? "scale-110 ring-2 ring-foreground/70 ring-offset-2 ring-offset-background"
                    : "ring-1 ring-foreground/10 hover:scale-110",
                )}
                style={{ backgroundColor: color }}
              />
            ))}
            <label className="relative inline-flex size-6 cursor-pointer items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-foreground/10 transition-colors focus-within:ring-3 focus-within:ring-ring/50 hover:text-foreground">
              <Paintbrush className="size-3.5" aria-hidden />
              <span className="sr-only">Escolher cor personalizada</span>
              <input
                type="color"
                value={values.color || COLOR_PRESETS[0]}
                onChange={(event) => setField("color", event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        {serverError && (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" aria-hidden />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          {editing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetForm}
              disabled={saveMutation.isPending}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" size="sm" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Salvando…
              </>
            ) : editing ? (
              "Salvar alterações"
            ) : (
              <>
                <Plus className="size-3.5" aria-hidden />
                Adicionar categoria
              </>
            )}
          </Button>
        </div>
      </form>

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
                  onClick={() => startEdit(category)}
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

/**
 * Form values → schema input. Empty color/icon are omitted (optional fields
 * on the API — color can't be reset to null via PATCH, so "no color" is a
 * create-only state).
 */
function buildCategoryCandidate(
  values: CategoryFormValues,
): CreateCategoryInput | UpdateCategoryInput {
  const candidate: CreateCategoryInput = { name: values.name };
  if (values.color) candidate.color = values.color;
  if (values.icon.trim()) candidate.icon = values.icon.trim();
  return candidate;
}
