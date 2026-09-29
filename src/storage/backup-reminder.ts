/**
 * Erinnerung an die persönliche Sicherung (Umsetzungsplan 1.4): Lernstände
 * liegen nur auf dem Gerät. Wird es zurückgesetzt, sind sie ohne Sicherung weg.
 */
export const LAST_BACKUP_KEY = "lernraum:personal:v1:last-backup";
export const BACKUP_REMINDER_DAYS = 14;

type BackupStorage = Pick<Storage, "getItem" | "setItem">;

export function readLastBackup(
  getStorage: () => BackupStorage = () => window.localStorage,
): Date | null {
  try {
    const value = getStorage().getItem(LAST_BACKUP_KEY);
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function writeLastBackup(
  date: Date,
  getStorage: () => BackupStorage = () => window.localStorage,
) {
  try {
    getStorage().setItem(LAST_BACKUP_KEY, date.toISOString());
    return true;
  } catch {
    return false;
  }
}

export function backupReminder(last: Date | null, now: Date) {
  if (!last) return { level: "never" as const, days: null };
  const days = Math.floor((now.getTime() - last.getTime()) / 86_400_000);
  return {
    level: days >= BACKUP_REMINDER_DAYS ? ("old" as const) : ("ok" as const),
    days,
  };
}
