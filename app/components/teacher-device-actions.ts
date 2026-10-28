import type { TeacherDeviceType } from "../../src/domain/teacher-device";
import { PIN_LENGTH, isValidPin } from "../../src/domain/teacher-lock";
import { createPinVerifier } from "../../src/integrations/crypto/pin";
import { TeacherClassDatabase } from "../../src/storage/teacher-class-settings";
import { saveTeacherDevice } from "../../src/storage/teacher-device";
import {
  clearPinVerifier,
  markUnlocked,
  savePinVerifier,
} from "../../src/storage/teacher-lock";
import {
  countTeacherPersonalData,
  deleteTeacherPersonalData,
} from "../../src/storage/teacher-personal-data";
import { notifyTeacherClassesChanged } from "../ui/shell/teacher-classes";
import type { PersonalDataSummary } from "../views/lehrer/device-screens";

/**
 * Aktionen für Gerätetyp und Sperre des Lehrerbereichs. Gemeinsam für die
 * Auswahl beim ersten Öffnen, den Sperrbildschirm und die Einstellungen.
 */

/** Hat die Lehrkraft das Gerät als Tafel gewählt, liegen dort noch Personendaten? */
async function personalDataOnDevice(): Promise<PersonalDataSummary | null> {
  const database = new TeacherClassDatabase();
  try {
    const count = await countTeacherPersonalData(database);
    return count.total > 0 ? count : null;
  } catch {
    return null;
  } finally {
    database.close();
  }
}

/**
 * Gerätetyp speichern. Beim Wechsel auf die Tafel entfällt die PIN-Sperre (es
 * gibt dort nichts zu schützen), und vorhandene Personendaten werden zum
 * Löschen angeboten: Rückgabe ist dann deren Zusammenfassung.
 */
export async function applyDeviceType(
  type: TeacherDeviceType,
): Promise<{ saved: boolean; offer: PersonalDataSummary | null }> {
  const saved = saveTeacherDevice(type, new Date());
  if (!saved) return { saved, offer: null };
  if (type !== "board") return { saved, offer: null };
  clearPinVerifier();
  return { saved, offer: await personalDataOnDevice() };
}

/** Personendaten dieses Geräts löschen (Material bleibt) und die Leiste informieren. */
export async function deletePersonalDataOnDevice(): Promise<void> {
  const database = new TeacherClassDatabase();
  try {
    await deleteTeacherPersonalData(database);
  } finally {
    database.close();
  }
  window.dispatchEvent(new Event("teacher-data-changed"));
  notifyTeacherClassesChanged();
}

/** Neue PIN speichern (nur der Prüfwert). Rückgabe: Fehlermeldung oder nichts. */
export async function savePin(pin: string): Promise<string | undefined> {
  if (!isValidPin(pin)) return `Die PIN hat genau ${PIN_LENGTH} Ziffern.`;
  try {
    const stored = savePinVerifier(await createPinVerifier(pin));
    if (!stored) return "Die PIN konnte nicht gespeichert werden.";
    // Wer die PIN eben festgelegt hat, bleibt entsperrt.
    markUnlocked(Date.now());
    return undefined;
  } catch {
    return "Die PIN konnte nicht gespeichert werden.";
  }
}
