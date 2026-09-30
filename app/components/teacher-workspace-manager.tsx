"use client";

import { Icon } from "../ui/icons";
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
import { Button, Card, Pill } from "../ui/primitives";
import { QrCodeScanner } from "../ui/qr-scanner";

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
    const tag = profile.lernboxTag?.trim();
    const next: TeacherProfile = {
      ...profile,
      lernboxTag: tag || undefined,
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
    <section className="ui-stack" aria-labelledby="teacher-profile-title">
      <div className="ui-between ui-wrap">
        <div className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
          <p className="ui-eyebrow">Persönliche Informationen</p>
          <h2 id="teacher-profile-title" className="ui-h-page">
            Mein Lehrerarbeitsplatz
          </h2>
          <p className="ui-small ui-muted">
            Diese Angaben bleiben in der lokalen Lehrerdatenbank dieses
            Browserprofils.
          </p>
        </div>
        <Pill>IndexedDB · lokal</Pill>
      </div>
      <div className="ui-cols ui-cols--wide-left">
        <form
          className="ui-card ui-card--pop ui-card--pad ui-stack"
          aria-label="Persönliche Informationen"
          onSubmit={saveProfile}
        >
          <label className="ui-labeled">
            Anzeigename
            <input
              className="ui-input"
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
          <label className="ui-labeled">
            Schule
            <input
              className="ui-input"
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
          <label className="ui-labeled">
            E-Mail
            <input
              className="ui-input"
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
          <label className="ui-labeled">
            Fächer
            <input
              className="ui-input"
              disabled={!ready}
              value={subjects}
              onChange={(event) => setSubjects(event.target.value)}
              placeholder="Deutsch, Mathematik, Englisch"
            />
          </label>
          <label className="ui-labeled">
            LernBox-Tag für Laufdiktate
            <input
              className="ui-input"
              disabled={!ready}
              maxLength={80}
              value={profile.lernboxTag ?? ""}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  lernboxTag: event.target.value,
                }))
              }
              placeholder="z. B. Buch Klasse 5"
            />
            <span className="ui-small ui-muted">
              Gilt für alle übernommenen Vokabeln. Ein Tag an der Vokabel geht
              vor.
            </span>
          </label>
          <Button type="submit" disabled={!ready}>
            Informationen speichern
          </Button>
        </form>
        <Card look="soft" className="ui-stack" aria-labelledby="database-title">
          <p className="ui-eyebrow">Lokale Datenbank</p>
          <h3 id="database-title" className="ui-h-section">
            Alles auf diesem Gerät
          </h3>
          <div className="ui-stats">
            <div>
              <strong>{stats.classes}</strong>
              Klassen
            </div>
            <div>
              <strong>{stats.students}</strong>
              Schüler
            </div>
            <div>
              <strong>{stats.materials}</strong>
              Materialien
            </div>
            <div>
              <strong>{stats.assignments}</strong>
              Aufgaben
            </div>
          </div>
          <p className="ui-small ui-muted">Ohne Konto. Sicherung als Datei.</p>
          <div
            className="ui-grid-auto"
            style={{ ["--min" as string]: "130px" }}
          >
            <Button
              variant="soft"
              size="sm"
              title="Lehrerdatenbank als Datei sichern"
              onClick={() => void exportDatabase()}
            >
              <Icon name="download" size={16} />
              Exportieren
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Lehrerdatenbank aus einer Datei laden"
              onClick={() => importInput.current?.click()}
            >
              <Icon name="upload" size={16} />
              Importieren
            </Button>
            <input
              ref={importInput}
              className="ui-sr-only"
              type="file"
              accept="application/json,.json"
              aria-label="Lehrerdatenbank auswählen"
              onChange={(event) => void importDatabase(event)}
            />
          </div>
        </Card>
      </div>
      {message ? (
        <p className="ui-notice" role="status">
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

  const classNames = (ids: string[]) =>
    ids
      .map((classId) => classes.find(({ id }) => id === classId)?.name)
      .filter(Boolean)
      .join(", ");

  return (
    <section className="ui-stack" aria-labelledby="teacher-assignments-title">
      <div className="ui-between ui-wrap">
        <div className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
          <p className="ui-eyebrow">Aufgaben und Zuteilung</p>
          <h2 id="teacher-assignments-title" className="ui-h-page">
            Arbeitsaufträge planen
          </h2>
          <p className="ui-small ui-muted">
            Erstelle einen Auftrag, verknüpfe optional Material und teile ihn
            einer oder mehreren Klassen zu.
          </p>
        </div>
        <Pill>{assignments.length} Aufgaben</Pill>
      </div>

      <div className="ui-cols">
        <form
          className="ui-card ui-card--pop ui-card--pad ui-stack"
          aria-labelledby="assignment-form-title"
          onSubmit={saveAssignment}
        >
          <div>
            <p className="ui-eyebrow">{editingId ? "Bearbeiten" : "Neu"}</p>
            <h3 id="assignment-form-title" className="ui-h-section">
              {editingId ? "Aufgabe aktualisieren" : "Aufgabe erstellen"}
            </h3>
          </div>
          <label className="ui-labeled">
            Titel
            <input
              className="ui-input"
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
          <label className="ui-labeled">
            Arbeitsauftrag
            <textarea
              className="ui-textarea"
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
          <div className="ui-grid2">
            <label className="ui-labeled">
              Fach
              <select
                className="ui-input"
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
            <label className="ui-labeled">
              Fällig am
              <input
                className="ui-input"
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
          <label className="ui-labeled">
            Material
            <select
              className="ui-input"
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
          <fieldset className="ui-checks">
            <legend>Zuteilung an Klassen</legend>
            {classes.length === 0 ? (
              <p className="ui-small ui-muted">
                Lege zuerst mindestens eine Klasse an.
              </p>
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
            <fieldset className="ui-checks">
              <legend>Einzelne Schüler (optional)</legend>
              <p className="ui-small ui-muted">
                Ohne Auswahl gilt die Aufgabe für alle Schüler der gewählten
                Klassen.
              </p>
              {members.filter((member) =>
                form.classIds.includes(member.classId),
              ).length === 0 ? (
                <p className="ui-small ui-muted">
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
          <div className="ui-row ui-wrap">
            <Button type="submit" disabled={classes.length === 0}>
              {editingId ? "Änderungen speichern" : "Aufgabe zuteilen"}
            </Button>
            {editingId ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingId("");
                  setForm(emptyAssignmentForm());
                }}
              >
                Abbrechen
              </Button>
            ) : null}
          </div>
        </form>

        <section className="ui-stack" aria-label="Aufgabenliste">
          <div>
            <p className="ui-eyebrow">Gespeichert</p>
            <h3 className="ui-h-section">Aufgaben und Zuteilungen</h3>
          </div>
          {assignments.length === 0 ? (
            <p className="ui-empty ui-small">Noch keine Aufgabe angelegt.</p>
          ) : (
            <ul className="ui-list">
              {assignments.map((assignment) => (
                <li key={assignment.id} className="ui-item">
                  <div
                    className="ui-stack ui-grow"
                    style={{ ["--gap" as string]: "4px" }}
                  >
                    <Pill tone="accent">
                      {TEACHER_SUBJECT_LABELS[assignment.subject]}
                    </Pill>
                    <h4 className="ui-h-section">{assignment.title}</h4>
                    <p className="ui-small">{assignment.instructions}</p>
                    <p className="ui-tiny ui-muted">
                      {classNames(assignment.classIds)}
                      {assignment.dueDate
                        ? ` · fällig ${new Intl.DateTimeFormat("de-DE").format(new Date(`${assignment.dueDate}T12:00:00`))}`
                        : " · ohne Frist"}
                      {(assignment.memberIds ?? []).length > 0
                        ? ` · ${(assignment.memberIds ?? []).length} Schüler individuell`
                        : " · gesamte Klasse(n)"}
                    </p>
                  </div>
                  <div className="ui-item__actions">
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => void selectQrAssignment(assignment)}
                    >
                      QR-Code
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editAssignment(assignment)}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void removeAssignment(assignment)}
                    >
                      Löschen
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {message ? (
        <p className="ui-notice" role="status">
          {message}
        </p>
      ) : null}

      <div className="ui-cols ui-cols--stretch" id="qr-werkzeuge">
        <Card
          look="pop"
          className="ui-stack"
          aria-labelledby="qr-generator-title"
        >
          <div>
            <p className="ui-eyebrow">QR-Code Generator</p>
            <h3 id="qr-generator-title" className="ui-h-section">
              Aufgabe weitergeben
            </h3>
          </div>
          {!qrAssignment ? (
            <p className="ui-small ui-muted">
              Wähle bei einer gespeicherten Aufgabe „QR-Code“.
            </p>
          ) : (
            <>
              <p className="ui-small">
                <strong>{qrAssignment.title}</strong> · ohne Schülernamen oder
                persönliche Lernstände
              </p>
              <div className="ui-qr-box">
                <QRCodeSVG value={qrCode} size={220} level="M" />
              </div>
              <p className="ui-tiny ui-muted">
                Der QR-Code enthält nur die Aufgabe und ihre Zielklassen. Teile
                ihn direkt über den Bildschirm oder einen Ausdruck.
              </p>
            </>
          )}
        </Card>

        <Card look="pop" className="ui-stack" aria-labelledby="qr-reader-title">
          <div>
            <p className="ui-eyebrow">QR-Code Leser</p>
            <h3 id="qr-reader-title" className="ui-h-section">
              Aufgabe oder Abgabe prüfen
            </h3>
          </div>
          <label className="ui-labeled">
            Code manuell prüfen
            <textarea
              className="ui-textarea"
              rows={4}
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Code hier einfügen"
            />
          </label>
          <div className="ui-row">
            <QrCodeScanner
              continuous
              onResult={(value) => void inspectCode(value)}
            />
            <Button variant="soft" onClick={() => void inspectCode(manualCode)}>
              Code prüfen
            </Button>
          </div>
          {scanError ? (
            <p className="ui-notice ui-notice--bad" role="alert">
              {scanError}
            </p>
          ) : null}
          {scanned ? (
            <article
              className="ui-card ui-card--soft ui-card--pad ui-stack"
              aria-label="Eingelesene Aufgabe"
              aria-live="polite"
            >
              <Pill tone="accent">
                {TEACHER_SUBJECT_LABELS[scanned.subject]}
              </Pill>
              <h4 className="ui-h-section">{scanned.title}</h4>
              <p className="ui-small">{scanned.instructions}</p>
              <p className="ui-tiny ui-muted">
                {scanned.classIds.length} Klasse
                {scanned.classIds.length === 1 ? "" : "n"}
                {scanned.dueDate ? ` · fällig ${scanned.dueDate}` : ""}
              </p>
            </article>
          ) : null}
          {qrAssignment ? (
            <section
              className="ui-stack"
              aria-labelledby="submission-log-title"
            >
              <div className="ui-between">
                <div>
                  <p className="ui-eyebrow">Lokales Abgabelog</p>
                  <h4 id="submission-log-title" className="ui-h-section">
                    {qrAssignment.title}
                  </h4>
                </div>
                <Pill tone="good">
                  {submissions.length} / {expectedMembers.length} abgegeben
                </Pill>
              </div>
              {expectedMembers.length === 0 ? (
                <p className="ui-small ui-muted">
                  Für diese Zuteilung sind noch keine Schüler vorhanden.
                </p>
              ) : (
                <ul className="ui-list">
                  {expectedMembers.map((member) => (
                    <li key={member.id} className="ui-between ui-item">
                      <span>{member.displayName}</span>
                      {submittedMemberIds.has(member.id) ? (
                        <Pill tone="good">abgegeben</Pill>
                      ) : (
                        <Pill>ausstehend</Pill>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </Card>
      </div>
    </section>
  );
}
