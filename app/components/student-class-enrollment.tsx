"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  parseEnrollmentCode,
  type ClassEnrollment,
} from "../../src/domain/class-enrollment";
import { createStudentClassesRepository } from "../../src/storage/student-classes";
export function StudentClassEnrollment() {
  const repository = useMemo(() => createStudentClassesRepository(), []);
  const [items, setItems] = useState<ClassEnrollment[]>([]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    repository
      .list()
      .then(setItems)
      .catch(() => setMessage("Klassen konnten nicht geladen werden."));
  }, [repository]);
  async function enroll(e: FormEvent) {
    e.preventDefault();
    try {
      const value = parseEnrollmentCode(code);
      await repository.put(value);
      setItems(await repository.list());
      setCode("");
      setMessage(
        `Du bist jetzt als ${value.displayName} in ${value.className} eingeschrieben.`,
      );
    } catch {
      setMessage("Der Einschreibecode ist ungültig oder unvollständig.");
    }
  }
  return (
    <div className="personal-class-grid">
      <div>
        {items.length === 0 ? (
          <p>Noch keine Klasse auf diesem Gerät.</p>
        ) : (
          items.map((item) => (
            <Link
              className="personal-class-card"
              href={`/klasse/${item.classId}`}
              key={item.membershipId}
            >
              <span className="entry-card__label">Aktive Klasse</span>
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
        className="join-class join-class--panel"
        aria-label="In Klasse einschreiben"
      >
        <div>
          <span>
            <strong>Individuellen Klassencode übernehmen</strong>
            <small>Code vom Lehrergerät kopieren und hier einfügen.</small>
          </span>
        </div>
        <form onSubmit={enroll}>
          <label htmlFor="class-enrollment-code">Einschreibecode</label>
          <textarea
            id="class-enrollment-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            rows={5}
          />
          <button className="button button--primary" type="submit">
            In Klasse einschreiben
          </button>
        </form>
        {message && <p className="learning-message">{message}</p>}
      </section>
    </div>
  );
}
