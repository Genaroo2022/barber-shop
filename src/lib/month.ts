export function getCurrentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function isInMonth(dateValue: string | Date, monthKey: string): boolean {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}` === monthKey;
}

export function monthKeyForFilename(monthKey: string): string {
  return monthKey.replace("-", "");
}
