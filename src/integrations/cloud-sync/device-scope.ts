/**
 * Umfang des Abgleichs je Gerätetyp (Regel D3-3). Auf einer Tafel bzw. einem
 * geteilten Gerät wird nur Material abgeglichen: keine Klassen, Schüler,
 * Profile, Aufgaben, Abgaben und keine Schlüssel. Was die Lehrkraft beim
 * Einrichten gewählt hat, bleibt gespeichert und gilt wieder, sobald das Gerät
 * „Mein Gerät“ ist.
 */
import type { TeacherDeviceType } from "../../domain/teacher-device";
import { SYNC_AREAS, type SyncScope } from "./model";

export function scopeForDevice(
  scope: SyncScope,
  device: TeacherDeviceType,
): SyncScope {
  if (device !== "board") return scope;
  const result = Object.fromEntries(
    SYNC_AREAS.map((area) => [area, false]),
  ) as SyncScope;
  result.material = scope.material;
  return result;
}
