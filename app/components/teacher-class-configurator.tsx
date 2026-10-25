"use client";

import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { EnrollmentQr } from "./enrollment-qr";
import { useEffect, useMemo, useState } from "react";
import { notifyTeacherClassesChanged } from "../ui/shell/teacher-classes";
import { Button } from "../ui/primitives";
import {
  createClassRemovalLink,
  createEnrollmentCode,
  createEnrollmentLink,
  type ClassMember,
  type TeacherClass,
} from "../../src/domain/class-enrollment";
import {
  CLASS_MODULE_LABELS,
  type ClassModule,
} from "../../src/domain/class-workspace";
import {
  createTeacherClassRepository,
  createTeacherProfileRepository,
  toggleClassModule,
} from "../../src/storage/teacher-class-settings";
import { cx } from "../views/parts/parts";
import { manageStyles as m, ManagePage } from "../views/lehrer/manage-parts";
import {
  ClassActions,
  ClassAreas,
  ClassDetail,
  ClassesLayout,
  ClassList,
  ClassSection,
  ClassTabs,
  NewClassRow,
  StudentList,
  type ClassTab,
  type NewClassValues,
} from "../views/lehrer/classes-screen";

const modules: ClassModule[] = [
  "vocabulary",
  "german",
  "mathematics",
  "typing",
  "running-dictation",
];

const DEFAULT_SCHOOL_YEAR = "2026/27";

const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");

const changed = () => {
  notifyTeacherClassesChanged();
  window.dispatchEvent(new Event("teacher-data-changed"));
};

/**
 * Klassen und Schüler (Lehrerbereich v2, 17c). Neue Klassen entstehen in einer
 * aufklappbaren Zeile, das Archiv ist ein eigener Reiter. `?klasse=<id>`
 * wählt eine Klasse vor (aus der Seitenleiste).
 */
export function TeacherClassConfigurator() {
  const repository = useMemo(() => createTeacherClassRepository(), []);
  const profileRepository = useMemo(() => createTeacherProfileRepository(), []);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [archivedClasses, setArchivedClasses] = useState<TeacherClass[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<ClassTab>("active");
  const [selectedId, setSelectedId] = useState("");
  // Schüler der zuletzt geladenen Klasse; für eine andere Klasse leer.
  const [loadedMembers, setLoadedMembers] = useState<{
    classId: string;
    list: ClassMember[];
  }>({ classId: "", list: [] });
  const [teacherName, setTeacherName] = useState("");
  const [creating, setCreating] = useState(false);
  const [shown, setShown] = useState<ClassMember>();
  const [showQrSheet, setShowQrSheet] = useState(false);
  const [removalShown, setRemovalShown] = useState(false);
  // Löschen mit zwei Bestätigungen: erst fragen, dann endgültig bestätigen.
  const [pendingDelete, setPendingDelete] = useState<{
    course: TeacherClass;
    step: 1 | 2;
  }>();
  const [message, setMessage] = useState("");
  const list = tab === "active" ? classes : archivedClasses;
  const selected = list.find((course) => course.id === selectedId) ?? list[0];
  const archived = tab === "archive";
  const appOrigin = typeof window === "undefined" ? "" : window.location.origin;
  const members =
    loadedMembers.classId === (selected?.id ?? "") ? loadedMembers.list : [];
  const setMembers = (update: (current: ClassMember[]) => ClassMember[]) =>
    setLoadedMembers((current) => ({
      classId: current.classId,
      list: update(current.list),
    }));

  useEffect(() => {
    profileRepository
      .get()
      .then((profile) => {
        if (profile?.displayName) {
          setTeacherName((current) => current || profile.displayName);
        }
      })
      .catch(() => {
        // Klassen lassen sich auch ohne zuvor gespeichertes Profil anlegen.
      });
  }, [profileRepository]);

  // ?klasse=<id> wählt eine Klasse aus der Seitenleiste; die Leiste bleibt
  // beim Wechsel stehen, deshalb folgt die Auswahl der Adresse.
  const requested = useSearchParams().get("klasse");
  useEffect(() => {
    Promise.all([repository.list(), repository.listArchived()])
      .then(async ([items, archive]) => {
        setClasses(items);
        setArchivedClasses(archive);
        const all = [...items, ...archive];
        const sizes = await Promise.all(
          all.map(async ({ id }) => [
            id,
            (await repository.listMembers(id)).length,
          ]),
        );
        setCounts(Object.fromEntries(sizes));
        const initial = items.find(({ id }) => id === requested) ?? items[0];
        if (initial) {
          setTab("active");
          setSelectedId(initial.id);
        }
        // Ohne Klasse steht die Zeile zum Anlegen gleich offen.
        if (items.length === 0) setCreating(true);
      })
      .catch(() => setMessage("Die Klassen konnten nicht geladen werden."))
      .finally(() => setLoaded(true));
  }, [repository, requested]);

  // Ältere Klassen erhalten ihren Stempel beim ersten Öffnen.
  const selectedHasSeal = Boolean(selected?.seal);
  const currentId = selected?.id ?? "";
  useEffect(() => {
    if (!currentId || archived || selectedHasSeal) return;
    let isCurrent = true;
    repository
      .ensureSeal(currentId)
      .then((seal) => {
        if (!isCurrent || !seal) return;
        setClasses((current) =>
          current.map((course) =>
            course.id === currentId ? { ...course, seal } : course,
          ),
        );
      })
      .catch(() =>
        setMessage("Der Klassenstempel konnte nicht erstellt werden."),
      );
    return () => {
      isCurrent = false;
    };
  }, [repository, archived, selectedHasSeal, currentId]);

  useEffect(() => {
    if (!currentId) return;
    let isCurrent = true;
    repository
      .listMembers(currentId)
      .then((items) => {
        if (isCurrent) setLoadedMembers({ classId: currentId, list: items });
      })
      .catch(() => {
        if (isCurrent) {
          setMessage("Die Schülerliste konnte nicht geladen werden.");
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [repository, currentId]);

  function select(id: string) {
    // Dieselbe Klasse erneut zu wählen lädt nichts neu.
    if (id === currentId) return;
    setSelectedId(id);
    setShown(undefined);
    setRemovalShown(false);
    setPendingDelete(undefined);
  }

  function switchTab(next: ClassTab) {
    setTab(next);
    setSelectedId("");
    setShown(undefined);
    setRemovalShown(false);
    setPendingDelete(undefined);
  }

  async function createClass(values: NewClassValues) {
    const now = new Date().toISOString();
    const course: TeacherClass = {
      id: crypto.randomUUID(),
      name: values.name.trim(),
      teacherName: values.teacherName.trim(),
      schoolYear: values.schoolYear.trim(),
      enabledModules: modules,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await repository.put(course);
    } catch {
      setMessage("Die Klasse konnte nicht gespeichert werden.");
      return;
    }
    // Jede Klasse bekommt ihren Klassenstempel gleich beim Anlegen. Scheitert
    // das, ist die Klasse trotzdem gespeichert; der Stempel wird beim ersten
    // Öffnen nachgeholt.
    try {
      const seal = await repository.ensureSeal(course.id);
      if (seal) course.seal = seal;
    } catch {
      // siehe oben
    }
    setClasses((current) => [...current, course]);
    setCounts((current) => ({ ...current, [course.id]: 0 }));
    setTab("active");
    setSelectedId(course.id);
    setShown(undefined);
    setCreating(false);
    setMessage("Klasse wurde lokal angelegt.");
    changed();
  }

  async function addStudent(name: string) {
    if (!selected) return;
    const member: ClassMember = {
      id: crypto.randomUUID(),
      classId: selected.id,
      displayName: name,
      enrollmentToken: token(),
      createdAt: new Date().toISOString(),
    };
    try {
      await repository.putMember(member);
      setMembers((current) => [...current, member]);
      setCounts((current) => ({
        ...current,
        [selected.id]: (current[selected.id] ?? 0) + 1,
      }));
      setShown(undefined);
      setMessage("Schüler wurde lokal angelegt.");
      changed();
    } catch {
      setMessage("Der Schüler konnte nicht gespeichert werden.");
    }
  }

  async function removeStudent(member: ClassMember) {
    await repository.removeMember(member.id);
    setMembers((current) => current.filter(({ id }) => id !== member.id));
    setCounts((current) => ({
      ...current,
      [member.classId]: Math.max(0, (current[member.classId] ?? 1) - 1),
    }));
    if (shown?.id === member.id) setShown(undefined);
    setMessage(`„${member.displayName}“ wurde aus der Klasse entfernt.`);
    changed();
  }

  async function toggleWritingRelief(member: ClassMember) {
    const enabled = !member.writingRelief;
    try {
      const updated = await repository.setWritingRelief(member.id, enabled);
      // Der Stempel kann dabei neu entstanden sein: Klasse neu laden.
      setClasses(await repository.list());
      setMembers((current) =>
        current.map((entry) => (entry.id === member.id ? updated : entry)),
      );
      setShown(updated);
      setMessage(
        enabled
          ? `Schreiberleichterung für „${member.displayName}“ ist gesetzt. Das Kind muss den neuen QR-Code scannen.`
          : `Schreiberleichterung für „${member.displayName}“ ist entzogen. Das Kind muss den neuen QR-Code scannen.`,
      );
      window.dispatchEvent(new Event("teacher-data-changed"));
    } catch (cause) {
      const detail =
        window.isSecureContext === false
          ? " Die Seite muss über HTTPS oder localhost geöffnet sein."
          : cause instanceof Error && cause.message
            ? ` (${cause.message})`
            : "";
      setMessage(
        `Die Schreiberleichterung konnte nicht gespeichert werden.${detail}`,
      );
    }
  }

  async function toggleModule(module: ClassModule) {
    if (!selected) return;
    const enabledModules = toggleClassModule(selected.enabledModules, module);
    if (enabledModules.length === selected.enabledModules.length) {
      setMessage("Mindestens ein Bereich bleibt für die Klasse an.");
      return;
    }
    const updated = {
      ...selected,
      enabledModules,
      updatedAt: new Date().toISOString(),
    };
    try {
      await repository.put(updated);
      setClasses((current) =>
        current.map((course) => (course.id === updated.id ? updated : course)),
      );
      setMessage(
        "Die Bereiche gelten für QR-Codes, die die Kinder ab jetzt scannen.",
      );
      changed();
    } catch {
      setMessage("Die Bereiche konnten nicht gespeichert werden.");
    }
  }

  async function archiveSelectedClass() {
    if (!selected) return;
    await repository.archiveClass(selected.id);
    setClasses((current) => current.filter(({ id }) => id !== selected.id));
    setArchivedClasses((current) => [
      { ...selected, archivedAt: new Date().toISOString() },
      ...current,
    ]);
    setSelectedId("");
    setShown(undefined);
    setMessage(
      `„${selected.name}“ wurde archiviert. Schüler und Zuteilungen bleiben für eine Reaktivierung erhalten.`,
    );
    changed();
  }

  async function restoreClass(course: TeacherClass) {
    await repository.restoreClass(course.id);
    setArchivedClasses((current) =>
      current.filter(({ id }) => id !== course.id),
    );
    setClasses((current) => [...current, { ...course, archivedAt: null }]);
    setTab("active");
    setSelectedId(course.id);
    setRemovalShown(false);
    setMessage(`„${course.name}“ wurde wieder aktiviert.`);
    changed();
  }

  async function deleteClass(course: TeacherClass) {
    await repository.removeClass(course.id);
    setClasses((current) => current.filter(({ id }) => id !== course.id));
    setArchivedClasses((current) =>
      current.filter(({ id }) => id !== course.id),
    );
    setSelectedId("");
    setShown(undefined);
    setPendingDelete(undefined);
    setMessage(`„${course.name}“ wurde gelöscht.`);
    changed();
  }

  if (showQrSheet && selected) {
    return (
      <div className={cx(m.page, "ui")}>
        <section
          className="ui-stack ui-qr-sheet"
          aria-labelledby="teacher-qr-sheet-title"
        >
          <div className="ui-between ui-wrap ui-print-hidden">
            <div className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
              <p className="ui-eyebrow">Einschreibung</p>
              <h1 id="teacher-qr-sheet-title" className="ui-h-page">
                QR-Bogen für {selected.name}
              </h1>
              <p className="ui-small ui-muted">
                {members.length} Schüler · {selected.schoolYear}
              </p>
            </div>
            <div className="ui-row ui-wrap">
              <Button variant="ghost" onClick={() => setShowQrSheet(false)}>
                Zurück zur Klasse
              </Button>
              <Button onClick={() => window.print()}>
                Drucken oder als PDF speichern
              </Button>
            </div>
          </div>
          <div className="ui-qr-sheet__grid">
            {members.map((member) => (
              <figure key={member.id} className="ui-qr-sheet__card">
                <EnrollmentQr
                  variant="sheet"
                  value={createEnrollmentLink(
                    appOrigin,
                    createEnrollmentCode(selected, member),
                  )}
                  label={`Einschreibungs-QR-Code für ${member.displayName}`}
                />
                <figcaption>{member.displayName}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const code =
    selected && shown && !archived ? createEnrollmentCode(selected, shown) : "";
  const qrValue =
    code && appOrigin ? createEnrollmentLink(appOrigin, code) : "";
  const relief = members.filter((member) => member.writingRelief).length;
  const removalQrValue =
    selected && archived && appOrigin
      ? createClassRemovalLink(appOrigin, selected.id)
      : "";

  const deleteConfirmation = pendingDelete ? (
    <ClassSection>
      <div
        className={cx(m.notice, m.noticeBad)}
        role="alertdialog"
        aria-labelledby="class-delete-title"
        aria-describedby="class-delete-text"
      >
        <strong id="class-delete-title">
          {pendingDelete.step === 1
            ? `Klasse „${pendingDelete.course.name}“ löschen?`
            : "Wirklich endgültig löschen?"}
        </strong>
        <p id="class-delete-text" className={m.noticeText}>
          {pendingDelete.step === 1
            ? "Schüler, Zuteilungen und eingegangene Abgaben dieser Klasse werden auf diesem Gerät entfernt. Archivieren behält alles für später."
            : "Das lässt sich nicht rückgängig machen. Auf Schülergeräten bleibt die Klasse, bis sie dort mit einem Entfernungscode oder von Hand entfernt wird."}
        </p>
        <div className={m.actions}>
          <button
            type="button"
            className={m.soft}
            onClick={() => setPendingDelete(undefined)}
          >
            Abbrechen
          </button>
          {pendingDelete.step === 1 ? (
            <button
              type="button"
              className={cx(m.soft, m.danger)}
              onClick={() =>
                setPendingDelete({ course: pendingDelete.course, step: 2 })
              }
            >
              Ja, löschen
            </button>
          ) : (
            <button
              type="button"
              className={cx(m.soft, m.danger)}
              onClick={() => void deleteClass(pendingDelete.course)}
            >
              Endgültig löschen
            </button>
          )}
        </div>
      </div>
    </ClassSection>
  ) : null;

  return (
    <ManagePage
      title="Klassen und Schüler"
      lead="Namen und Zuordnungen bleiben ausschließlich auf diesem Lehrergerät."
      action={
        <button
          type="button"
          className={m.green}
          aria-expanded={creating}
          onClick={() => setCreating((open) => !open)}
        >
          + Neue Klasse
        </button>
      }
    >
      {creating ? (
        <NewClassRow
          initial={{
            name: "",
            teacherName,
            schoolYear: DEFAULT_SCHOOL_YEAR,
          }}
          onCancel={() => setCreating(false)}
          onCreate={(values) => void createClass(values)}
        />
      ) : null}
      {message ? (
        <p className={m.notice} role="status">
          {message}
        </p>
      ) : null}
      <ClassesLayout
        side={
          <>
            <ClassTabs
              tab={tab}
              counts={{
                active: classes.length,
                archive: archivedClasses.length,
              }}
              onTab={switchTab}
            />
            <ClassList
              items={list.map((course) => ({
                id: course.id,
                name: course.name,
                sub: `${counts[course.id] ?? 0} Schüler · ${course.schoolYear}`,
                label: `${course.name}, ${course.schoolYear}`,
              }))}
              selectedId={currentId}
              empty={
                !loaded
                  ? "Wird geladen …"
                  : archived
                    ? "Noch keine archivierte Klasse."
                    : "Noch keine Klasse. Lege oben mit „+ Neue Klasse“ deine erste an."
              }
              onPick={select}
            />
          </>
        }
      >
        {selected ? (
          <ClassDetail
            title={selected.name}
            meta={`${selected.teacherName} · ${selected.schoolYear}${
              archived ? " · archiviert" : ""
            }`}
            actions={
              <ClassActions
                name={selected.name}
                archived={archived}
                canPrint={members.length > 0}
                onPrint={() => setShowQrSheet(true)}
                onArchive={() =>
                  void (archived
                    ? restoreClass(selected)
                    : archiveSelectedClass())
                }
                onDelete={() => setPendingDelete({ course: selected, step: 1 })}
                extra={
                  archived ? (
                    <button
                      type="button"
                      className={m.soft}
                      aria-expanded={removalShown}
                      onClick={() => setRemovalShown((open) => !open)}
                    >
                      Entfernungscode
                    </button>
                  ) : null
                }
              />
            }
          >
            {pendingDelete?.course.id === selected.id
              ? deleteConfirmation
              : null}
            {archived && removalShown && removalQrValue ? (
              <ClassSection>
                <div className={m.actions}>
                  <span
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      background: "#fff",
                      lineHeight: 0,
                    }}
                  >
                    <QRCodeSVG
                      value={removalQrValue}
                      size={160}
                      role="img"
                      aria-label={`Entfernungs-QR-Code für ${selected.name}`}
                    />
                  </span>
                  <span className={m.hint} style={{ flex: "1 1 14em" }}>
                    <strong>Auf Schülergeräten entfernen.</strong> Schüler
                    scannen diesen QR-Code oder fügen den Code unter „Klasse“
                    ein. Der persönliche Lernstand bleibt erhalten.
                  </span>
                </div>
              </ClassSection>
            ) : null}
            <ClassAreas
              disabled={archived}
              areas={modules.map((module) => ({
                id: module,
                label: CLASS_MODULE_LABELS[module],
                on: selected.enabledModules.includes(module),
              }))}
              onToggle={(id) => void toggleModule(id as ClassModule)}
            />
            <StudentList
              students={members.map((member) => ({
                id: member.id,
                name: member.displayName,
                writingRelief: member.writingRelief === true,
              }))}
              hint={relief > 0 ? `${relief} mit Schreiberleichterung` : ""}
              shownId={shown?.id}
              readOnly={archived}
              qr={
                qrValue ? (
                  // Gleiche Größe mit und ohne Freigabe (B-008).
                  <EnrollmentQr
                    variant="single"
                    value={qrValue}
                    label={`Einschreibungs-QR-Code für ${shown?.displayName ?? ""}`}
                  />
                ) : null
              }
              onAdd={(name) => void addStudent(name)}
              onToggleQr={(id) =>
                setShown((current) =>
                  current?.id === id
                    ? undefined
                    : members.find((member) => member.id === id),
                )
              }
              onRelief={(id) => {
                const member = members.find((entry) => entry.id === id);
                if (member) void toggleWritingRelief(member);
              }}
              onRemove={(id) => {
                const member = members.find((entry) => entry.id === id);
                if (member) void removeStudent(member);
              }}
            />
          </ClassDetail>
        ) : null}
      </ClassesLayout>
    </ManagePage>
  );
}
