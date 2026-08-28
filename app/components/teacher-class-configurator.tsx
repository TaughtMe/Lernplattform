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
import { createTeacherClassRepository } from "../../src/storage/teacher-class-settings";
const modules: ClassModule[] = [
  "vocabulary",
  "german",
  "mathematics",
  "typing",
  "running-dictation",
];
const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
export function TeacherClassConfigurator() {
  const repository = useMemo(() => createTeacherClassRepository(), []);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [name, setName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [schoolYear, setSchoolYear] = useState("2026/27");
  const [studentName, setStudentName] = useState("");
  const [shown, setShown] = useState<ClassMember>();
  const [message, setMessage] = useState("");
  const selected = classes.find((x) => x.id === selectedId);
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
    repository
      .listMembers(selectedId)
      .then(setMembers)
      .catch(() => setMessage("Die Schülerliste konnte nicht geladen werden."));
  }, [repository, selectedId]);
  async function createClass(e: FormEvent) {
    e.preventDefault();
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
      setClasses((x) => [...x, course]);
      setSelectedId(course.id);
      setName("");
      setMessage("Klasse wurde lokal angelegt.");
      window.dispatchEvent(new Event("teacher-data-changed"));
    } catch {
      setMessage("Die Klasse konnte nicht gespeichert werden.");
    }
  }
  async function addStudent(e: FormEvent) {
    e.preventDefault();
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
      setMembers((x) => [...x, member]);
      setShown(member);
      setStudentName("");
      setMessage(
        "Schüler wurde lokal angelegt. Übernimm jetzt den individuellen Code am Schülergerät.",
      );
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
      <div className="teacher-layout">
        <section className="teacher-panel">
          <div className="teacher-panel__heading">
            <div>
              <p className="eyebrow">Schritt 1</p>
              <h2>Neue Klasse anlegen</h2>
            </div>
          </div>
          <form onSubmit={createClass} className="module-settings">
            <label>
              Klassenname
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="z. B. Klasse 7b"
              />
            </label>
            <label>
              Lehrkraft
              <input
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                required
                placeholder="z. B. Frau Sommer"
              />
            </label>
            <label>
              Schuljahr
              <input
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                required
              />
            </label>
            <button className="button button--primary" type="submit">
              Klasse anlegen
            </button>
          </form>
          {classes.length > 0 && (
            <div className="teacher-class-selection">
              <label>
                Aktive Klasse
                <select
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    setShown(undefined);
                  }}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button button--quiet"
                type="button"
                onClick={() => void removeSelectedClass()}
              >
                Aktive Klasse löschen
              </button>
            </div>
          )}
        </section>
        <aside className="teacher-preview">
          <span className="entry-card__label">Schritt 2</span>
          <h2>Ersten Schüler hinzufügen</h2>
          {!selected ? (
            <p>Lege zuerst eine Klasse an.</p>
          ) : (
            <>
              <p>
                <strong>{selected.name}</strong> · {selected.teacherName} ·{" "}
                {selected.schoolYear}
              </p>
              <form onSubmit={addStudent}>
                <label>
                  Name oder Alias
                  <input
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    required
                    placeholder="z. B. Alex"
                  />
                </label>
                <button className="button button--primary" type="submit">
                  Schüler anlegen
                </button>
              </form>
              {members.length > 0 && (
                <div>
                  <h3>{members.length} Schüler</h3>
                  <ul className="teacher-member-list">
                    {members.map((m) => (
                      <li key={m.id}>
                        <button
                          className="button"
                          type="button"
                          onClick={() => setShown(m)}
                        >
                          {m.displayName}
                        </button>
                        <button
                          className="button button--quiet"
                          type="button"
                          aria-label={`${m.displayName} entfernen`}
                          onClick={() => void removeStudent(m)}
                        >
                          Entfernen
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {code && (
                <div>
                  <h3>Individueller Code für {shown?.displayName}</h3>
                  <QRCodeSVG value={code} size={220} />
                  <textarea
                    readOnly
                    value={code}
                    aria-label="Einschreibecode"
                    rows={5}
                  />
                  <button
                    className="button"
                    type="button"
                    onClick={() => navigator.clipboard.writeText(code)}
                  >
                    Code kopieren
                  </button>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
      {message && <p className="learning-message">{message}</p>}
      {selected && (
        <p>
          Aktive Bereiche:{" "}
          {selected.enabledModules
            .map((m) => CLASS_MODULE_LABELS[m])
            .join(", ")}
        </p>
      )}
    </section>
  );
}
