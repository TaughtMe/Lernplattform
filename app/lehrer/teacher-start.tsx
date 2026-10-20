"use client";

import { StartScreen } from "../views/lehrer/start-screen";
import { useTeacherStart } from "./use-teacher-start";

/** Startseite des Lehrerbereichs (Lehrerbereich v2, 15a/15c/15d). */
export function TeacherStart() {
  const { screen } = useTeacherStart();
  return <StartScreen {...screen} />;
}
