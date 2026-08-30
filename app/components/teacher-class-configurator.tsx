"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  createEnrollmentCode,
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
  const [selectedId, setSelectedId] = useState("");
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [name, setName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [schoolYear, setSchoolYear] = useState("2026/27");
  const [studentName, setStudentName] = useState("");
  const [shown, setShown] = useState<ClassMember>();
  const [showQrSheet, setShowQrSheet] = useState(false);
  const [message, setMessage] = useState("");
  const selected = classes.find((course) => course.id === selectedId);

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

  useEffect(() => {
    repository
      .list()
      .then((items) => {
        setClasses(items);
        if (items[0]) setSelectedId(items[0].id);
      })
      .catch(() => setMessage("Die Klassen konnten nicht geladen werden."));
  }, [repository]);

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
      setShown(undefined);
      setStudentName("");
      setMessage("Schüler wurde lokal angelegt.");
      window.dispatchEvent(new Event("teacher-data-changed"));
    } catch {
      setMessage("Der Schüler konnte nicht gespeichert werden.");
    }
  }

  const code = selected && shown ? createEnrollmentCode(selected, shown) : "";

  async function removeStudent(member: ClassMember) {
    await repository.removeMember(member.id);
    setMembers((current) => current.filter(({ id }) => id !== member.id));
    if (shown?.id === member.id) setShown(undefined);
    setMessage(`„${member.displayName}“ wurde aus der Klasse entfernt.`);
    window.dispatchEvent(new Event("teacher-data-changed"));
  }

  async function removeSelectedClass() {
    if (!selected) return;
    await repository.removeClass(selected.id);
    const remaining = classes.filter(({ id }) => id !== selected.id);
    setClasses(remaining);
    setSelectedId(remaining[0]?.id ?? "");
    setMembers([]);
    setShown(undefined);
    setMessage(`„${selected.name}“ und ihre Schüler wurden lokal gelöscht.`);
    window.dispatchEvent(new Event("teacher-data-changed"));
  }

  if (showQrSheet && selected) {
    return (
      <section
        className="teacher-qr-sheet-view"
        aria-labelledby="teacher-qr-sheet-title"
      >
        <header className="teacher-qr-sheet-view__header">
          <div>
            <p className="eyebrow">Einschreibung</p>
            <h1 id="teacher-qr-sheet-title">QR-Bogen für {selected.name}</h1>
            <p>
              {members.length} Schüler · {selected.schoolYear}
            </p>
          </div>
          <div className="teacher-qr-sheet-view__actions">
            <button
              className="button button--quiet"
              type="button"
              onClick={() => setShowQrSheet(false)}
            >
              Zurück zur Klasse
            </button>
            <button
              className="button button--primary"
              type="button"
              onClick={() => window.print()}
            >
              Drucken oder als PDF speichern
            </button>
          </div>
        </header>
        <div className="teacher-qr-sheet">
          {members.map((member) => (
            <figure key={member.id} className="teacher-qr-sheet__card">
              <QRCodeSVG
                value={createEnrollmentCode(selected, member)}
                size={220}
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
    <section className="teacher-workspace" aria-labelledby="teacher-title">
      <div className="teacher-heading">
        <div>
          <p className="eyebrow">Klassenverwaltung</p>
          <h1 id="teacher-title">Klassen und Schüler</h1>
          <p>
            Namen und Zuordnungen bleiben ausschließlich auf diesem Lehrergerät.
          </p>
        </div>
        <span className="teacher-local-note">Lokal auf diesem Lehrergerät</span>
      </div>

      <div className="teacher-class-workspace">
        <section className="teacher-panel teacher-class-create">
          <div className="teacher-panel__heading">
            <div>
              <p className="eyebrow">Klasse hinzufügen</p>
              <h2>Neue Klasse anlegen</h2>
            </div>
          </div>
          <form onSubmit={createClass} className="teacher-class-form">
            <label>
              <span>Klassenname</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="z. B. Klasse 7b"
              />
            </label>
            <label>
              <span>Lehrkraft</span>
              <input
                aria-label="Lehrkraft"
                value={teacherName}
                onChange={(event) => setTeacherName(event.target.value)}
                required
                placeholder="z. B. Frau Sommer"
              />
              <small>
                Aus den Einstellungen übernommen und hier optional änderbar.
              </small>
            </label>
            <label>
              <span>Schuljahr</span>
              <input
                value={schoolYear}
                onChange={(event) => setSchoolYear(event.target.value)}
                required
              />
            </label>
            <button className="button button--primary" type="submit">
              Klasse anlegen
            </button>
          </form>
        </section>

        {classes.length === 0 ? (
          <section className="teacher-class-empty">
            <h2>Noch keine Klasse</h2>
            <p>Lege oben deine erste Klasse an.</p>
          </section>
        ) : (
          <div className="teacher-class-browser">
            <nav className="teacher-class-list" aria-label="Klassen">
              <div className="teacher-class-list__heading">
                <h2>Meine Klassen</h2>
                <span>{classes.length}</span>
              </div>
              {classes.map((course) => (
                <button
                  key={course.id}
                  className={`teacher-class-card${course.id === selectedId ? " is-active" : ""}`}
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
                  <span>{course.schoolYear}</span>
                </button>
              ))}
            </nav>

            {selected && (
              <section
                className="teacher-class-detail"
                aria-labelledby="active-class-title"
              >
                <header className="teacher-class-detail__heading">
                  <div>
                    <p className="eyebrow">Klasse</p>
                    <h2 id="active-class-title">{selected.name}</h2>
                    <p>
                      {selected.teacherName} · {selected.schoolYear}
                    </p>
                  </div>
                  <div className="teacher-class-detail__actions">
                    <button
                      className="button button--secondary"
                      type="button"
                      disabled={members.length === 0}
                      onClick={() => setShowQrSheet(true)}
                    >
                      QR-Bogen für die Klasse
                    </button>
                    <button
                      className="button button--quiet"
                      type="button"
                      onClick={() => void removeSelectedClass()}
                    >
                      Klasse löschen
                    </button>
                  </div>
                </header>

                <form onSubmit={addStudent} className="teacher-student-form">
                  <label>
                    <span>Name oder Alias</span>
                    <input
                      value={studentName}
                      onChange={(event) => setStudentName(event.target.value)}
                      required
                      placeholder="z. B. Alex"
                    />
                  </label>
                  <button className="button button--primary" type="submit">
                    Schüler anlegen
                  </button>
                </form>

                <div className="teacher-members-heading">
                  <h3>Schüler</h3>
                  <span>{members.length}</span>
                </div>
                {members.length === 0 ? (
                  <p className="teacher-members-empty">
                    In dieser Klasse sind noch keine Schüler angelegt.
                  </p>
                ) : (
                  <ul className="teacher-member-list">
                    {members.map((member) => {
                      const isShown = shown?.id === member.id;
                      return (
                        <li key={member.id}>
                          <div className="teacher-member-row">
                            <button
                              className="teacher-member-name"
                              type="button"
                              aria-label={`${member.displayName}: ${
                                isShown
                                  ? "QR-Code schließen"
                                  : "QR-Code anzeigen"
                              }`}
                              aria-expanded={isShown}
                              aria-controls={`member-code-${member.id}`}
                              onClick={() =>
                                setShown(isShown ? undefined : member)
                              }
                            >
                              <strong>{member.displayName}</strong>
                              <span>
                                {isShown
                                  ? "QR-Code schließen"
                                  : "QR-Code anzeigen"}
                              </span>
                            </button>
                            <button
                              className="button button--quiet teacher-member-remove"
                              type="button"
                              aria-label={`${member.displayName} entfernen`}
                              onClick={() => void removeStudent(member)}
                            >
                              Entfernen
                            </button>
                          </div>
                          {isShown && code && (
                            <div
                              className="teacher-member-code"
                              id={`member-code-${member.id}`}
                            >
                              <h4>
                                Einschreibungs-QR für {member.displayName}
                              </h4>
                              <QRCodeSVG
                                value={code}
                                size={240}
                                role="img"
                                aria-label={`Einschreibungs-QR-Code für ${member.displayName}`}
                              />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      {message && <p className="learning-message">{message}</p>}
      {selected && (
        <p className="teacher-class-modules">
          Aktive Bereiche:{" "}
          {selected.enabledModules
            .map((module) => CLASS_MODULE_LABELS[module])
            .join(", ")}
        </p>
      )}
    </section>
  );
}
