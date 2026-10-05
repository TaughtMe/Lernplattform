"use client";

import { useState, type ReactNode } from "react";
import { DEMO_STUDENT, DEMO_TEACHER } from "../../views/laufdiktat/demo";
import {
  StudentDictationScreen,
  type StudentDictationPhase,
} from "../../views/laufdiktat/student-dictation-screen";
import {
  TeacherDictationScreen,
  type TeacherStep,
} from "../../views/laufdiktat/teacher-dictation-screen";
import {
  ClassAssignDialog,
  type AssignClass,
} from "../../views/lehrer/class-assign-dialog";
import {
  ContentLibraryScreen,
  type LibraryKind,
} from "../../views/lehrer/content-library-screen";
import {
  DEMO_CLASSES,
  DEMO_COUNT,
  DEMO_FOOTNOTE,
  DEMO_ITEMS,
} from "../../views/lehrer/demo";
import { StartSheet } from "../../views/lehrer/start-sheet";
import {
  TeacherFrame,
  type TeacherAreaItem,
} from "../../views/lehrer/teacher-frame";
import { MODES } from "../../views/laufdiktat/teacher-dictation-screen";
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
  if (screen === "3c" || screen === "3d") {
    return <TeacherDemo variant={variant} theme={theme} />;
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

const DEMO_AREAS: readonly TeacherAreaItem[] = [
  { id: "inhalte", label: "Inhalte", icon: "content", href: "#", active: true },
  { id: "raeume", label: "Räume", icon: "room", href: "#", active: false },
  {
    id: "auswertung",
    label: "Auswertung",
    icon: "chart",
    href: "#",
    active: false,
  },
];

/**
 * Lehrerbereich 3c/3d mit Beispieldaten. Die Zustände (Schublade, Overlay,
 * Hell/Dunkel) lassen sich im Katalog anklicken; `variant` wählt den Start:
 * `nav` (Schublade offen), `start` (Start-Overlay), `assign` (Klassen zuordnen).
 */
function TeacherDemo({ variant, theme }: { variant: string; theme: Theme }) {
  const [currentTheme, setTheme] = useState<Theme>(theme);
  const [navOpen, setNavOpen] = useState(variant === "nav");
  const [sheetOpen, setSheetOpen] = useState(variant === "start");
  const [assignOpen, setAssignOpen] = useState(variant === "assign");
  const [kind, setKind] = useState<LibraryKind>("text");
  const [mode, setMode] = useState("LAUFDIKTAT");
  const [checked, setChecked] = useState<readonly string[]>(["7b"]);
  const assignClasses: AssignClass[] = DEMO_CLASSES.map((item) => ({
    id: item.id,
    name: item.name,
    sub: item.sub,
    checked: checked.includes(item.id),
  }));
  return (
    <div data-theme={currentTheme} style={{ display: "contents" }}>
      <TeacherFrame
        eyebrow="Klasse 7b"
        title="Inhalte"
        theme={currentTheme}
        classes={DEMO_CLASSES}
        areas={DEMO_AREAS}
        addClass={{ href: "#" }}
        profile={{
          initials: "TB",
          name: "T. Bryson",
          sub: "Abmelden",
          href: "#",
        }}
        navOpen={navOpen}
        onNavOpen={() => setNavOpen(true)}
        onNavClose={() => setNavOpen(false)}
        onToggleTheme={() =>
          setTheme((value) => (value === "dark" ? "light" : "dark"))
        }
      >
        <ContentLibraryScreen
          kind={kind}
          items={DEMO_ITEMS}
          countLabel={DEMO_COUNT}
          footnote={DEMO_FOOTNOTE}
          onKind={setKind}
          onOpen={() => setSheetOpen(true)}
        />
        <StartSheet
          open={sheetOpen}
          title="Present Perfect · Unit 3"
          classLabel="Zugeordnet zu Klassen 7b, 9a"
          roomFor="Klasse 7b"
          classAction="ändern"
          modes={MODES}
          mode={mode}
          note="Der Raumcode erscheint in der Lobby · Code gilt 90 Minuten"
          onClose={() => setSheetOpen(false)}
          onMode={setMode}
          onClasses={() => {
            setSheetOpen(false);
            setAssignOpen(true);
          }}
          onStart={() => setSheetOpen(false)}
          onAllOptions={() => setSheetOpen(false)}
        />
        <ClassAssignDialog
          open={assignOpen}
          title="Present Perfect · Unit 3"
          classes={assignClasses}
          note="Ohne Häkchen steht der Inhalt unter „Nicht zugeordnet“."
          onToggle={(id) =>
            setChecked((value) =>
              value.includes(id)
                ? value.filter((entry) => entry !== id)
                : [...value, id],
            )
          }
          onSave={() => setAssignOpen(false)}
          onClose={() => setAssignOpen(false)}
        />
      </TeacherFrame>
    </div>
  );
}
