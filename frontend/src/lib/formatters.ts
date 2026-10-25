export function formatNumber(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Unavailable";
  if (Math.abs(value) >= 10000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) return value.toExponential(2);
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}
export function formatMs(value: number | null | undefined): string { return value == null || !Number.isFinite(value) ? "Unavailable" : value < 1000 ? `${value.toFixed(0)} ms` : `${(value / 1000).toFixed(2)} s`; }
export function titleCase(value: string): string { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
