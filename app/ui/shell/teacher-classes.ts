/**
 * Meldung an die Lehrer-Leiste, dass sich Klassen geändert haben. Die Leiste
 * selbst (Klassenliste mit Schülerzahl) steckt im Rahmen des Lehrerbereichs
 * (`teacher-shell.tsx`, Ansicht `app/views/lehrer/teacher-frame.tsx`).
 */
export const TEACHER_CLASSES_CHANGE_EVENT = "lernraum-teacher-classes-change";

export function notifyTeacherClassesChanged() {
  window.dispatchEvent(new Event(TEACHER_CLASSES_CHANGE_EVENT));
}
