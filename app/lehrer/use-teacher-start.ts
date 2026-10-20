"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { TeacherClass } from "../../src/domain/class-enrollment";
import type { TeacherContentPackage } from "../../src/domain/teacher-content-library";
import {
  activeClassIdsOf,
  contentKindOf,
  describeContent,
  describePrepared,
  describeRun,
  describeState,
  filterByClass,
  isArchived,
  resolveClassSelection,
  sortForLibrary,
  sortPrepared,
  UNASSIGNED,
} from "../../src/domain/teacher-content-summary";
import type { TeacherProfile } from "../../src/domain/teacher-workspace";
import {
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
  createTeacherProfileRepository,
} from "../../src/storage/teacher-class-settings";
import type {
  StartKind,
  StartOtherRow,
  StartRow,
  StartScreenProps,
  StartTab,
} from "../views/lehrer/start-screen";
import { writeLiveIntent } from "./live-intent";
import { TEACHER_DATA_EVENT } from "./prepared-settings";
import { useRunningRoom } from "./running-room";

export const PROTECTION_NOTICE =
  "Dieses Gerät ist die Schutzgrenze. Lehrkraftdaten bleiben lokal. Nutze deshalb ein geschütztes, nicht gemeinsam verwendetes Geräteprofil.";

const KINDS: readonly StartKind[] = ["text", "vocabulary", "math"];

type Loaded = {
  classes: TeacherClass[];
  packages: TeacherContentPackage[];
  profile: TeacherProfile | undefined;
};

/** „Klasse 7b“ → „7b“ für Chips, Reiter und Knöpfe. */
export function classShortName(name: string) {
  return name.replace(/^Klasse\s+/i, "").trim() || name;
}

const normalize = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase("de").replace(/\s+/g, " ").trim();

/** Archiv: zuletzt durchgeführt zuerst. */
function sortArchived(entries: readonly TeacherContentPackage[]) {
  return [...entries].sort(
    (left, right) =>
      Date.parse(right.lastUsedAt ?? "") - Date.parse(left.lastUsedAt ?? "") ||
      left.id.localeCompare(right.id),
  );
}

/**
 * Startseite des Lehrerbereichs (15a/15c/15d): lädt Klassen, Ablage und
 * Profil, bestimmt die gewählte Klasse (Adresse vor zuletzt genutzter Klasse)
 * und liefert die Props der reinen Ansicht. Ein Laufdiktat, das mehreren
 * Klassen gehört, bleibt ein Eintrag; „+ Auch für 7b“ ergänzt nur `classIds`.
 */
export function useTeacherStart(): {
  loading: boolean;
  selection: string;
  screen: StartScreenProps;
} {
  const router = useRouter();
  const requested = useSearchParams().get("klasse");
  const classRepository = useMemo(() => createTeacherClassRepository(), []);
  const library = useMemo(() => createTeacherContentLibraryRepository(), []);
  const profileRepository = useMemo(() => createTeacherProfileRepository(), []);
  const room = useRunningRoom();

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<StartTab>("prepared");
  const [source, setSource] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Gerade geholte Einträge bleiben in ihrer Quelle stehen („✓ Bei 7b“).
  const [justAdded, setJustAdded] = useState<Readonly<Record<string, string>>>(
    {},
  );

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
    window.addEventListener(TEACHER_DATA_EVENT, run);
    return () => {
      active = false;
      window.removeEventListener(TEACHER_DATA_EVENT, run);
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
        window.dispatchEvent(new Event(TEACHER_DATA_EVENT));
      })
      .catch(() => undefined);
  }, [loaded, profile, storedClass, wantedClass, classIds, profileRepository]);

  // Eine andere Klasse beginnt mit dem Reiter „Vorbereitet“ und eigener Quelle.
  const [shownSelection, setShownSelection] = useState(selection);
  if (shownSelection !== selection) {
    setShownSelection(selection);
    setTab("prepared");
    setSource(null);
    setQuery("");
    setJustAdded({});
  }

  const packages = useMemo(() => loaded?.packages ?? [], [loaded]);
  const activeIds = useMemo(() => new Set(classIds), [classIds]);
  const classes = useMemo(() => loaded?.classes ?? [], [loaded]);
  const selectedClass = classes.find(({ id }) => id === selection);
  const own = selectedClass ? classShortName(selectedClass.name) : undefined;

  const shortOf = (id: string) => {
    const course = classes.find((item) => item.id === id);
    return course ? classShortName(course.name) : id;
  };
  const toRow = (entry: TeacherContentPackage, meta: string): StartRow => {
    const ids = activeClassIdsOf(entry, activeIds).sort(
      (left, right) =>
        Number(right === selection) - Number(left === selection) ||
        classIds.indexOf(left) - classIds.indexOf(right),
    );
    return {
      id: entry.id,
      title: entry.title,
      kind: contentKindOf(entry),
      meta,
      classes: ids.map((id) => ({
        label: shortOf(id),
        own: id === selection,
      })),
      shared: selectedClass !== undefined && ids.length > 1,
    };
  };

  const mine = filterByClass(packages, selection, activeIds);
  const prepared = sortPrepared(mine.filter((entry) => !isArchived(entry)));
  const archived = sortArchived(mine.filter((entry) => isArchived(entry)));

  // „Aus anderen Klassen holen“: alles, was noch nicht bei der Klasse ist.
  const fetchable = (entry: TeacherContentPackage) =>
    !(entry.classIds ?? []).includes(selection) || entry.id in justAdded;
  const sources = selectedClass
    ? [
        { id: UNASSIGNED, label: "Nicht zugeordnet" },
        ...classes
          .filter(({ id }) => id !== selection)
          .map(({ id, name }) => ({ id, label: name })),
      ].map((item) => ({
        ...item,
        count: filterByClass(packages, item.id, activeIds).filter(
          (entry) => !(entry.classIds ?? []).includes(selection),
        ).length,
      }))
    : [];
  const chosenSource =
    source ??
    sources.find(({ count }) => count > 0)?.id ??
    sources[0]?.id ??
    UNASSIGNED;
  const needle = normalize(query);
  const otherEntries = sortForLibrary(
    needle
      ? packages.filter(
          (entry) =>
            fetchable(entry) && normalize(entry.title).includes(needle),
        )
      : packages.filter((entry) =>
          entry.id in justAdded
            ? justAdded[entry.id] === chosenSource
            : filterByClass([entry], chosenSource, activeIds).length > 0 &&
              fetchable(entry),
        ),
  );
  const otherRows: StartOtherRow[] = otherEntries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    kind: contentKindOf(entry),
    meta: `${describeContent(entry)} · ${describeState(entry)}`,
    added: (entry.classIds ?? []).includes(selection),
  }));

  // Quelle eines Eintrags, der über die Suche geholt wird.
  const sourceOf = (id: string) => {
    const found = packages.find((entry) => entry.id === id);
    if (!found) return undefined;
    return sources.find(
      ({ id: candidate }) =>
        filterByClass([found], candidate, activeIds).length > 0,
    )?.id;
  };
  const classParam = `klasse=${encodeURIComponent(selection)}`;
  const find = (id: string) => packages.find((entry) => entry.id === id);

  async function change(action: () => Promise<unknown>) {
    try {
      await action();
      const next = await library.list();
      setLoaded((current) =>
        current ? { ...current, packages: next } : current,
      );
      window.dispatchEvent(new Event(TEACHER_DATA_EVENT));
    } catch {
      setFailed(true);
    }
  }

  function setClasses(id: string, update: (ids: string[]) => string[]) {
    const entry = find(id);
    if (!entry) return;
    void change(() =>
      library.assignClasses(id, update([...(entry.classIds ?? [])])),
    );
  }

  const loading = !loaded;
  const emptyPrepared = loading
    ? "Wird geladen …"
    : selectedClass
      ? `Für ${own} ist nichts vorbereitet. Lege oben ein neues Laufdiktat an oder hole unten eines aus einer anderen Klasse.`
      : "Hier steht alles, was keiner Klasse zugeordnet ist. Im Moment ist das nichts.";
  const emptyArchive = loading
    ? "Wird geladen …"
    : "Noch nichts durchgeführt. Sobald eine Runde startet, steht das Laufdiktat hier.";
  const notice = failed
    ? "Die Ablage konnte nicht gelesen werden. Bitte lade die Seite neu."
    : loaded && !loaded.profile
      ? PROTECTION_NOTICE
      : undefined;

  return {
    loading,
    selection,
    screen: {
      eyebrow: `${selectedClass?.name ?? "Nicht zugeordnet"} · Start`,
      ...(own ? { classShort: own } : {}),
      ...(room ? { room } : {}),
      createHref: Object.fromEntries(
        KINDS.map((kind) => [kind, `/lehrer/live?neu=${kind}&${classParam}`]),
      ) as Record<StartKind, string>,
      tab,
      onTab: setTab,
      prepared: prepared.map((entry) =>
        toRow(entry, describePrepared(entry.prepared)),
      ),
      archived: archived.map((entry) => toRow(entry, describeRun(entry))),
      emptyText: { prepared: emptyPrepared, archive: emptyArchive },
      onStart: (id) => {
        const entry = find(id);
        if (!entry) return;
        // Die gewählte Klasse gilt für den Raum; „Nicht zugeordnet“ startet ohne.
        writeLiveIntent({
          contentId: id,
          mode: entry.prepared?.gameMode ?? "LAUFDIKTAT",
          classId: selectedClass ? selection : "",
        });
        router.push("/lehrer/live");
      },
      onEdit: (id) =>
        router.push(
          `/lehrer/live?inhalt=${encodeURIComponent(id)}&schritt=inhalt&${classParam}`,
        ),
      onDelete: (id, scope) =>
        scope === "class" && selectedClass
          ? setClasses(id, (ids) => ids.filter((value) => value !== selection))
          : void change(() => library.remove(id)),
      onPrepareAgain: (id) => void change(() => library.prepare(id)),
      ...(selectedClass
        ? {
            other: {
              sources,
              source: chosenSource,
              onSource: (id: string) => {
                setQuery("");
                setSource(id);
              },
              query,
              onQuery: setQuery,
              rows: otherRows,
              emptyText: loading
                ? "Wird geladen …"
                : needle
                  ? "Nichts gefunden."
                  : `Hier liegt nichts, was noch nicht bei ${own} ist.`,
              onAdd: (id: string) => {
                // Die Quelle bleibt stehen, auch wenn sie dadurch leer wird.
                setSource((current) => current ?? chosenSource);
                setJustAdded((current) => ({
                  ...current,
                  [id]: needle ? (sourceOf(id) ?? chosenSource) : chosenSource,
                }));
                setClasses(id, (ids) => [...ids, selection]);
              },
              onRemove: (id: string) =>
                setClasses(id, (ids) =>
                  ids.filter((value) => value !== selection),
                ),
            },
          }
        : {}),
      ...(notice ? { notice } : {}),
    },
  };
}
