"use client";

import type { ReactNode } from "react";
import { DEMO_STUDENT, DEMO_TEACHER } from "../../views/laufdiktat/demo";
import {
  StudentDictationScreen,
  type StudentDictationPhase,
} from "../../views/laufdiktat/student-dictation-screen";
import {
  TeacherDictationScreen,
  type TeacherStep,
} from "../../views/laufdiktat/teacher-dictation-screen";
import type { Theme } from "../../views/parts/parts";
import { LandingScreen } from "../../views/start/landing-screen";

/** Zustand eines Referenzbildes aus docs/design/screens.json. */
export type ScreenState = { id: string; screen: string; theme: Theme };

const STUDENT_PHASES: readonly StudentDictationPhase[] = [
  "station",
  "hold",
  "read",
  "write",
  "battle",
  "done",
];

/** Liefert die Ansicht mit Beispieldaten für einen Referenzzustand. */
export function renderScreen({ id, screen, theme }: ScreenState): ReactNode {
  const variant = id.split("-")[1] ?? "";
  if (screen === "2a") {
    return (
      <LandingScreen
        animal="Fuchs"
        code=""
        teacherHref="/lehrer"
        enterHref="/lernen"
      />
    );
  }
  if (screen === "5a" || screen === "5b") {
    const phase = STUDENT_PHASES.find((p) => p === variant) ?? "station";
    return (
      <StudentDictationScreen {...DEMO_STUDENT} phase={phase} theme={theme} />
    );
  }
  if (screen === "5c" || screen === "5d") {
    const step: TeacherStep =
      variant === "options"
        ? "settings"
        : (TEACHER_STEPS.find((s) => s === variant) ?? "import");
    return (
      <TeacherDictationScreen
        {...DEMO_TEACHER}
        step={step}
        optionsOpen={variant === "options"}
        theme={theme}
        qr={<QrPlaceholder />}
        onEditSections={() => {}}
        onImportFile={() => {}}
        onMoveSection={() => {}}
      />
    );
  }
  return null;
}

const TEACHER_STEPS: readonly TeacherStep[] = [
  "import",
  "settings",
  "lobby",
  "live",
];

/** Platzhalter aus der Vorlage an Stelle des echten QR-Codes. */
function QrPlaceholder() {
  return (
    <span
      style={{
        display: "grid",
        placeItems: "center",
        width: "100%",
        height: "100%",
        color: "#211f1b",
        backgroundColor: "#fffdf7",
        font: "11px ui-monospace, Menlo, monospace",
        backgroundImage:
          "repeating-linear-gradient(0deg,#211f1b 0 6px,transparent 6px 12px),repeating-linear-gradient(90deg,#211f1b 0 6px,transparent 6px 12px)",
        backgroundBlendMode: "difference",
        opacity: 0.95,
      }}
    >
      <span
        style={{ padding: "4px 8px", borderRadius: 6, background: "#fffdf7" }}
      >
        QR-Code
      </span>
    </span>
  );
}

/** Referenzzustände, in denen die Vorlage die Systemtastatur andeutet. */
export function showsKeyboard({ id, screen }: ScreenState) {
  return screen === "5a" && /-(write|battle)/.test(id);
}
