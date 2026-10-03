"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { TeacherContentPackage } from "../../src/domain/teacher-content-library";
import {
  contentKindOf,
  describeContent,
  filterByClass,
  resolveClassSelection,
  shortDate,
  sortForLibrary,
  UNASSIGNED,
} from "../../src/domain/teacher-content-summary";
import type { TeacherClass } from "../../src/domain/class-enrollment";
import type { TeacherProfile } from "../../src/domain/teacher-workspace";
import {
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
  createTeacherProfileRepository,
} from "../../src/storage/teacher-class-settings";
import type {
  ContentLibraryScreenProps,
  LibraryKind,
} from "../views/lehrer/content-library-screen";
import type { ClassAssignDialogProps } from "../views/lehrer/class-assign-dialog";
import type { StartSheetProps } from "../views/lehrer/start-sheet";
import {
  MODES,
  type DictationMode,
} from "../views/laufdiktat/teacher-dictation-screen";
import { readTeacherLiveRoom } from "../../src/integrations/laufdiktat/room-api";
import { ROOM_JOIN_WINDOW_MINUTES } from "../../src/integrations/laufdiktat/room-limits";
import { writeLiveIntent } from "./live-intent";

/** Breite, ab der die Kacheln direkt zum Editor führen (wie der Rahmen). */
const DESKTOP_QUERY = "(min-width: 900px)";

/** Ereignis für Leiste und andere Ansichten, dass sich Daten geändert haben. */
const DATA_EVENT = "teacher-data-changed";

const EDITOR_PARAM: Record<LibraryKind, string> = {
  text: "text",
  math: "math",
  vocabulary: "vocabulary",
};

export const PROTECTION_NOTICE =
  "Dieses Gerät ist die Schutzgrenze. Lehrkraftdaten bleiben lokal. Nutze deshalb ein geschütztes, nicht gemeinsam verwendetes Geräteprofil.";

function countLabel(count: number) {
  return `${count} ${count === 1 ? "Inhalt" : "Inhalte"}`;
}

function isDesktop() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(DESKTOP_QUERY).matches
  );
}

type Loaded = {
  classes: TeacherClass[];
  packages: TeacherContentPackage[];
  profile: TeacherProfile | undefined;
};

/**
 * Ablage der Lehrkraft für die Seite „Inhalte“: lädt Klassen, Inhalte und
 * Profil, bestimmt die gewählte Klasse (Adresse vor zuletzt genutzter Klasse,
 * Rückfall nach E4) und liefert die Props der reinen Ansichten.
 */
export function useContentLibrary(): {
  loading: boolean;
  selection: string;
  screen: ContentLibraryScreenProps;
  assign: ClassAssignDialogProps;
  start: StartSheetProps;
} {
  const router = useRouter();
  const requested = useSearchParams().get("klasse");
  const classRepository = useMemo(() => createTeacherClassRepository(), []);
  const library = useMemo(() => createTeacherContentLibraryRepository(), []);
  const profileRepository = useMemo(() => createTeacherProfileRepository(), []);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<LibraryKind>("text");
  const [assignId, setAssignId] = useState<string | null>(null);
  const [assignChecked, setAssignChecked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [startId, setStartId] = useState<string | null>(null);
  const [startMode, setStartMode] = useState<DictationMode>("LAUFDIKTAT");

  async function reload() {
    const [classes, packages, profile] = await Promise.all([
      classRepository.list(),
      library.list(),
      profileRepository.get(),
    ]);
    setLoaded({ classes, packages, profile });
    setFailed(false);
  }

  useEffect(() => {
    let active = true;
    const run = () =>
      void Promise.all([
        classRepository.list(),
        library.list(),
        profileRepository.get(),
      ])
        .then(([classes, packages, profile]) => {
          if (!active) return;
          setLoaded({ classes, packages, profile });
          setFailed(false);
        })
        .catch(() => active && setFailed(true));
    run();
    window.addEventListener(DATA_EVENT, run);
    return () => {
      active = false;
      window.removeEventListener(DATA_EVENT, run);
    };
  }, [classRepository, library, profileRepository]);

  const classIds = useMemo(
    () => (loaded?.classes ?? []).map(({ id }) => id),
    [loaded],
  );
  const selection = resolveClassSelection({
    requested,
    lastClassId: loaded?.profile?.lastLiveClassId,
    classIds,
  });

  // Die gewählte Klasse ist zugleich die Klasse des nächsten Raums. Sie wird
  // im Profil gemerkt, aber nur, wenn es eines gibt (sonst gilt die Adresse).
  const profile = loaded?.profile;
  const storedClass = profile?.lastLiveClassId;
  const wantedClass = selection === UNASSIGNED ? undefined : selection;
  useEffect(() => {
    if (!loaded || !profile || storedClass === wantedClass) return;
    // „Nicht zugeordnet“ ohne Klassen ändert nichts am Profil.
    if (wantedClass === undefined && classIds.length === 0) return;
    const next: TeacherProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    if (wantedClass) next.lastLiveClassId = wantedClass;
    else delete next.lastLiveClassId;
    void profileRepository
      .put(next)
      .then(() => {
        setLoaded((current) =>
          current ? { ...current, profile: next } : current,
        );
        window.dispatchEvent(new Event(DATA_EVENT));
      })
      .catch(() => undefined);
  }, [loaded, profile, storedClass, wantedClass, classIds, profileRepository]);

  const activeIds = useMemo(() => new Set(classIds), [classIds]);
  const visible = useMemo(
    () =>
      sortForLibrary(
        filterByClass(loaded?.packages ?? [], selection, activeIds),
      ),
    [loaded, selection, activeIds],
  );
  const selectedClass = loaded?.classes.find(({ id }) => id === selection);

  // Die gewählte Klasse reist mit: Neue Inhalte gehören dazu, und sie ist die
  // Klasse des nächsten Raums, auch wenn noch kein Lehrerprofil existiert.
  const classParam = `klasse=${encodeURIComponent(selection)}`;
  // Solange die Ablage lädt, ist die Klasse noch nicht bekannt: nichts auslösen.
  const edit = (id: string) =>
    loaded &&
    router.push(
      `/lehrer/live?inhalt=${encodeURIComponent(id)}&schritt=inhalt&${classParam}`,
    );
  const create = (value: LibraryKind) =>
    loaded &&
    router.push(`/lehrer/live?neu=${EDITOR_PARAM[value]}&${classParam}`);

  const assignTarget = loaded?.packages.find(({ id }) => id === assignId);
  const startTarget = loaded?.packages.find(({ id }) => id === startId);

  function openAssign(id: string) {
    const entry = loaded?.packages.find((item) => item.id === id);
    setAssignChecked(
      (entry?.classIds ?? []).filter((value) => activeIds.has(value)),
    );
    setAssignId(id);
  }

  const startClassNames = (startTarget?.classIds ?? [])
    .map((id) => loaded?.classes.find((course) => course.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .map((name) => name.replace(/^Klasse\s+/i, ""));

  async function saveAssignment() {
    if (!assignId) return;
    setBusy(true);
    try {
      await library.assignClasses(assignId, assignChecked);
      setAssignId(null);
      await reload();
      window.dispatchEvent(new Event(DATA_EVENT));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const unassignedView = selection === UNASSIGNED;
  const emptyText = !loaded
    ? "Ablage wird geladen …"
    : unassignedView
      ? "Alles ist einer Klasse zugeordnet."
      : "Für diese Klasse ist noch nichts abgelegt. Lege oben etwas Neues an.";
  const notice = failed
    ? "Die Ablage konnte nicht gelesen werden. Bitte lade die Seite neu."
    : loaded && !loaded.profile
      ? PROTECTION_NOTICE
      : undefined;

  return {
    loading: !loaded,
    selection,
    screen: {
      kind,
      items: visible.map((entry) => ({
        id: entry.id,
        title: entry.title,
        kind: contentKindOf(entry),
        meta: describeContent(entry),
        used: shortDate(entry),
      })),
      countLabel: countLabel(visible.length),
      ...(selectedClass ? { createFor: selectedClass.name } : {}),
      emptyText,
      ...(notice ? { notice } : {}),
      // Am Desktop führt die Kachel direkt zum Editor, mobil wählt sie nur
      // die Art und „Weiter“ öffnet den Editor.
      onKind: (value) => (isDesktop() ? create(value) : setKind(value)),
      onCreate: create,
      onOpen: setStartId,
      onEdit: edit,
      ...(unassignedView
        ? {
            onAssign: (id: string) => {
              const entry = loaded?.packages.find((item) => item.id === id);
              setAssignChecked(
                (entry?.classIds ?? []).filter((value) => activeIds.has(value)),
              );
              setAssignId(id);
            },
          }
        : {}),
      onOpenRoom: () => router.push("/lehrer/live"),
    },
    start: {
      open: startTarget !== undefined,
      title: startTarget?.title ?? "",
      classLabel:
        startClassNames.length > 0
          ? `Zugeordnet zu ${startClassNames.length === 1 ? "Klasse" : "Klassen"} ${startClassNames.join(", ")}`
          : "Nicht zugeordnet",
      roomFor: selectedClass?.name ?? null,
      classAction: startClassNames.length > 0 ? "ändern" : "zuordnen",
      modes: MODES,
      mode: startMode,
      note: `Der Raumcode erscheint in der Lobby · Code gilt ${ROOM_JOIN_WINDOW_MINUTES} Minuten`,
      ...(readTeacherLiveRoom() ? { roomOpen: { href: "/lehrer/live" } } : {}),
      onClose: () => setStartId(null),
      onMode: (id) => {
        const mode = MODES.find((entry) => entry.id === id);
        if (mode) setStartMode(mode.id);
      },
      onClasses: () => {
        if (!startId) return;
        const id = startId;
        setStartId(null);
        openAssign(id);
      },
      onStart: () => {
        if (!startId) return;
        // Die gewählte Klasse gilt für den Raum; „Nicht zugeordnet“ startet ohne.
        const classId = selection === UNASSIGNED ? "" : selection;
        writeLiveIntent({ contentId: startId, mode: startMode, classId });
        router.push("/lehrer/live");
      },
      onAllOptions: () => {
        if (!startId) return;
        router.push(
          `/lehrer/live?inhalt=${encodeURIComponent(startId)}&schritt=einstellungen&modus=${startMode}&${classParam}`,
        );
      },
    },
    assign: {
      open: assignTarget !== undefined,
      title: assignTarget?.title ?? "",
      classes: (loaded?.classes ?? []).map((course) => ({
        id: course.id,
        name: course.name,
        sub: course.schoolYear,
        checked: assignChecked.includes(course.id),
      })),
      note: "Ohne Häkchen steht der Inhalt unter „Nicht zugeordnet“.",
      emptyText: "Lege zuerst unter „Verwalten → Klassen“ eine Klasse an.",
      busy,
      onToggle: (id) =>
        setAssignChecked((current) =>
          current.includes(id)
            ? current.filter((value) => value !== id)
            : [...current, id],
        ),
      onSave: () => void saveAssignment(),
      onClose: () => setAssignId(null),
    },
  };
}
