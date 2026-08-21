"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { TeacherService, TurnusV1 } from "../../../src/klasse/klasse-service.ts";
import type { ClassV1, StudentV1, EnrollmentPayloadV1 } from "../../../src/klasse/roster.ts";
import type { RosterStatusEntry, ScanResult, ScanInvalidReason } from "../../../src/klasse/submission.ts";
import { playScanFeedback } from "../../../src/klasse/scan-feedback.ts";
import { EnrollmentQrOverlay } from "./enrollment-qr-overlay.tsx";
import { ContinuousQrScannerOverlay, type ScanFeedback } from "./continuous-qr-scanner-overlay.tsx";

const INVALID_REASON_LABELS: Record<ScanInvalidReason, string> = {
  format: "unlesbarer Code",
  falsche_klasse: "falsche Klasse",
  unbekannter_schueler: "unbekannter Schüler",
  signatur: "ungültige Signatur",
  falscher_turnus: "falscher Turnus",
};

function feedbackFor(result: ScanResult): ScanFeedback {
  switch (result.status) {
    case "abgegeben":
      return { ok: true, label: `✓ ${result.alias} · abgegeben` };
    case "doppelt":
      return { ok: true, label: `${result.alias} · schon abgegeben` };
    case "veraltet":
      return { ok: false, label: `${result.alias} · veralteter Stand` };
    case "ungueltig":
      return { ok: false, label: `Ungültiger Code${result.reason ? ` (${INVALID_REASON_LABELS[result.reason]})` : ""}` };
  }
}

interface Props {
  service: TeacherService;
  classes: ClassV1[];
  onAddClass: (name: string) => Promise<ClassV1>;
}

export function Klassenbriefkasten({ service, classes, onAddClass }: Props) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentV1[]>([]);
  const [turnusList, setTurnusList] = useState<TurnusV1[]>([]);
  const [selectedTurnusId, setSelectedTurnusId] = useState<string | null>(null);
  const [rosterStatus, setRosterStatus] = useState<RosterStatusEntry[]>([]);

  const [newClassName, setNewClassName] = useState("");
  const [newStudentAlias, setNewStudentAlias] = useState("");
  const [newTurnusLabel, setNewTurnusLabel] = useState("");
  const [enrollmentPayload, setEnrollmentPayload] = useState<EnrollmentPayloadV1 | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const [confirmDeleteTurnusId, setConfirmDeleteTurnusId] = useState<string | null>(null);

  const refreshStudents = useCallback(
    (classId: string) => {
      service.listStudents(classId).then(setStudents);
    },
    [service],
  );

  const refreshTurnusList = useCallback(
    (classId: string) => {
      service.listTurnus(classId).then(setTurnusList);
    },
    [service],
  );

  const refreshRosterStatus = useCallback(
    (classId: string, turnusId: string) => {
      service.getRosterStatus(classId, turnusId).then(setRosterStatus);
    },
    [service],
  );

  const [lastLoadedClassId, setLastLoadedClassId] = useState<string | null | undefined>(undefined);
  if (selectedClassId !== lastLoadedClassId) {
    setLastLoadedClassId(selectedClassId);
    setSelectedTurnusId(null);
    setRosterStatus([]);
  }

  useEffect(() => {
    if (!selectedClassId) return;
    refreshStudents(selectedClassId);
    refreshTurnusList(selectedClassId);
  }, [selectedClassId, refreshStudents, refreshTurnusList]);

  useEffect(() => {
    if (!selectedClassId || !selectedTurnusId) return;
    refreshRosterStatus(selectedClassId, selectedTurnusId);
  }, [selectedClassId, selectedTurnusId, refreshRosterStatus]);

  async function handleAddClass(event: FormEvent) {
    event.preventDefault();
    const name = newClassName.trim();
    if (!name) return;
    const klasse = await onAddClass(name);
    setNewClassName("");
    setSelectedClassId(klasse.id);
  }

  async function handleAddStudent(event: FormEvent) {
    event.preventDefault();
    if (!selectedClassId) return;
    const alias = newStudentAlias.trim();
    if (!alias) return;
    await service.addStudent(selectedClassId, alias);
    setNewStudentAlias("");
    refreshStudents(selectedClassId);
  }

  async function handleRemoveStudent(studentId: string) {
    if (!selectedClassId) return;
    await service.removeStudent(studentId);
    refreshStudents(selectedClassId);
  }

  async function handleShowEnrollment(klasse: ClassV1, student: StudentV1) {
    setEnrollmentPayload(await service.buildEnrollmentPayload(klasse, student));
  }

  async function handleStartTurnus(event: FormEvent) {
    event.preventDefault();
    if (!selectedClassId) return;
    const label = newTurnusLabel.trim();
    if (!label) return;
    const turnus = await service.startTurnus(selectedClassId, label);
    setNewTurnusLabel("");
    refreshTurnusList(selectedClassId);
    setSelectedTurnusId(turnus.id);
  }

  async function handleCloseTurnus(turnusId: string) {
    if (!selectedClassId) return;
    await service.closeTurnus(turnusId);
    refreshTurnusList(selectedClassId);
  }

  async function handleDeleteTurnusLog(turnusId: string) {
    if (!selectedClassId) return;
    await service.deleteTurnusLog(turnusId);
    setConfirmDeleteTurnusId(null);
    if (selectedTurnusId === turnusId) setSelectedTurnusId(null);
    refreshTurnusList(selectedClassId);
  }

  const handleScan = useCallback(
    (encoded: string) => {
      if (!selectedClassId || !selectedTurnusId) return;
      service.scanSubmission(selectedClassId, selectedTurnusId, encoded).then((result) => {
        const feedback = feedbackFor(result);
        setScanFeedback(feedback);
        playScanFeedback(feedback.ok);
        if (result.status === "abgegeben") refreshRosterStatus(selectedClassId, selectedTurnusId);
      });
    },
    [service, selectedClassId, selectedTurnusId, refreshRosterStatus],
  );

  const selectedClass = classes.find((k) => k.id === selectedClassId) ?? null;
  const selectedTurnus = turnusList.find((t) => t.id === selectedTurnusId) ?? null;
  const submittedCount = rosterStatus.filter((s) => s.submitted).length;
  const missing = rosterStatus.filter((s) => !s.submitted);

  return (
    <div className="klassenbriefkasten">
      <h2>Klassenbriefkasten</h2>

      <div className="klassenbriefkasten__class-picker">
        <label htmlFor="class-select">Klasse</label>
        <select id="class-select" value={selectedClassId ?? ""} onChange={(e) => setSelectedClassId(e.target.value || null)}>
          <option value="">— auswählen —</option>
          {classes.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
        <form className="klassenbriefkasten__inline-form" onSubmit={handleAddClass}>
          <input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="Neue Klasse, z. B. 6b" required />
          <button className="button button--secondary" type="submit">Anlegen</button>
        </form>
      </div>

      {selectedClass && (
        <>
          <section className="klassenbriefkasten__section">
            <h3>Schüler:innen</h3>
            <ul className="klassenbriefkasten__roster">
              {students.map((student) => (
                <li key={student.id}>
                  <span>{student.alias}</span>
                  <div>
                    <button type="button" className="button button--quiet" onClick={() => handleShowEnrollment(selectedClass, student)}>
                      QR anzeigen
                    </button>
                    <button type="button" className="button button--quiet" onClick={() => handleRemoveStudent(student.id)} aria-label={`${student.alias} entfernen`}>
                      Entfernen
                    </button>
                  </div>
                </li>
              ))}
              {students.length === 0 && <li className="klassenbriefkasten__empty">Noch keine Schüler:innen angelegt.</li>}
            </ul>
            <form className="klassenbriefkasten__inline-form" onSubmit={handleAddStudent}>
              <input value={newStudentAlias} onChange={(e) => setNewStudentAlias(e.target.value)} placeholder="Alias, z. B. Fuchs" required />
              <button className="button button--secondary" type="submit">Hinzufügen</button>
            </form>
          </section>

          <section className="klassenbriefkasten__section">
            <h3>Abgaberunden (Turnus)</h3>
            <ul className="klassenbriefkasten__turnus-list">
              {turnusList.map((turnus) => (
                <li key={turnus.id} className={turnus.id === selectedTurnusId ? "is-active" : ""}>
                  <button type="button" className="klassenbriefkasten__turnus-select" onClick={() => setSelectedTurnusId(turnus.id)}>
                    {turnus.label} · Code <strong>{turnus.id}</strong> {turnus.closedAt && "· abgeschlossen"}
                  </button>
                  {confirmDeleteTurnusId === turnus.id ? (
                    <span className="klassenbriefkasten__confirm">
                      Wirklich löschen?
                      <button type="button" className="button button--quiet" onClick={() => handleDeleteTurnusLog(turnus.id)}>Ja</button>
                      <button type="button" className="button button--quiet" onClick={() => setConfirmDeleteTurnusId(null)}>Abbrechen</button>
                    </span>
                  ) : (
                    <button type="button" className="button button--quiet" onClick={() => setConfirmDeleteTurnusId(turnus.id)}>Protokoll löschen</button>
                  )}
                </li>
              ))}
              {turnusList.length === 0 && <li className="klassenbriefkasten__empty">Noch keine Abgaberunde gestartet.</li>}
            </ul>
            <form className="klassenbriefkasten__inline-form" onSubmit={handleStartTurnus}>
              <input value={newTurnusLabel} onChange={(e) => setNewTurnusLabel(e.target.value)} placeholder="z. B. Hausaufgabe 3" required />
              <button className="button button--secondary" type="submit">Turnus starten</button>
            </form>
          </section>

          {selectedTurnus && (
            <section className="klassenbriefkasten__section">
              <h3>{selectedTurnus.label} · Code <strong>{selectedTurnus.id}</strong></h3>
              <p className="klassenbriefkasten__count">
                {submittedCount} von {rosterStatus.length} abgegeben
              </p>
              {missing.length > 0 && (
                <p className="klassenbriefkasten__missing">Fehlt noch: {missing.map((s) => s.alias).join(", ")}</p>
              )}
              <div className="klassenbriefkasten__actions">
                <button className="button button--primary" type="button" onClick={() => { setScanFeedback(null); setScanning(true); }} disabled={!!selectedTurnus.closedAt}>
                  Scannen starten
                </button>
                {!selectedTurnus.closedAt && (
                  <button className="button button--quiet" type="button" onClick={() => handleCloseTurnus(selectedTurnus.id)}>
                    Turnus abschließen
                  </button>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {enrollmentPayload && <EnrollmentQrOverlay payload={enrollmentPayload} onClose={() => setEnrollmentPayload(null)} />}

      {scanning && selectedTurnus && (
        <ContinuousQrScannerOverlay
          onScan={handleScan}
          onClose={() => setScanning(false)}
          feedback={scanFeedback}
          statusLine={`${selectedTurnus.label} · ${submittedCount} von ${rosterStatus.length} abgegeben`}
        />
      )}
    </div>
  );
}
