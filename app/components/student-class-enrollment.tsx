"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  parseClassRemovalCode,
  parseClassRemovalLink,
  parseEnrollmentCode,
  parseEnrollmentLink,
  type ClassEnrollment,
} from "../../src/domain/class-enrollment";
import { createStudentClassesRepository } from "../../src/storage/student-classes";

export function StudentClassEnrollment() {
  const repository = useMemo(() => createStudentClassesRepository(), []);
  const codeInput = useRef<HTMLTextAreaElement>(null);
  const [items, setItems] = useState<ClassEnrollment[]>([]);
  const [code, setCode] = useState("");
  const [candidate, setCandidate] = useState<ClassEnrollment>();
  const [removalClassId, setRemovalClassId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    repository
      .list()
      .then((stored) => {
        if (isCurrent) setItems(stored);
      })
      .catch(() => {
        if (isCurrent) setMessage("Klassen konnten nicht geladen werden.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [repository]);

  useEffect(() => {
    if (!window.location.hash) return;
    let isCurrent = true;
    window.queueMicrotask(() => {
      if (!isCurrent) return;
      try {
        if (
          new URLSearchParams(window.location.hash.slice(1)).has("entfernen")
        ) {
          const linked = parseClassRemovalLink(window.location.href);
          setCode(linked.code);
          setRemovalClassId(linked.classId);
        } else {
          const linked = parseEnrollmentLink(window.location.href);
          setCode(linked.code);
          setCandidate(linked.enrollment);
        }
        setMessage("");
      } catch {
        setMessage(
          "Der QR-Code ist ungültig oder unvollständig. Bitte nutze einen neuen Code deiner Lehrkraft.",
        );
      } finally {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  function inspectCode(event: FormEvent) {
    event.preventDefault();
    try {
      if (code.trim().startsWith("lernraum:remove:")) {
        setRemovalClassId(parseClassRemovalCode(code));
        setCandidate(undefined);
        setMessage("");
        return;
      }
      setCandidate(parseEnrollmentCode(code));
      setRemovalClassId("");
      setMessage("");
    } catch {
      setMessage("Der Einschreibecode ist ungültig oder unvollständig.");
    }
  }

  async function confirmEnrollment() {
    if (!candidate) return;
    try {
      const alreadyStored = items.some(
        ({ membershipId }) => membershipId === candidate.membershipId,
      );
      if (!alreadyStored) await repository.put(candidate);
      setItems(await repository.list());
      setCode("");
      setCandidate(undefined);
      setMessage(
        alreadyStored
          ? `${candidate.className} ist bereits in deinem Lernraum.`
          : `${candidate.className} wurde deinem Lernraum hinzugefügt.`,
      );
      window.dispatchEvent(new Event("student-classes-changed"));
    } catch {
      setMessage(
        "Die Klasse konnte auf diesem Gerät nicht gespeichert werden. Bitte versuche es erneut.",
      );
    }
  }

  function changeCode() {
    setCandidate(undefined);
    setRemovalClassId("");
    setCode("");
    setMessage("");
    window.setTimeout(() => codeInput.current?.focus(), 0);
  }

  async function confirmRemoval() {
    const membership = items.find(({ classId }) => classId === removalClassId);
    if (!membership) {
      setRemovalClassId("");
      setCode("");
      setMessage("Diese Klasse ist auf diesem Gerät nicht gespeichert.");
      return;
    }
    try {
      await repository.removeClass(removalClassId);
      setItems(await repository.list());
      setRemovalClassId("");
      setCode("");
      setMessage(
        `${membership.className} und ihre lokalen Aufgaben wurden aus deinem Lernraum entfernt. Dein persönlicher Lernstand bleibt erhalten.`,
      );
      window.dispatchEvent(new Event("student-classes-changed"));
    } catch {
      setMessage(
        "Die Klasse konnte auf diesem Gerät nicht entfernt werden. Bitte versuche es erneut.",
      );
    }
  }

  const removalMembership = items.find(
    ({ classId }) => classId === removalClassId,
  );

  return (
    <div className="personal-class-grid">
      <div className="personal-class-list" aria-live="polite">
        {loading ? (
          <p>Deine Klassen werden geladen …</p>
        ) : items.length === 0 ? (
          <p>Noch keine Klasse auf diesem Gerät.</p>
        ) : (
          items.map((item) => (
            <Link
              className="personal-class-card"
              href={`/klasse/${item.classId}`}
              key={item.membershipId}
            >
              <span className="entry-card__label">Meine Klasse</span>
              <h3>{item.className}</h3>
              <p>
                {item.teacherName} · {item.schoolYear} · {item.displayName}
              </p>
              <strong>Klasse öffnen →</strong>
            </Link>
          ))
        )}
      </div>

      <section
        className="join-class join-class--panel student-enrollment"
        aria-label="In Klasse einschreiben"
      >
        {removalClassId ? (
          <div className="student-enrollment__confirmation">
            <p className="eyebrow">Klasse archiviert</p>
            <h2>
              {removalMembership
                ? `${removalMembership.className} entfernen?`
                : "Klasse entfernen?"}
            </h2>
            <p>
              Die Mitgliedschaft und zugehörige lokale Aufgaben werden von
              diesem Gerät entfernt. Dein persönlicher Lernstand bleibt
              erhalten.
            </p>
            <div className="student-enrollment__actions">
              <button
                className="button button--primary"
                type="button"
                onClick={() => void confirmRemoval()}
              >
                Klasse jetzt entfernen
              </button>
              <button
                className="button button--quiet"
                type="button"
                onClick={changeCode}
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : candidate ? (
          <div className="student-enrollment__confirmation">
            <p className="eyebrow">Bitte bestätigen</p>
            <h2>Bist du {candidate.displayName}?</h2>
            <p>
              Du trittst <strong>{candidate.className}</strong> bei{" "}
              {candidate.teacherName} im Schuljahr {candidate.schoolYear} bei.
            </p>
            <p className="student-enrollment__privacy">
              Die Klasse wird erst nach deiner Bestätigung auf diesem Gerät
              gespeichert.
            </p>
            <div className="student-enrollment__actions">
              <button
                className="button button--primary"
                type="button"
                onClick={() => void confirmEnrollment()}
              >
                Ja, ich bin {candidate.displayName}
              </button>
              <button
                className="button button--quiet"
                type="button"
                onClick={changeCode}
              >
                Nein, anderen Code verwenden
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <span>
                <strong>Individuellen Klassencode eingeben</strong>
                <small>
                  Ein QR-Code trägt den Code automatisch ein. Hier kannst du
                  auch einen Entfernungscode deiner Lehrkraft einfügen.
                </small>
              </span>
            </div>
            <form onSubmit={inspectCode} className="student-enrollment__form">
              <label htmlFor="class-enrollment-code">Einschreibecode</label>
              <textarea
                id="class-enrollment-code"
                ref={codeInput}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                rows={5}
                autoComplete="off"
                spellCheck={false}
              />
              <button className="button button--primary" type="submit">
                Code prüfen
              </button>
            </form>
          </>
        )}
        {message && (
          <p className="learning-message" role="status">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
