"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
  createTeacherProfileRepository,
} from "../../../src/storage/teacher-class-settings";
import { isUnassigned } from "../../../src/domain/teacher-content-summary";
import { TEACHER_CLASSES_CHANGE_EVENT } from "./teacher-classes";

export type TeacherNavClass = {
  id: string;
  name: string;
  schoolYear: string;
  members: number;
};

export type TeacherNavData = {
  /** `null`, solange noch geladen wird. */
  classes: TeacherNavClass[] | null;
  unassignedCount: number;
  profileName: string;
  lastClassId: string | undefined;
};

/** Ereignis, wenn Inhalte der Ablage oder Einstellungen geändert wurden. */
const DATA_EVENT = "teacher-data-changed";

/**
 * Daten der Lehrer-Leiste: Klassen mit Schülerzahl, Zahl der Inhalte ohne
 * Klasse und das Lehrerprofil. Lädt neu, wenn Klassen oder Daten geändert
 * werden. Ein Fehler beim Lesen zeigt eine leere Leiste statt zu scheitern.
 */
export function useTeacherNavData(): TeacherNavData {
  const classRepository = useMemo(() => createTeacherClassRepository(), []);
  const libraryRepository = useMemo(
    () => createTeacherContentLibraryRepository(),
    [],
  );
  const profileRepository = useMemo(() => createTeacherProfileRepository(), []);
  const [data, setData] = useState<TeacherNavData>({
    classes: null,
    unassignedCount: 0,
    profileName: "",
    lastClassId: undefined,
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [classes, packages, profile] = await Promise.all([
        classRepository.list(),
        libraryRepository.list(),
        profileRepository.get(),
      ]);
      const rows = await Promise.all(
        classes.map(async (course) => ({
          id: course.id,
          name: course.name,
          schoolYear: course.schoolYear,
          members: (await classRepository.listMembers(course.id)).length,
        })),
      );
      const activeIds = new Set(classes.map(({ id }) => id));
      if (!active) return;
      setData({
        classes: rows,
        unassignedCount: packages.filter((entry) =>
          isUnassigned(entry, activeIds),
        ).length,
        profileName: profile?.displayName ?? "",
        lastClassId: profile?.lastLiveClassId,
      });
    };
    const reload = () =>
      void load().catch(() => {
        if (active)
          setData((current) => ({
            ...current,
            classes: current.classes ?? [],
          }));
      });
    reload();
    window.addEventListener(TEACHER_CLASSES_CHANGE_EVENT, reload);
    window.addEventListener(DATA_EVENT, reload);
    return () => {
      active = false;
      window.removeEventListener(TEACHER_CLASSES_CHANGE_EVENT, reload);
      window.removeEventListener(DATA_EVENT, reload);
    };
  }, [classRepository, libraryRepository, profileRepository]);

  return data;
}
