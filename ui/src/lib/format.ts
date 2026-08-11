/**
 * Formatting helpers (FR-029): BRL amounts from cents and `YYYY-MM-DD` dates.
 */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** `123456` → `R$ 1.234,56`. Normalizes `-0` so an empty balance shows `R$ 0,00`. */
export function formatBRL(cents: number): string {
  const value = Object.is(cents, -0) ? 0 : cents;
  return brl.format(value / 100);
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
