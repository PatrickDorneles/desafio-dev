"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategory, updateCategory } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/query-keys";
import { errorMessage } from "@/lib/errors";
import { createCategorySchema, updateCategorySchema } from "@/lib/schemas";
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { Loader2, Paintbrush, Plus, TriangleAlert } from "lucide-react";

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

interface CategoryFormValues {
  name: string;
  color: string;
  icon: string;
}

const EMPTY_VALUES: CategoryFormValues = { name: "", color: "", icon: "" };

/**
 * "Gerenciar categorias" create/edit form (FR-023..FR-025). `CategoryManager`
 * remounts it via `key` per target, so the form owns its values/errors and
 * needs no lifted state.
 */
export function CategoryForm({
  editing,
  onReset,
  onSaved,
}: {
  editing: Category | null;
  onReset: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();

  const [values, setValues] = useState<CategoryFormValues>(() =>
    editing
      ? { name: editing.name, color: editing.color ?? "", icon: editing.icon ?? "" }
      : EMPTY_VALUES,
  );
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (payload: CreateCategoryInput | UpdateCategoryInput) =>
      editing
        ? updateCategory(editing.id, payload as UpdateCategoryInput)
        : createCategory(payload as CreateCategoryInput),
    onSuccess: () => {
      // CA-008: list + the transaction form's category select refresh.
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onSaved();
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const parsed = schema.safeParse(buildCategoryCandidate(values));
    if (!parsed.success) return;
    setServerError(null);
    try {
      await saveMutation.mutateAsync(parsed.data);
      // Mirror the original `resetForm`: clear the form after a successful
      // save. In create mode `CategoryManager` doesn't remount us (the `key`
      // stays "new"), so the reset lives here.
      setValues(EMPTY_VALUES);
      setAttempted(false);
      setServerError(null);
    } catch (error) {
      setServerError(errorMessage(error, "Não foi possível salvar a categoria."));
    }
  }

  return (
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
            onClick={onReset}
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
