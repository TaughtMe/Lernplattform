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
import { QrCodeScanner } from "./qr-code-scanner";

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
    <div className="student-assignments">
      <section
        className="student-assignment-import"
        aria-labelledby="assignment-import-title"
      >
        <div>
          <p className="eyebrow">Von deiner Lehrkraft</p>
          <h3 id="assignment-import-title">Aufgabe übernehmen</h3>
          <p>Scanne den Aufgaben-QR oder füge den kopierten Code ein.</p>
        </div>
        <form onSubmit={submitCode}>
          <label>
            Aufgabencode
            <textarea
              required
              rows={4}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="lernraum:assignment:…"
            />
          </label>
          <div>
            <QrCodeScanner onResult={(value) => void importCode(value)} />
            <button className="button button--primary" type="submit">
              Aufgabe übernehmen
            </button>
          </div>
        </form>
      </section>

      <section className="student-assignment-list" aria-label="Meine Aufgaben">
        {assignments.length === 0 ? (
          <p>Noch keine Aufgabe übernommen.</p>
        ) : (
          assignments.map((assignment) => (
            <article key={assignment.id}>
              <span>{TEACHER_SUBJECT_LABELS[assignment.subject]}</span>
              <h3>{assignment.title}</h3>
              <p>{assignment.instructions}</p>
              <small>
                {assignment.dueDate
                  ? `Fällig am ${new Intl.DateTimeFormat("de-DE").format(new Date(`${assignment.dueDate}T12:00:00`))}`
                  : "Ohne Frist"}
              </small>
              <div>
                <a className="button" href={SUBJECT_ROUTES[assignment.subject]}>
                  Fach öffnen
                </a>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => void completeAssignment(assignment)}
                >
                  {assignment.status === "completed"
                    ? "Leistungs-QR neu erzeugen"
                    : "Als erledigt markieren"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      {message ? (
        <p className="learning-message" role="status">
          {message}
        </p>
      ) : null}

      {performanceCode ? (
        <section
          className="student-performance-qr"
          aria-labelledby="performance-qr-title"
        >
          <div>
            <p className="eyebrow">Abgabe ohne Konto</p>
            <h3 id="performance-qr-title">
              Leistungs-QR für {performanceTitle}
            </h3>
            <p>
              Enthält nur Aufgabe, Klassen- und Mitgliedschafts-ID,
              Abschlusszeit und Signatur – keine Antworten oder Klarnamen.
            </p>
          </div>
          <div className="student-performance-qr__code">
            <QRCodeSVG value={performanceCode} size={240} level="M" />
          </div>
          <textarea
            readOnly
            rows={5}
            aria-label="Leistungsbrief"
            value={performanceCode}
          />
        </section>
      ) : null}
    </div>
  );
}
