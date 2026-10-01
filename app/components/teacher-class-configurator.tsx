"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { notifyTeacherClassesChanged } from "../ui/shell/teacher-classes";
import { QRCodeSVG } from "qrcode.react";
import { Icon } from "../ui/icons";
import { Button, EmptyState, Pill } from "../ui/primitives";
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
} from "../../src/storage/teacher-class-settings";

const modules: ClassModule[] = [
  "vocabulary",
  "german",
  "mathematics",
  "typing",
  "running-dictation",
];

const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");

export function TeacherClassConfigurator() {
  const repository = useMemo(() => createTeacherClassRepository(), []);
  const profileRepository = useMemo(() => createTeacherProfileRepository(), []);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [archivedClasses, setArchivedClasses] = useState<TeacherClass[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [name, setName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [schoolYear, setSchoolYear] = useState("2026/27");
  const [studentName, setStudentName] = useState("");
  const [shown, setShown] = useState<ClassMember>();
  const [showQrSheet, setShowQrSheet] = useState(false);
  const [removalShown, setRemovalShown] = useState<TeacherClass>();
  // Löschen mit zwei Bestätigungen: erst fragen, dann endgültig bestätigen.
  const [pendingDelete, setPendingDelete] = useState<{
    course: TeacherClass;
    step: 1 | 2;
  }>();
  const [message, setMessage] = useState("");
  const selected = classes.find((course) => course.id === selectedId);
  const appOrigin = typeof window === "undefined" ? "" : window.location.origin;

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
      .then(([items, archived]) => {
        setClasses(items);
        setArchivedClasses(archived);
        const initial = items.find(({ id }) => id === requested) ?? items[0];
        if (initial) {
          setSelectedId((current) => {
            if (current !== initial.id) {
              setMembers([]);
              setShown(undefined);
            }
            return initial.id;
          });
        }
      })
      .catch(() => setMessage("Die Klassen konnten nicht geladen werden."));
  }, [repository, requested]);

  useEffect(() => {
    if (!selectedId) return;
    let isCurrent = true;
    repository
      .listMembers(selectedId)
      .then((items) => {
        if (isCurrent) setMembers(items);
      })
      .catch(() => {
        if (isCurrent) {
          setMessage("Die Schülerliste konnte nicht geladen werden.");
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [repository, selectedId]);

  async function createClass(event: FormEvent) {
    event.preventDefault();
    const now = new Date().toISOString();
    const course: TeacherClass = {
      id: crypto.randomUUID(),
      name,
      teacherName,
      schoolYear,
      enabledModules: modules,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await repository.put(course);
      setClasses((current) => [...current, course]);
      notifyTeacherClassesChanged();
      setSelectedId(course.id);
      setMembers([]);
      setShown(undefined);
      setName("");
      setMessage("Klasse wurde lokal angelegt.");
      window.dispatchEvent(new Event("teacher-data-changed"));
    } catch {
      setMessage("Die Klasse konnte nicht gespeichert werden.");
    }
  }

  async function addStudent(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const member: ClassMember = {
      id: crypto.randomUUID(),
      classId: selected.id,
      displayName: studentName,
      enrollmentToken: token(),
      createdAt: new Date().toISOString(),
    };
    try {
      await repository.putMember(member);
      setMembers((current) => [...current, member]);
      notifyTeacherClassesChanged();
      setShown(undefined);
      setStudentName("");
      setMessage("Schüler wurde lokal angelegt.");
      window.dispatchEvent(new Event("teacher-data-changed"));
    } catch {
      setMessage("Der Schüler konnte nicht gespeichert werden.");
    }
  }

  const code = selected && shown ? createEnrollmentCode(selected, shown) : "";
  const qrValue =
    code && appOrigin ? createEnrollmentLink(appOrigin, code) : "";

  async function removeStudent(member: ClassMember) {
    await repository.removeMember(member.id);
    setMembers((current) => current.filter(({ id }) => id !== member.id));
    notifyTeacherClassesChanged();
    if (shown?.id === member.id) setShown(undefined);
    setMessage(`„${member.displayName}“ wurde aus der Klasse entfernt.`);
    window.dispatchEvent(new Event("teacher-data-changed"));
  }

  async function archiveSelectedClass() {
    if (!selected) return;
    await repository.archiveClass(selected.id);
    const remaining = classes.filter(({ id }) => id !== selected.id);
    setClasses(remaining);
    notifyTeacherClassesChanged();
    setArchivedClasses((current) => [
      { ...selected, archivedAt: new Date().toISOString() },
      ...current,
    ]);
    setSelectedId(remaining[0]?.id ?? "");
    setMembers([]);
    setShown(undefined);
    setMessage(
      `„${selected.name}“ wurde archiviert. Schüler und Zuteilungen bleiben für eine Reaktivierung erhalten.`,
    );
    window.dispatchEvent(new Event("teacher-data-changed"));
  }

  async function deleteClass(course: TeacherClass) {
    await repository.removeClass(course.id);
    const remaining = classes.filter(({ id }) => id !== course.id);
    setClasses(remaining);
    setArchivedClasses((current) =>
      current.filter(({ id }) => id !== course.id),
    );
    if (selectedId === course.id) {
      setSelectedId(remaining[0]?.id ?? "");
      setMembers([]);
      setShown(undefined);
    }
    setPendingDelete(undefined);
    notifyTeacherClassesChanged();
    setMessage(`„${course.name}“ wurde gelöscht.`);
    window.dispatchEvent(new Event("teacher-data-changed"));
  }

  function deleteButton(course: TeacherClass) {
    return (
      <button
        type="button"
        className="ui-icon-btn"
        aria-label={`Klasse ${course.name} löschen`}
        title="Klasse löschen"
        onClick={() => setPendingDelete({ course, step: 1 })}
      >
        <Icon name="trash" size={18} />
      </button>
    );
  }

  const deleteConfirmation = pendingDelete ? (
    <div
      className="ui-notice ui-notice--bad ui-stack"
      role="alertdialog"
      aria-labelledby="class-delete-title"
      aria-describedby="class-delete-text"
    >
      <strong id="class-delete-title">
        {pendingDelete.step === 1
          ? `Klasse „${pendingDelete.course.name}“ löschen?`
          : "Wirklich endgültig löschen?"}
      </strong>
      <p id="class-delete-text" className="ui-small">
        {pendingDelete.step === 1
          ? "Schüler, Zuteilungen und eingegangene Abgaben dieser Klasse werden auf diesem Gerät entfernt. Archivieren behält alles für später."
          : "Das lässt sich nicht rückgängig machen. Auf Schülergeräten bleibt die Klasse, bis sie dort mit einem Entfernungscode oder von Hand entfernt wird."}
      </p>
      <div className="ui-row ui-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPendingDelete(undefined)}
        >
          Abbrechen
        </Button>
        {pendingDelete.step === 1 ? (
          <Button
            size="sm"
            onClick={() =>
              setPendingDelete({ course: pendingDelete.course, step: 2 })
            }
          >
            Ja, löschen
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => void deleteClass(pendingDelete.course)}
          >
            Endgültig löschen
          </Button>
        )}
      </div>
    </div>
  ) : null;

  async function restoreClass(course: TeacherClass) {
    await repository.restoreClass(course.id);
    const restored = { ...course, archivedAt: null };
    setArchivedClasses((current) =>
      current.filter(({ id }) => id !== course.id),
    );
    setClasses((current) => [...current, restored]);
    notifyTeacherClassesChanged();
    setSelectedId(course.id);
    setRemovalShown(undefined);
    setMessage(`„${course.name}“ wurde wieder aktiviert.`);
    window.dispatchEvent(new Event("teacher-data-changed"));
  }

  if (showQrSheet && selected) {
    return (
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
              <QRCodeSVG
                value={createEnrollmentLink(
                  appOrigin,
                  createEnrollmentCode(selected, member),
                )}
                size={180}
                role="img"
                aria-label={`Einschreibungs-QR-Code für ${member.displayName}`}
              />
              <figcaption>{member.displayName}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="ui-stack" aria-labelledby="teacher-title">
      <div className="ui-between ui-wrap">
        <div className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
          <p className="ui-eyebrow">Klassenverwaltung</p>
          <h1 id="teacher-title" className="ui-h-page">
            Klassen und Schüler
          </h1>
          <p className="ui-small ui-muted">
            Namen und Zuordnungen bleiben ausschließlich auf diesem Lehrergerät.
          </p>
        </div>
      </div>

      <form
        onSubmit={createClass}
        className="ui-card ui-card--pop ui-card--pad ui-stack"
        aria-labelledby="class-create-title"
      >
        <div>
          <p className="ui-eyebrow">Klasse hinzufügen</p>
          <h2 id="class-create-title" className="ui-h-section">
            Neue Klasse anlegen
          </h2>
        </div>
        <div className="ui-grid-auto" style={{ ["--min" as string]: "200px" }}>
          <label className="ui-labeled">
            Klassenname
            <input
              className="ui-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="z. B. Klasse 7b"
            />
          </label>
          <label className="ui-labeled">
            Lehrkraft
            <input
              className="ui-input"
              aria-label="Lehrkraft"
              value={teacherName}
              onChange={(event) => setTeacherName(event.target.value)}
              required
              placeholder="z. B. Frau Sommer"
            />
          </label>
          <label className="ui-labeled">
            Schuljahr
            <input
              className="ui-input"
              value={schoolYear}
              onChange={(event) => setSchoolYear(event.target.value)}
              required
            />
          </label>
        </div>
        <p className="ui-tiny ui-muted">
          Die Lehrkraft wird aus den Einstellungen übernommen und ist hier
          änderbar.
        </p>
        <Button type="submit">Klasse anlegen</Button>
      </form>

      {classes.length === 0 ? (
        <EmptyState title="Noch keine Klasse">
          Lege oben deine erste Klasse an.
        </EmptyState>
      ) : (
        <div className="ui-cols ui-classes">
          <nav className="ui-stack" aria-label="Klassen">
            <div className="ui-between">
              <h2 className="ui-h-section">Meine Klassen</h2>
              <Pill>{classes.length}</Pill>
            </div>
            {classes.map((course) => (
              <button
                key={course.id}
                className="ui-select-card"
                type="button"
                aria-label={`${course.name}, ${course.schoolYear}`}
                aria-pressed={course.id === selectedId}
                onClick={() => {
                  setMembers([]);
                  setSelectedId(course.id);
                  setShown(undefined);
                }}
              >
                <strong>{course.name}</strong>
                <span className="ui-small ui-muted">{course.schoolYear}</span>
              </button>
            ))}
          </nav>

          {selected ? (
            <section
              className="ui-card ui-card--pop ui-card--pad ui-stack"
              aria-label="Ausgewählte Klasse"
            >
              <div className="ui-between ui-wrap">
                <div>
                  <p className="ui-eyebrow">Klasse</p>
                  <h2 className="ui-h-section">{selected.name}</h2>
                  <p className="ui-small ui-muted">
                    {selected.teacherName} · {selected.schoolYear}
                  </p>
                </div>
                <div className="ui-row ui-wrap">
                  <Button
                    variant="green"
                    size="sm"
                    disabled={members.length === 0}
                    onClick={() => setShowQrSheet(true)}
                  >
                    QR-Bogen für die Klasse
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void archiveSelectedClass()}
                  >
                    Klasse archivieren
                  </Button>
                  {deleteButton(selected)}
                </div>
              </div>
              {pendingDelete?.course.id === selected.id
                ? deleteConfirmation
                : null}

              <form onSubmit={addStudent} className="ui-row ui-classes__add">
                <label className="ui-labeled ui-grow">
                  Name oder Alias
                  <input
                    className="ui-input"
                    value={studentName}
                    onChange={(event) => setStudentName(event.target.value)}
                    required
                    placeholder="z. B. Alex"
                  />
                </label>
                <Button type="submit">Schüler anlegen</Button>
              </form>

              <div className="ui-between">
                <h3 className="ui-h-section">Schüler</h3>
                <Pill>{members.length}</Pill>
              </div>
              {members.length === 0 ? (
                <p className="ui-small ui-muted">
                  In dieser Klasse sind noch keine Schüler angelegt.
                </p>
              ) : (
                <ul className="ui-list">
                  {members.map((member) => {
                    const isShown = shown?.id === member.id;
                    return (
                      <li
                        key={member.id}
                        className="ui-stack ui-classes__member"
                      >
                        <div className="ui-between">
                          <button
                            className="ui-classes__name"
                            type="button"
                            aria-label={`${member.displayName}: ${
                              isShown ? "QR-Code schließen" : "QR-Code anzeigen"
                            }`}
                            aria-expanded={isShown}
                            aria-controls={`member-code-${member.id}`}
                            onClick={() =>
                              setShown(isShown ? undefined : member)
                            }
                          >
                            <strong>{member.displayName}</strong>
                            <span className="ui-small ui-muted">
                              {isShown
                                ? "QR-Code schließen"
                                : "QR-Code anzeigen"}
                            </span>
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`${member.displayName} entfernen`}
                            onClick={() => void removeStudent(member)}
                          >
                            Entfernen
                          </Button>
                        </div>
                        {isShown && qrValue ? (
                          <div
                            className="ui-stack ui-center"
                            id={`member-code-${member.id}`}
                          >
                            <h4 className="ui-small">
                              Einschreibungs-QR für {member.displayName}
                            </h4>
                            <div className="ui-qr-box">
                              <QRCodeSVG
                                value={qrValue}
                                size={220}
                                role="img"
                                aria-label={`Einschreibungs-QR-Code für ${member.displayName}`}
                              />
                            </div>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="ui-tiny ui-muted">
                Aktive Bereiche:{" "}
                {selected.enabledModules
                  .map((module) => CLASS_MODULE_LABELS[module])
                  .join(", ")}
              </p>
            </section>
          ) : null}
        </div>
      )}

      {message ? (
        <p className="ui-notice" role="status">
          {message}
        </p>
      ) : null}

      <section
        className="ui-stack"
        aria-labelledby="teacher-class-archive-title"
      >
        <div className="ui-between">
          <h2 id="teacher-class-archive-title" className="ui-h-section">
            Klassenarchiv
          </h2>
          <Pill>{archivedClasses.length}</Pill>
        </div>
        {archivedClasses.length === 0 ? (
          <p className="ui-small ui-muted">Noch keine archivierte Klasse.</p>
        ) : (
          <ul className="ui-list">
            {archivedClasses.map((course) => {
              const isRemovalShown = removalShown?.id === course.id;
              const removalQrValue = appOrigin
                ? createClassRemovalLink(appOrigin, course.id)
                : "";
              return (
                <li key={course.id} className="ui-item">
                  <div
                    className="ui-stack"
                    style={{ ["--gap" as string]: "2px" }}
                  >
                    <strong>{course.name}</strong>
                    <span className="ui-small ui-muted">
                      {course.teacherName} · {course.schoolYear}
                    </span>
                  </div>
                  <div className="ui-item__actions">
                    <Button
                      variant="green"
                      size="sm"
                      onClick={() => void restoreClass(course)}
                    >
                      Reaktivieren
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-expanded={isRemovalShown}
                      onClick={() =>
                        setRemovalShown(isRemovalShown ? undefined : course)
                      }
                    >
                      Entfernungscode
                    </Button>
                    {deleteButton(course)}
                  </div>
                  {pendingDelete?.course.id === course.id
                    ? deleteConfirmation
                    : null}
                  {isRemovalShown && removalQrValue ? (
                    <div className="ui-row ui-wrap ui-classes__removal">
                      <div className="ui-qr-box">
                        <QRCodeSVG
                          value={removalQrValue}
                          size={160}
                          role="img"
                          aria-label={`Entfernungs-QR-Code für ${course.name}`}
                        />
                      </div>
                      <div
                        className="ui-stack ui-grow"
                        style={{ ["--gap" as string]: "4px" }}
                      >
                        <strong>Auf Schülergeräten entfernen</strong>
                        <p className="ui-small ui-muted">
                          Schüler scannen diesen QR-Code oder fügen den Code
                          unter „Klasse“ ein. Der persönliche Lernstand bleibt
                          erhalten.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}
