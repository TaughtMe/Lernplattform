/** Reine Hilfsfunktionen für die Lernen-Startseite (Tage, Woche, Serie). */
import type { WeekDay } from "../views/lernen/home-screen";

export function localDayKey(value: string | number | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Aufeinanderfolgende Übungstage bis heute (oder gestern). */
export function countStreak(activeDays: readonly string[], now = new Date()) {
  const days = new Set(activeDays);
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function createCalendarMonth(month: Date, today = new Date()) {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cellCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(
      month.getFullYear(),
      month.getMonth(),
      index - mondayOffset + 1,
    );
    return {
      key: localDayKey(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month.getMonth(),
      isToday: localDayKey(date) === localDayKey(today),
    };
  });
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
const WEEKDAY_NAMES = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
] as const;

/** Montag bis Sonntag der aktuellen Woche. */
export function currentWeek(today = new Date()) {
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return WEEKDAYS.map((short, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      key: localDayKey(date),
      short,
      label: WEEKDAY_NAMES[index]!,
      isToday: localDayKey(date) === localDayKey(today),
    };
  });
}

/** Woche für die Ansicht: geübt, verpasst oder noch offen. */
export function weekStates(
  activeDays: readonly string[],
  today = new Date(),
): WeekDay[] {
  const todayKey = localDayKey(today);
  const active = new Set(activeDays);
  return currentWeek(today).map((day) => ({
    short: day.short,
    label: day.label,
    today: day.isToday,
    state: active.has(day.key)
      ? "active"
      : day.key >= todayKey
        ? "upcoming"
        : "missed",
  }));
}
