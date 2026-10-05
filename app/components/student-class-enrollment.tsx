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
import { Icon } from "../ui/icons";
import { Button, EmptyState } from "../ui/primitives";
import { QrCodeScanner } from "../ui/qr-scanner";

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

  function handleScan(value: string) {
    const scanned = value.trim();
    try {
      if (/^https?:\/\//i.test(scanned)) {
        if (
          new URLSearchParams(new URL(scanned).hash.slice(1)).has("entfernen")
        ) {
          const linked = parseClassRemovalLink(scanned);
          setCode(linked.code);
          setRemovalClassId(linked.classId);
          setCandidate(undefined);
        } else {
          const linked = parseEnrollmentLink(scanned);
          setCode(linked.code);
          setCandidate(linked.enrollment);
          setRemovalClassId("");
        }
      } else if (scanned.startsWith("lernraum:remove:")) {
        setCode(scanned);
        setRemovalClassId(parseClassRemovalCode(scanned));
        setCandidate(undefined);
      } else {
        setCode(scanned);
        setCandidate(parseEnrollmentCode(scanned));
        setRemovalClassId("");
      }
      setMessage("");
    } catch {
      setMessage(
        "Der QR-Code ist ungültig oder unvollständig. Bitte nutze einen neuen Code deiner Lehrkraft.",
      );
    }
  }

  async function confirmEnrollment() {
    if (!candidate) return;
    try {
      const alreadyStored = items.some(
        ({ membershipId }) => membershipId === candidate.membershipId,
      );
      // Erneutes Scannen ersetzt die Mitgliedschaft samt Freigabe; ein QR ohne
      // Freigabe nimmt die Schreiberleichterung also wieder zurück.
      await repository.put(candidate);
      setItems(await repository.list());
      setCode("");
      setCandidate(undefined);
      setMessage(
        alreadyStored
          ? `${candidate.className} ist bereits in deinem Lernraum. Die Angaben deiner Lehrkraft sind aktualisiert.`
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
    <div className="ui-cols">
      <section
        className="ui-stack"
        aria-live="polite"
        aria-label="Meine Klassen"
      >
        {loading ? (
          <p className="ui-small ui-muted">Deine Klassen werden geladen …</p>
        ) : items.length === 0 ? (
          <EmptyState title="Noch keine Klasse auf diesem Gerät." />
        ) : (
          items.map((item) => (
            <Link
              className="ui-card ui-card--pop ui-card--pad ui-stack ui-today-card"
              href={`/klasse/${item.classId}`}
              key={item.membershipId}
            >
              <p className="ui-eyebrow">Meine Klasse</p>
              <h3 className="ui-h-section">{item.className}</h3>
              <p className="ui-small ui-muted">
                {item.teacherName} · {item.schoolYear} · {item.displayName}
              </p>
              <strong className="ui-row ui-today-card__cta">
                Klasse öffnen <Icon name="arrow" size={16} />
              </strong>
            </Link>
          ))
        )}
      </section>

      <section
        className="ui-card ui-card--pop ui-card--pad ui-stack"
        aria-label="In Klasse einschreiben"
      >
        {removalClassId ? (
          <div className="ui-stack">
            <p className="ui-eyebrow">Klasse archiviert</p>
            <h2 className="ui-h-section">
              {removalMembership
                ? `${removalMembership.className} entfernen?`
                : "Klasse entfernen?"}
            </h2>
            <p className="ui-small">
              Die Mitgliedschaft und zugehörige lokale Aufgaben werden von
              diesem Gerät entfernt. Dein persönlicher Lernstand bleibt
              erhalten.
            </p>
            <div className="ui-grid2">
              <Button onClick={() => void confirmRemoval()}>
                Klasse jetzt entfernen
              </Button>
              <Button variant="ghost" onClick={changeCode}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : candidate ? (
          <div className="ui-stack">
            <p className="ui-eyebrow">Bitte bestätigen</p>
            <h2 className="ui-h-section">Bist du {candidate.displayName}?</h2>
            <p className="ui-small">
              Du trittst <strong>{candidate.className}</strong> bei{" "}
              {candidate.teacherName} im Schuljahr {candidate.schoolYear} bei.
            </p>
            <p className="ui-tiny ui-muted">
              Die Klasse wird erst nach deiner Bestätigung auf diesem Gerät
              gespeichert.
            </p>
            <div className="ui-grid2">
              <Button onClick={() => void confirmEnrollment()}>
                Ja, ich bin {candidate.displayName}
              </Button>
              <Button variant="ghost" onClick={changeCode}>
                Nein, anderen Code verwenden
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={inspectCode} className="ui-stack">
            <div className="ui-stack" style={{ ["--gap" as string]: "2px" }}>
              <h2 className="ui-h-section">
                Individuellen Klassencode eingeben
              </h2>
              <p className="ui-small ui-muted">
                Scanne den QR-Code deiner Lehrkraft mit der Kamera, dann trägt
                er den Code automatisch ein. Hier kannst du auch einen
                Entfernungscode deiner Lehrkraft einfügen.
              </p>
            </div>
            <label className="ui-labeled" htmlFor="class-enrollment-code">
              Einschreibecode
            </label>
            <textarea
              id="class-enrollment-code"
              className="ui-textarea"
              ref={codeInput}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              rows={4}
              autoComplete="off"
              spellCheck={false}
            />
            <div className="ui-grid2">
              <Button type="submit">Code prüfen</Button>
              <span className="ui-row">
                <QrCodeScanner
                  buttonClassName="ui-btn ui-btn--ghost"
                  onResult={handleScan}
                />
                <span className="ui-small">QR-Code scannen</span>
              </span>
            </div>
          </form>
        )}
        {message ? (
          <p className="ui-notice" role="status">
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
