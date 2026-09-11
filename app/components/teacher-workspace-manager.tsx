"use client";

import { QRCodeSVG } from "qrcode.react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  createTeacherAssignmentCode,
  parseTeacherAssignmentCode,
  TEACHER_SUBJECT_LABELS,
  type TeacherAssignment,
  type TeacherAssignmentQr,
  type TeacherAssignmentSubject,
  type TeacherProfile,
  type TeacherSubmission,
} from "../../src/domain/teacher-workspace";
import type {
  ClassMember,
  TeacherClass,
} from "../../src/domain/class-enrollment";
import type { TeacherContentPackage } from "../../src/domain/teacher-content-library";
import {
  createTeacherAssignmentRepository,
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
  createTeacherProfileRepository,
  createTeacherSubmissionRepository,
  createTeacherWorkspaceRepository,
} from "../../src/storage/teacher-class-settings";
import { QrCodeScanner } from "./qr-code-scanner";

const EMPTY_PROFILE: TeacherProfile = {
  id: "local-teacher",
  displayName: "",
  school: "",
  email: "",
  subjects: [],
  updatedAt: new Date(0).toISOString(),
};

type DatabaseStats = {
  classes: number;
  students: number;
  materials: number;
  assignments: number;
};

export function TeacherProfilePanel() {
  const profileRepository = useMemo(() => createTeacherProfileRepository(), []);
  const classRepository = useMemo(() => createTeacherClassRepository(), []);
  const materialRepository = useMemo(
    () => createTeacherContentLibraryRepository(),
    [],
  );
  const assignmentRepository = useMemo(
    () => createTeacherAssignmentRepository(),
    [],
  );
  const workspaceRepository = useMemo(
    () => createTeacherWorkspaceRepository(),
    [],
  );
  const importInput = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [subjects, setSubjects] = useState("");
  const [stats, setStats] = useState<DatabaseStats>({
    classes: 0,
    students: 0,
    materials: 0,
    assignments: 0,
  });
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  const refreshStats = useCallback(async () => {
    const [classes, materials, assignments] = await Promise.all([
      classRepository.list(),
      materialRepository.list(),
      assignmentRepository.list(),
    ]);
    const memberLists = await Promise.all(
      classes.map(({ id }) => classRepository.listMembers(id)),
    );
    setStats({
      classes: classes.length,
      students: memberLists.reduce((sum, members) => sum + members.length, 0),
      materials: materials.length,
      assignments: assignments.length,
    });
  }, [assignmentRepository, classRepository, materialRepository]);

  useEffect(() => {
    void profileRepository
      .get()
      .then((stored) => {
        if (!stored) return;
        setProfile(stored);
        setSubjects(stored.subjects.join(", "));
      })
      .catch(() =>
        setMessage("Die lokale Lehrerdatenbank konnte nicht geöffnet werden."),
      )
      .finally(() => setReady(true));
    const initialRefresh = window.setTimeout(() => void refreshStats(), 0);
    const refresh = () => void refreshStats();
    window.addEventListener("teacher-data-changed", refresh);
    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("teacher-data-changed", refresh);
    };
  }, [profileRepository, refreshStats]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const next: TeacherProfile = {
      ...profile,
      subjects: subjects
        .split(",")
        .map((subject) => subject.trim())
        .filter(Boolean),
      updatedAt: new Date().toISOString(),
    };
    try {
      await profileRepository.put(next);
      setProfile(next);
      setMessage("Persönliche Informationen wurden lokal gespeichert.");
    } catch {
      setMessage(
        "Die persönlichen Informationen konnten nicht gespeichert werden.",
      );
    }
  }

  async function exportDatabase() {
    const backup = await workspaceRepository.exportData();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Lernraum-Lehrerdaten-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Die lokale Lehrerdatenbank wurde als Datei exportiert.");
  }

  async function importDatabase(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const backup = await workspaceRepository.importData(
        JSON.parse(await file.text()),
      );
      if (backup.profile) {
        setProfile(backup.profile);
        setSubjects(backup.profile.subjects.join(", "));
      }
      await refreshStats();
      window.dispatchEvent(new Event("teacher-data-changed"));
      setMessage("Die geprüfte Lehrerdatenbank wurde lokal zusammengeführt.");
    } catch {
      setMessage("Die Datei ist keine gültige Lernraum-Lehrerdatenbank.");
    }
  }

  return (
    <section
      className="teacher-profile"
      aria-labelledby="teacher-profile-title"
    >
      <div className="teacher-profile__heading">
        <div>
          <p className="eyebrow">Persönliche Informationen</p>
          <h2 id="teacher-profile-title">Mein Lehrerarbeitsplatz</h2>
          <p>
            Diese Angaben bleiben in der lokalen Lehrerdatenbank dieses
            Browserprofils.
          </p>
        </div>
        <span className="teacher-local-note">IndexedDB · lokal</span>
      </div>
      <div className="teacher-profile__layout">
        <form className="teacher-profile__form" onSubmit={saveProfile}>
          <label>
            Anzeigename
            <input
              required
              disabled={!ready}
              value={profile.displayName}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
              placeholder="z. B. Tobias Becker"
            />
          </label>
          <label>
            Schule
            <input
              disabled={!ready}
              value={profile.school}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  school: event.target.value,
                }))
              }
              placeholder="optional"
            />
          </label>
          <label>
            E-Mail
            <input
              type="email"
              disabled={!ready}
              value={profile.email}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="optional"
            />
          </label>
          <label>
            Fächer
            <input
              disabled={!ready}
              value={subjects}
              onChange={(event) => setSubjects(event.target.value)}
              placeholder="Deutsch, Mathematik, Englisch"
            />
          </label>
          <button
            className="button button--primary"
            type="submit"
            disabled={!ready}
          >
            Informationen speichern
          </button>
        </form>
        <aside className="teacher-database" aria-labelledby="database-title">
          <p className="eyebrow">Lokale Datenbank</p>
          <h3 id="database-title">Alles auf diesem Gerät</h3>
          <div className="teacher-database__stats">
            <div>
              <strong>{stats.classes}</strong>
              <span>Klassen</span>
            </div>
            <div>
              <strong>{stats.students}</strong>
              <span>Schüler</span>
            </div>
            <div>
              <strong>{stats.materials}</strong>
              <span>Materialien</span>
            </div>
            <div>
              <strong>{stats.assignments}</strong>
              <span>Aufgaben</span>
            </div>
          </div>
          <p className="teacher-database__note">
            Kein Serverkonto erforderlich. Export und Cloud-Sicherung werden
            später als getrennte Sicherungswege ergänzt.
          </p>
          <div className="teacher-database__actions">
            <button
              className="button"
              type="button"
              onClick={() => void exportDatabase()}
            >
              Datenbank exportieren
            </button>
            <button
              className="button button--quiet"
              type="button"
              onClick={() => importInput.current?.click()}
            >
              Datenbank importieren
            </button>
            <input
              ref={importInput}
              className="sr-only"
              type="file"
              accept="application/json,.json"
              aria-label="Lehrerdatenbank auswählen"
              onChange={(event) => void importDatabase(event)}
            />
          </div>
        </aside>
      </div>
      {message ? (
        <p className="learning-message" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}

const SUBJECTS = Object.entries(TEACHER_SUBJECT_LABELS) as [
  TeacherAssignmentSubject,
  string,
][];

function emptyAssignmentForm() {
  return {
    title: "",
    instructions: "",
    subject: "german" as TeacherAssignmentSubject,
    materialId: "",
    classIds: [] as string[],
    memberIds: [] as string[],
    dueDate: "",
  };
}

export function TeacherAssignmentManager() {
  const assignmentRepository = useMemo(
    () => createTeacherAssignmentRepository(),
    [],
  );
  const classRepository = useMemo(() => createTeacherClassRepository(), []);
  const materialRepository = useMemo(
    () => createTeacherContentLibraryRepository(),
    [],
  );
  const submissionRepository = useMemo(
    () => createTeacherSubmissionRepository(),
    [],
  );
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [materials, setMaterials] = useState<TeacherContentPackage[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [form, setForm] = useState(emptyAssignmentForm);
  const [editingId, setEditingId] = useState("");
  const [qrAssignment, setQrAssignment] = useState<TeacherAssignment>();
  const [manualCode, setManualCode] = useState("");
  const [scanned, setScanned] = useState<TeacherAssignmentQr>();
  const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);
  const [message, setMessage] = useState("");
  const [scanError, setScanError] = useState("");

  const refresh = useCallback(async () => {
    const [storedClasses, storedMaterials, storedAssignments] =
      await Promise.all([
        classRepository.list(),
        materialRepository.list(),
        assignmentRepository.list(),
      ]);
    setClasses(storedClasses);
    setMembers(
      (
        await Promise.all(
          storedClasses.map(({ id }) => classRepository.listMembers(id)),
        )
      ).flat(),
    );
    setMaterials(storedMaterials);
    setAssignments(storedAssignments);
  }, [assignmentRepository, classRepository, materialRepository]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const refreshFromOtherPanel = () => void refresh();
    window.addEventListener("teacher-data-changed", refreshFromOtherPanel);
    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("teacher-data-changed", refreshFromOtherPanel);
    };
  }, [refresh]);

  async function saveAssignment(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (form.classIds.length === 0) {
      setMessage("Wähle mindestens eine Klasse für die Zuteilung aus.");
      return;
    }
    const existing = assignments.find(({ id }) => id === editingId);
    const now = new Date().toISOString();
    const assignment: TeacherAssignment = {
      id: existing?.id ?? crypto.randomUUID(),
      title: form.title,
      instructions: form.instructions,
      subject: form.subject,
      materialId: form.materialId || null,
      classIds: form.classIds,
      memberIds: form.memberIds,
      dueDate: form.dueDate,
      status: "assigned",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      await assignmentRepository.put(assignment);
      await refresh();
      setQrAssignment(assignment);
      setEditingId("");
      setForm(emptyAssignmentForm());
      setMessage(
        existing
          ? "Aufgabe und Zuteilung wurden aktualisiert."
          : "Aufgabe wurde erstellt und den Klassen zugeteilt.",
      );
      window.dispatchEvent(new Event("teacher-data-changed"));
    } catch {
      setMessage("Die Aufgabe konnte nicht lokal gespeichert werden.");
    }
  }

  function editAssignment(assignment: TeacherAssignment) {
    setEditingId(assignment.id);
    setForm({
      title: assignment.title,
      instructions: assignment.instructions,
      subject: assignment.subject,
      materialId: assignment.materialId ?? "",
      classIds: assignment.classIds,
      memberIds: assignment.memberIds ?? [],
      dueDate: assignment.dueDate,
    });
    setMessage(`„${assignment.title}“ ist zur Bearbeitung geöffnet.`);
    document.getElementById("assignment-form-title")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function removeAssignment(assignment: TeacherAssignment) {
    await assignmentRepository.remove(assignment.id);
    if (qrAssignment?.id === assignment.id) setQrAssignment(undefined);
    await refresh();
    setMessage(`„${assignment.title}“ wurde gelöscht.`);
    window.dispatchEvent(new Event("teacher-data-changed"));
  }

  const selectQrAssignment = useCallback(
    async (assignment: TeacherAssignment) => {
      setQrAssignment(assignment);
      setSubmissions(
        await submissionRepository.listByAssignment(assignment.id),
      );
    },
    [submissionRepository],
  );

  const inspectCode = useCallback(
    async (value: string) => {
      setScanError("");
      setManualCode(value);
      try {
        if (value.trim().startsWith("lernraum:performance:")) {
          const result = await submissionRepository.recordCode(value);
          const assignment = assignments.find(
            ({ id }) => id === result.submission.assignmentId,
          );
          if (assignment) await selectQrAssignment(assignment);
          setMessage(
            result.status === "accepted"
              ? "Leistungsbrief geprüft und als Abgabe gespeichert."
              : result.status === "duplicate"
                ? "Diese Abgabe wurde bereits erfasst."
                : "Dieser Leistungsbrief ist älter als die bereits erfasste Abgabe.",
          );
          return;
        }
        const result = parseTeacherAssignmentCode(value);
        setScanned(result);
      } catch (error) {
        setScanned(undefined);
        setScanError(
          error instanceof Error
            ? error.message
            : "Der eingelesene Code ist kein gültiger Lernraum-Code.",
        );
      }
    },
    [assignments, selectQrAssignment, submissionRepository],
  );

  const qrCode = qrAssignment ? createTeacherAssignmentCode(qrAssignment) : "";
  const expectedMembers = qrAssignment
    ? members.filter(
        (member) =>
          qrAssignment.classIds.includes(member.classId) &&
          ((qrAssignment.memberIds ?? []).length === 0 ||
            qrAssignment.memberIds.includes(member.id)),
      )
    : [];
  const submittedMemberIds = new Set(
    submissions.map(({ membershipId }) => membershipId),
  );

  return (
    <section
      className="teacher-assignments"
      aria-labelledby="teacher-assignments-title"
    >
      <div className="teacher-assignments__heading">
        <div>
          <p className="eyebrow">Aufgaben und Zuteilung</p>
          <h2 id="teacher-assignments-title">Arbeitsaufträge planen</h2>
          <p>
            Erstelle einen Auftrag, verknüpfe optional Material und teile ihn
            einer oder mehreren Klassen zu.
          </p>
        </div>
        <span className="teacher-local-note">
          {assignments.length} Aufgaben
        </span>
      </div>

      <div className="teacher-assignments__layout">
        <form className="teacher-assignment-form" onSubmit={saveAssignment}>
          <div className="teacher-panel__heading">
            <div>
              <p className="eyebrow">{editingId ? "Bearbeiten" : "Neu"}</p>
              <h3 id="assignment-form-title">
                {editingId ? "Aufgabe aktualisieren" : "Aufgabe erstellen"}
              </h3>
            </div>
          </div>
          <label>
            Titel
            <input
              required
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="z. B. Vokabeln Schule wiederholen"
            />
          </label>
          <label>
            Arbeitsauftrag
            <textarea
              required
              rows={5}
              value={form.instructions}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  instructions: event.target.value,
                }))
              }
              placeholder="Was sollen die Schüler bearbeiten?"
            />
          </label>
          <div className="teacher-assignment-form__row">
            <label>
              Fach
              <select
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subject: event.target.value as TeacherAssignmentSubject,
                  }))
                }
              >
                {SUBJECTS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fällig am
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label>
            Material
            <select
              value={form.materialId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  materialId: event.target.value,
                }))
              }
            >
              <option value="">Ohne Materialverknüpfung</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.title}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="teacher-assignment-classes">
            <legend>Zuteilung an Klassen</legend>
            {classes.length === 0 ? (
              <p>Lege zuerst mindestens eine Klasse an.</p>
            ) : (
              classes.map((teacherClass) => (
                <label key={teacherClass.id}>
                  <input
                    type="checkbox"
                    checked={form.classIds.includes(teacherClass.id)}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setForm((current) => ({
                        ...current,
                        classIds: checked
                          ? [...current.classIds, teacherClass.id]
                          : current.classIds.filter(
                              (classId) => classId !== teacherClass.id,
                            ),
                        memberIds: checked
                          ? current.memberIds
                          : current.memberIds.filter(
                              (memberId) =>
                                !members.some(
                                  (member) =>
                                    member.id === memberId &&
                                    member.classId === teacherClass.id,
                                ),
                            ),
                      }));
                    }}
                  />
                  <span>{teacherClass.name}</span>
                </label>
              ))
            )}
          </fieldset>
          {form.classIds.length > 0 ? (
            <fieldset className="teacher-assignment-classes">
              <legend>Einzelne Schüler (optional)</legend>
              <p>
                Ohne Auswahl gilt die Aufgabe für alle Schüler der gewählten
                Klassen.
              </p>
              {members.filter((member) =>
                form.classIds.includes(member.classId),
              ).length === 0 ? (
                <p>
                  In den gewählten Klassen sind noch keine Schüler angelegt.
                </p>
              ) : (
                members
                  .filter((member) => form.classIds.includes(member.classId))
                  .map((member) => (
                    <label key={member.id}>
                      <input
                        type="checkbox"
                        checked={form.memberIds.includes(member.id)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            memberIds: event.target.checked
                              ? [...current.memberIds, member.id]
                              : current.memberIds.filter(
                                  (memberId) => memberId !== member.id,
                                ),
                          }))
                        }
                      />
                      <span>
                        {member.displayName} ·{" "}
                        {classes.find(({ id }) => id === member.classId)?.name}
                      </span>
                    </label>
                  ))
              )}
            </fieldset>
          ) : null}
          <div className="teacher-library__actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={classes.length === 0}
            >
              {editingId ? "Änderungen speichern" : "Aufgabe zuteilen"}
            </button>
            {editingId ? (
              <button
                className="button button--quiet"
                type="button"
                onClick={() => {
                  setEditingId("");
                  setForm(emptyAssignmentForm());
                }}
              >
                Abbrechen
              </button>
            ) : null}
          </div>
        </form>

        <section className="teacher-assignment-list" aria-label="Aufgabenliste">
          <div className="teacher-panel__heading">
            <div>
              <p className="eyebrow">Gespeichert</p>
              <h3>Aufgaben und Zuteilungen</h3>
            </div>
          </div>
          {assignments.length === 0 ? (
            <p className="teacher-assignment-list__empty">
              Noch keine Aufgabe angelegt.
            </p>
          ) : (
            assignments.map((assignment) => (
              <article key={assignment.id}>
                <div>
                  <span>{TEACHER_SUBJECT_LABELS[assignment.subject]}</span>
                  <h4>{assignment.title}</h4>
                  <p>{assignment.instructions}</p>
                  <small>
                    {assignment.classIds
                      .map(
                        (classId) =>
                          classes.find(({ id }) => id === classId)?.name,
                      )
                      .filter(Boolean)
                      .join(", ")}
                    {assignment.dueDate
                      ? ` · fällig ${new Intl.DateTimeFormat("de-DE").format(new Date(`${assignment.dueDate}T12:00:00`))}`
                      : " · ohne Frist"}
                    {(assignment.memberIds ?? []).length > 0
                      ? ` · ${(assignment.memberIds ?? []).length} Schüler individuell`
                      : " · gesamte Klasse(n)"}
                  </small>
                </div>
                <div className="teacher-assignment-list__actions">
                  <button
                    className="button"
                    type="button"
                    onClick={() => void selectQrAssignment(assignment)}
                  >
                    QR-Code
                  </button>
                  <button
                    className="button button--quiet"
                    type="button"
                    onClick={() => editAssignment(assignment)}
                  >
                    Bearbeiten
                  </button>
                  <button
                    className="button button--quiet"
                    type="button"
                    onClick={() => void removeAssignment(assignment)}
                  >
                    Löschen
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      {message ? (
        <p className="learning-message" role="status">
          {message}
        </p>
      ) : null}

      <div className="teacher-qr-tools" id="qr-werkzeuge">
        <section
          className="teacher-qr-generator"
          aria-labelledby="qr-generator-title"
        >
          <p className="eyebrow">QR-Code Generator</p>
          <h3 id="qr-generator-title">Aufgabe weitergeben</h3>
          {!qrAssignment ? (
            <p>Wähle bei einer gespeicherten Aufgabe „QR-Code“.</p>
          ) : (
            <>
              <p>
                <strong>{qrAssignment.title}</strong> · ohne Schülernamen oder
                persönliche Lernstände
              </p>
              <div className="teacher-qr-generator__code">
                <QRCodeSVG value={qrCode} size={220} level="M" />
              </div>
              <textarea
                aria-label="Aufgabencode"
                readOnly
                rows={5}
                value={qrCode}
              />
              <button
                className="button"
                type="button"
                onClick={() => void navigator.clipboard.writeText(qrCode)}
              >
                Code kopieren
              </button>
            </>
          )}
        </section>

        <section
          className="teacher-qr-reader"
          aria-labelledby="qr-reader-title"
        >
          <p className="eyebrow">QR-Code Leser</p>
          <h3 id="qr-reader-title">Aufgabe oder Abgabe prüfen</h3>
          <div className="teacher-qr-reader__controls">
            <label>
              Code einfügen
              <textarea
                rows={5}
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="lernraum:assignment:… oder lernraum:performance:…"
              />
            </label>
            <QrCodeScanner onResult={(value) => void inspectCode(value)} />
            <button
              className="button"
              type="button"
              onClick={() => void inspectCode(manualCode)}
            >
              Code prüfen
            </button>
          </div>
          {scanError ? <p role="alert">{scanError}</p> : null}
          {scanned ? (
            <article className="teacher-qr-reader__result" aria-live="polite">
              <span>{TEACHER_SUBJECT_LABELS[scanned.subject]}</span>
              <h4>{scanned.title}</h4>
              <p>{scanned.instructions}</p>
              <small>
                {scanned.classIds.length} Klasse
                {scanned.classIds.length === 1 ? "" : "n"}
                {scanned.dueDate ? ` · fällig ${scanned.dueDate}` : ""}
              </small>
            </article>
          ) : null}
          {qrAssignment ? (
            <section
              className="teacher-submission-log"
              aria-labelledby="submission-log-title"
            >
              <div>
                <p className="eyebrow">Lokales Abgabelog</p>
                <h4 id="submission-log-title">{qrAssignment.title}</h4>
                <strong>
                  {submissions.length} / {expectedMembers.length} abgegeben
                </strong>
              </div>
              {expectedMembers.length === 0 ? (
                <p>Für diese Zuteilung sind noch keine Schüler vorhanden.</p>
              ) : (
                <ul>
                  {expectedMembers.map((member) => (
                    <li key={member.id}>
                      <span>{member.displayName}</span>
                      <span
                        className={
                          submittedMemberIds.has(member.id)
                            ? "teacher-submission-log__done"
                            : "teacher-submission-log__open"
                        }
                      >
                        {submittedMemberIds.has(member.id)
                          ? "abgegeben"
                          : "ausstehend"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </section>
      </div>
    </section>
  );
}
