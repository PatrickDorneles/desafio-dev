/**
 * Returns the server's LOCAL date as `YYYY-MM-DD` (zero-padded).
 * Used as the default for `transactions.date` (Spec 003, FR-009).
 */
export function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
