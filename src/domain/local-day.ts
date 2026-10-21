/** Lokaler Kalendertag (Zeitzone des Geräts) als `JJJJ-MM-TT`. */
export function localDayKey(value: string | number | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Beginn des nächsten lokalen Kalendertags (00:00 Uhr in der Zeitzone des
 * Geräts) als ISO-Zeitpunkt. `value` ist injizierbar, damit Tests die Uhr nicht
 * brauchen; der Monats- und Sommerzeitwechsel regelt `Date`.
 */
export function nextLocalDayStart(value: string | number | Date) {
  const date = new Date(value);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  ).toISOString();
}
