"use client";

import { useEffect, useState } from "react";
import { classSealFingerprint } from "../../../../src/domain/class-seal";
import { classModuleSchema } from "../../../../src/domain/class-workspace";
import {
  createTeacherClassRepository,
  createTeacherProfileRepository,
} from "../../../../src/storage/teacher-class-settings";
import { notifyTeacherClassesChanged } from "../../../ui/shell/teacher-classes";
import { defaultSchoolYear } from "../lib/school-year";

type LiveClassChoiceInput = {
  /** Uhr in Millisekunden für das Schuljahr neuer Klassen. */
  clock: () => number;
  setError: (message: string) => void;
  setLibraryNotice: (message: string) => void;
};

/**
 * Optionale Klasse für den Raum: Klassenliste, Auswahl und Klassenstempel.
 * Der Raum trägt nur den Abdruck des Stempels, damit Freigaben der
 * Schreiberleichterung genau in diesem Raum wirken.
 */
export function useLiveClassChoice({
  clock,
  setError,
  setLibraryNotice,
}: LiveClassChoiceInput) {
  const [liveClasses, setLiveClasses] = useState<
    { id: string; name: string; fingerprint?: string }[]
  >([]);
  const [classChoice, setClassChoiceState] = useState("");
  const [classesLoaded, setClassesLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const repository = createTeacherClassRepository();
      const classes = await repository.list();
      const withPrint = await Promise.all(
        classes.map(async ({ id, name, seal }) => ({
          id,
          name,
          ...(seal
            ? { fingerprint: await classSealFingerprint(seal.publicKey) }
            : {}),
        })),
      );
      if (!active) return;
      setLiveClasses(withPrint);
      const last = (await createTeacherProfileRepository().get())
        ?.lastLiveClassId;
      if (active && last && withPrint.some(({ id }) => id === last)) {
        setClassChoiceState((current) => current || last);
      }
    })()
      .catch(() => undefined)
      .finally(() => {
        if (active) setClassesLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);
  // Nach dem Wiederöffnen eines Raums die Klasse aus dem Abdruck zurückfinden,
  // sonst ginge die Wahl beim Start der Runde verloren.
  const [restoredClassSeal, setRestoredClassSeal] = useState<string>();
  const activeClass =
    classChoice ||
    (restoredClassSeal
      ? liveClasses.find(({ fingerprint }) => fingerprint === restoredClassSeal)
          ?.id
      : undefined) ||
    "";
  const classSeal = liveClasses.find(
    ({ id }) => id === activeClass,
  )?.fingerprint;

  async function setClassChoice(id: string) {
    setRestoredClassSeal(undefined);
    setClassChoiceState(id);
    if (!id) {
      await rememberClass(undefined);
      return;
    }
    // Ältere Klassen erhalten ihren Stempel beim ersten Bedarf.
    try {
      const seal = await createTeacherClassRepository().ensureSeal(id);
      if (!seal) return;
      const fingerprint = await classSealFingerprint(seal.publicKey);
      setLiveClasses((current) =>
        current.map((entry) =>
          entry.id === id ? { ...entry, fingerprint } : entry,
        ),
      );
      await rememberClass(id);
    } catch {
      setClassChoiceState("");
      setError("Für diese Klasse konnte kein Klassenstempel erstellt werden.");
    }
  }

  async function rememberClass(id: string | undefined) {
    try {
      const repository = createTeacherProfileRepository();
      const profile = await repository.get();
      if (!profile || profile.lastLiveClassId === id) return;
      await repository.put({
        ...profile,
        ...(id ? { lastLiveClassId: id } : { lastLiveClassId: undefined }),
      });
    } catch {
      // Die Auswahl gilt trotzdem; nur das Merken für das nächste Mal entfällt.
    }
  }

  /** Legt eine neue Klasse an und wählt sie aus; gespeichert wird erst mit „Speichern“. */
  async function createClassNamed(rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    try {
      const repository = createTeacherClassRepository();
      const profile = await createTeacherProfileRepository().get();
      const now = new Date().toISOString();
      const course = {
        id: crypto.randomUUID(),
        name,
        teacherName: profile?.displayName || "Lehrkraft",
        schoolYear: defaultSchoolYear(new Date(clock())),
        enabledModules: [...classModuleSchema.options],
        createdAt: now,
        updatedAt: now,
      };
      await repository.put(course);
      setLiveClasses((current) => [...current, { id: course.id, name }]);
      window.dispatchEvent(new Event("teacher-data-changed"));
      notifyTeacherClassesChanged();
      await setClassChoice(course.id);
      setLibraryNotice(`Klasse „${name}“ ist angelegt.`);
    } catch {
      setLibraryNotice("Die Klasse konnte nicht angelegt werden.");
    }
  }

  return {
    liveClasses,
    classChoice: activeClass,
    classesLoaded,
    classSeal,
    setClassChoice,
    setRestoredClassSeal,
    createClassNamed,
  };
}
