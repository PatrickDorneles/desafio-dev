"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTransaction, listCategories, updateTransaction } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/query-keys";
import { errorMessage } from "@/lib/errors";
import { todayISODate } from "@/lib/format";
import {
  createTransactionSchema,
  TransactionType,
  updateTransactionSchema,
} from "@/lib/schemas";
import type {
  CreateTransactionInput,
  Transaction,
  UpdateTransactionInput,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit mode ("Editar movimentação"); absent → create (FR-016/019). */
  transaction?: Transaction | null;
}

/** Sentinel value for the "Sem categoria" option (Radix Select can't use ""). */
const CATEGORY_NONE = "none";

interface FormValues {
  type: TransactionType;
  amount: string;
  description: string;
  date: string;
  categoryId: string;
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

function TransactionForm({
  transaction,
  onSuccess,
}: {
  transaction: Transaction | null;
  onSuccess: () => void;
}) {
  const isEdit = transaction != null;
  const queryClient = useQueryClient();

  const categories = useQuery({
    queryKey: queryKeys.categories,
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });

  const [values, setValues] = useState<FormValues>(() => ({
    type: transaction?.type ?? TransactionType.EXPENSE,
    amount: transaction ? formatCentsToInput(transaction.amountCents) : "",
    description: transaction?.description ?? "",
    date: transaction?.date ?? todayISODate(),
    categoryId: transaction?.categoryId ?? "",
  }));
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: CreateTransactionInput | UpdateTransactionInput) =>
      transaction
        ? updateTransaction(transaction.id, payload as UpdateTransactionInput)
        : createTransaction(payload as CreateTransactionInput),
    onSuccess: () => {
      // FR-018: table (any page) + summary refresh after create/edit.
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
      onSuccess();
    },
  });

  const schema = isEdit ? updateTransactionSchema : createTransactionSchema;

  const parseError = useMemo(() => {
    if (!attempted) return null;
    const parsed = schema.safeParse(buildCandidate(values, isEdit));
    return parsed.success ? null : parsed.error;
  }, [values, attempted, schema, isEdit]);

  function setField<F extends keyof FormValues>(field: F, value: FormValues[F]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setServerError(null);
  }

  function fieldError(field: "amount" | "description" | "date"): string | undefined {
    if (!attempted) return undefined;
    if (field === "amount") {
      const raw = values.amount.trim();
      if (raw === "") return "Informe o valor.";
      const cents = parseBRLToCents(raw);
      if (cents === null) return "Use um valor válido, ex.: 123,45.";
      if (cents === 0) return "O valor deve ser maior que zero.";
      return undefined;
    }
    if (!parseError) return undefined;
    const issue = parseError.issues.find((item) => item.path[0] === field);
    if (!issue) return undefined;
    if (field === "description") {
      return values.description.trim() === "" ? "Informe a descrição." : "Máximo de 200 caracteres.";
    }
    return values.date === "" ? "Informe a data." : "Data inválida.";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const parsed = schema.safeParse(buildCandidate(values, isEdit));
    if (!parsed.success) return;
    setServerError(null);
    try {
      await mutation.mutateAsync(parsed.data);
    } catch (error) {
      setServerError(errorMessage(error, "Não foi possível salvar a movimentação."));
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <TypeSegmented value={values.type} onChange={(type) => setField("type", type)} />

      <Field id="transaction-amount" label="Valor" error={fieldError("amount")}>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 inline-flex items-center text-sm text-muted-foreground">
            R$
          </span>
          <Input
            id="transaction-amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={values.amount}
            onChange={(event) => setField("amount", event.target.value)}
            aria-invalid={Boolean(fieldError("amount"))}
            className="pl-8"
          />
        </div>
      </Field>

      <Field id="transaction-description" label="Descrição" error={fieldError("description")}>
        <Input
          id="transaction-description"
          name="description"
          placeholder="Ex.: Supermercado do mês"
          maxLength={200}
          value={values.description}
          onChange={(event) => setField("description", event.target.value)}
          aria-invalid={Boolean(fieldError("description"))}
        />
      </Field>

      <Field id="transaction-date" label="Data" error={fieldError("date")}>
        <Input
          id="transaction-date"
          name="date"
          type="date"
          value={values.date}
          onChange={(event) => setField("date", event.target.value)}
          aria-invalid={Boolean(fieldError("date"))}
          className="[color-scheme:dark]"
        />
      </Field>

      <Field id="transaction-category" label="Categoria">
        <Select
          value={values.categoryId === "" ? CATEGORY_NONE : values.categoryId}
          onValueChange={(value) =>
            setField("categoryId", value === CATEGORY_NONE ? "" : value)
          }
        >
          <SelectTrigger id="transaction-category" className="w-full">
            <SelectValue placeholder="Sem categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CATEGORY_NONE}>Sem categoria</SelectItem>
            {categories.data?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.color && (
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                )}
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categories.isSuccess && categories.data.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Você ainda não tem categorias — crie algumas em “Gerenciar categorias”.
          </p>
        )}
      </Field>

      {serverError && (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" aria-hidden />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <DialogFooter className="sticky bottom-0 z-10 -mt-2 bg-muted/80 backdrop-blur-sm">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSuccess()}
          disabled={mutation.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Salvando…
            </>
          ) : isEdit ? (
            "Salvar alterações"
          ) : (
            "Adicionar"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Two-button segmented control with income/expense tone when active (FR-016). */
function TypeSegmented({
  value,
  onChange,
}: {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}) {
  const options: Array<{
    value: TransactionType;
    label: string;
    icon: LucideIcon;
  }> = [
    { value: TransactionType.INCOME, label: "Receita", icon: ArrowUpRight },
    { value: TransactionType.EXPENSE, label: "Despesa", icon: ArrowDownRight },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Tipo"
      onKeyDown={(event) => {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          onChange(
            value === TransactionType.INCOME ? TransactionType.EXPENSE : TransactionType.INCOME,
          );
        }
      }}
      className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? option.value === TransactionType.INCOME
                  ? "bg-income/15 text-income ring-1 ring-income/25"
                  : "bg-expense/15 text-expense ring-1 ring-expense/25"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-expense">{error}</p>}
    </div>
  );
}

/** pt-BR decimal → integer cents: "1.234,56" → 123456. `null` when unparseable. */
function parseBRLToCents(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

/** `123456` → "1.234,56" — used to prefill the amount input on edit. */
function formatCentsToInput(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Form values → schema input. "Sem categoria" becomes an omitted field on
 * create (FR-016) or an explicit `null` on edit (FR-021 — the API
 * distinguishes `null` from absent).
 */
function buildCandidate(
  values: FormValues,
  isEdit: boolean,
): CreateTransactionInput | UpdateTransactionInput {
  const base = {
    type: values.type,
    amountCents: parseBRLToCents(values.amount) ?? 0,
    description: values.description,
    date: values.date,
  };
  if (isEdit) {
    return {
      ...base,
      categoryId: values.categoryId === "" ? null : values.categoryId,
    };
  }
  return values.categoryId === ""
    ? base
    : { ...base, categoryId: values.categoryId };
}
