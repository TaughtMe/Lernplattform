"use client";

import { QRCodeSVG } from "qrcode.react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  acceptStudentAssignment,
  type StudentAssignment,
} from "../../src/domain/student-assignment";
import {
  createStudentPerformanceCode,
  TEACHER_SUBJECT_LABELS,
} from "../../src/domain/teacher-workspace";
import {
  createStudentAssignmentRepository,
  createStudentClassesRepository,
} from "../../src/storage/student-classes";
import { Button, ButtonLink, EmptyState, Pill } from "../ui/primitives";
import { QrCodeScanner } from "../ui/qr-scanner";

const SUBJECT_ROUTES: Record<StudentAssignment["subject"], string> = {
  german: "/lernen/faecher/deutsch",
  vocabulary: "/lernen/faecher/vokabeln",
  mathematics: "/lernen/faecher/mathematik",
  typing: "/lernen/faecher/tastschreiben",
  custom: "/lernen",
};

export function StudentAssignments() {
  const assignmentRepository = useMemo(
    () => createStudentAssignmentRepository(),
    [],
  );
  const classRepository = useMemo(() => createStudentClassesRepository(), []);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [performanceCode, setPerformanceCode] = useState("");
  const [performanceTitle, setPerformanceTitle] = useState("");

  const refresh = useCallback(async () => {
    setAssignments(await assignmentRepository.list());
  }, [assignmentRepository]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [refresh]);

  const importCode = useCallback(
    async (value: string) => {
      setMessage("");
      try {
        const memberships = await classRepository.list();
        const incoming = acceptStudentAssignment(value, memberships);
        const existing = await assignmentRepository.get(incoming.id);
        await assignmentRepository.put(
          existing
            ? {
                ...incoming,
                status: existing.status,
                completedAt: existing.completedAt,
                sequence: existing.sequence,
              }
            : incoming,
        );
        await refresh();
        setCode("");
        setMessage(
          existing
            ? `„${incoming.title}“ wurde ohne doppelten Eintrag aktualisiert.`
            : `„${incoming.title}“ wurde in deinen Lernraum übernommen.`,
        );
      } catch (cause) {
        setMessage(
          cause instanceof Error
            ? cause.message
            : "Der Aufgabencode ist ungültig.",
        );
      }
    },
    [assignmentRepository, classRepository, refresh],
  );

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    await importCode(code);
  }

  async function completeAssignment(assignment: StudentAssignment) {
    const memberships = await classRepository.list();
    const membership = memberships.find(
      ({ membershipId }) => membershipId === assignment.membershipId,
    );
    if (!membership) {
      setMessage("Die zugehörige Klasseneinschreibung fehlt auf diesem Gerät.");
      return;
    }
    const completedAt = new Date().toISOString();
    const sequence = assignment.sequence + 1;
    const completed: StudentAssignment = {
      ...assignment,
      status: "completed",
      completedAt,
      sequence,
    };
    await assignmentRepository.put(completed);
    const resultCode = await createStudentPerformanceCode(
      {
        version: 1,
        assignmentId: assignment.id,
        classId: assignment.classId,
        membershipId: assignment.membershipId,
        sequence,
        completedAt,
        result: "completed",
      },
      membership.enrollmentToken,
    );
    setPerformanceCode(resultCode);
    setPerformanceTitle(assignment.title);
    await refresh();
    setMessage(
      "Aufgabe abgeschlossen. Zeige den Leistungs-QR deiner Lehrkraft.",
    );
  }

  return (
    <div className="ui-stack">
      <div className="ui-cols ui-cols--wide-left">
        <section className="ui-stack" aria-label="Meine Aufgaben">
          {assignments.length === 0 ? (
            <EmptyState title="Noch keine Aufgabe übernommen." />
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
                    <h3 className="ui-h-section">{assignment.title}</h3>
                    <p className="ui-small">{assignment.instructions}</p>
                    <p className="ui-tiny ui-muted">
                      {assignment.dueDate
                        ? `Fällig am ${new Intl.DateTimeFormat("de-DE").format(new Date(`${assignment.dueDate}T12:00:00`))}`
                        : "Ohne Frist"}
                    </p>
                  </div>
                  <div className="ui-item__actions">
                    <ButtonLink
                      variant="ghost"
                      size="sm"
                      href={SUBJECT_ROUTES[assignment.subject]}
                    >
                      Fach öffnen
                    </ButtonLink>
                    <Button
                      size="sm"
                      onClick={() => void completeAssignment(assignment)}
                    >
                      {assignment.status === "completed"
                        ? "Leistungs-QR neu erzeugen"
                        : "Als erledigt markieren"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form
          className="ui-card ui-card--soft ui-card--pad ui-stack"
          aria-labelledby="assignment-import-title"
          onSubmit={submitCode}
        >
          <div>
            <p className="ui-eyebrow">Von deiner Lehrkraft</p>
            <h2 id="assignment-import-title" className="ui-h-section">
              Aufgabe übernehmen
            </h2>
            <p className="ui-small ui-muted">
              Scanne den Aufgaben-QR oder füge den Code manuell ein.
            </p>
          </div>
          <label className="ui-labeled">
            Aufgabencode
            <textarea
              className="ui-textarea"
              required
              rows={4}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Code hier einfügen"
            />
          </label>
          <div className="ui-row">
            <QrCodeScanner onResult={(value) => void importCode(value)} />
            <Button type="submit">Aufgabe übernehmen</Button>
          </div>
        </form>
      </div>

      {message ? (
        <p className="ui-notice" role="status">
          {message}
        </p>
      ) : null}

      {performanceCode ? (
        <section
          className="ui-card ui-card--dark ui-card--pad ui-on-dark ui-transfer__result"
          aria-labelledby="performance-qr-title"
        >
          <div className="ui-qr-box">
            <QRCodeSVG value={performanceCode} size={220} level="M" />
          </div>
          <div className="ui-stack">
            <p className="ui-eyebrow">Abgabe ohne Konto</p>
            <h2 id="performance-qr-title" className="ui-h-section">
              Leistungs-QR für {performanceTitle}
            </h2>
            <p className="ui-small ui-muted">
              Enthält nur Aufgabe, Klassen- und Mitgliedschafts-ID,
              Abschlusszeit und Signatur – keine Antworten oder Klarnamen.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
