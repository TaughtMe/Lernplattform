/** Schuljahr zum Datum, z. B. „2026/27“ (ab August das neue Jahr). */
export function defaultSchoolYear(date: Date) {
  const start =
    date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}
