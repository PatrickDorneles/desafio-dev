/**
 * Formatting helpers (FR-029): BRL amounts from/to cents and `YYYY-MM-DD` dates.
 */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** `123456` → "1.234,56" — prefill formatting for the amount input on edit. */
const brlInput = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `123456` → `R$ 1.234,56`. Normalizes `-0` so an empty balance shows `R$ 0,00`. */
export function formatBRL(cents: number): string {
  const value = Object.is(cents, -0) ? 0 : cents;
  return brl.format(value / 100);
}

/** pt-BR decimal → integer cents: "1.234,56" → 123456. `null` when unparseable. */
export function parseBRLToCents(value: string): number | null {
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
export function formatCentsToInput(cents: number): string {
  return brlInput.format(cents / 100);
}

/**
 * `2026-08-11` → `11/08/2026`.
 * Split by hand — `new Date("YYYY-MM-DD")` parses as UTC and drifts on
 * negative timezones.
 */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Local `YYYY-MM-DD` for `<input type="date">` defaults — mirrors the API's
 * `todayIso()` default for the transaction date (Spec 003).
 */
export function todayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
