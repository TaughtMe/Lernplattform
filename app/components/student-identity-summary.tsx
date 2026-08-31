"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ClassEnrollment } from "../../src/domain/class-enrollment";
import { createStudentClassesRepository } from "../../src/storage/student-classes";

export function StudentIdentitySummary({ status }: { status?: ReactNode }) {
  const repository = useMemo(() => createStudentClassesRepository(), []);
  const [membership, setMembership] = useState<ClassEnrollment>();
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    void repository
      .list()
      .then(([current]) => setMembership(current))
      .finally(() => setLoaded(true));
  }, [repository]);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener("student-classes-changed", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("student-classes-changed", refresh);
    };
  }, [refresh]);

  const name = membership?.displayName;
  return (
    <div className="student-dashboard__identity">
      {status}
      <span className="student-dashboard__student-name">
        {loaded
          ? name
            ? `Angemeldet als ${name}`
            : "Lernstand bleibt lokal"
          : "Profil wird geladen …"}
      </span>
      <span
        className="student-dashboard__avatar"
        role="img"
        aria-label={name ? `Profil von ${name}` : "Mein Profil"}
      >
        {name?.trim().charAt(0).toLocaleUpperCase("de-DE") || "L"}
      </span>
    </div>
  );
}
