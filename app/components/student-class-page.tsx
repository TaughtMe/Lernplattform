"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ClassEnrollment } from "../../src/domain/class-enrollment";
import { createStudentClassesRepository } from "../../src/storage/student-classes";
import { RoomCodeForm } from "./room-code-form";
import { StudentDashboardShell } from "./student-dashboard-shell";
export function StudentClassPage({ classId }: { classId: string }) {
  const repository = useMemo(() => createStudentClassesRepository(), []);
  const [value, setValue] = useState<ClassEnrollment>();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    repository
      .list()
      .then((items) => setValue(items.find((x) => x.classId === classId)))
      .finally(() => setLoaded(true));
  }, [classId, repository]);
  if (!loaded)
    return (
      <StudentDashboardShell activePath="/lernen/klasse">
        <section className="class-shell">
          <p>Klasse wird geladen …</p>
        </section>
      </StudentDashboardShell>
    );
  if (!value)
    return (
      <StudentDashboardShell activePath="/lernen/klasse">
        <section className="class-shell">
          <h1>Klasse nicht auf diesem Gerät</h1>
          <Link href="/lernen/klasse">Einschreibecode übernehmen</Link>
        </section>
      </StudentDashboardShell>
    );
  return (
    <StudentDashboardShell activePath="/lernen/klasse">
      <section className="class-context">
        <div className="class-context__heading">
          <p className="eyebrow">Meine Klasse · {value.teacherName}</p>
          <h1>{value.className}</h1>
          <p>
            Schuljahr {value.schoolYear}. Die Klasse ergänzt deinen persönlichen
            Lernraum; dein Lernstand bleibt lokal.
          </p>
          <Link className="button button--primary" href="/lernen">
            Im persönlichen Lernraum üben
          </Link>
        </div>
        <section className="running-room-entry">
          <div>
            <p className="eyebrow">Gemeinsame Runde</p>
            <h2>Unterrichtsraum beitreten</h2>
            <p>Gib den vierstelligen Code deiner Lehrkraft ein.</p>
          </div>
          <RoomCodeForm idPrefix="class-running-room" mode="room" />
        </section>
      </section>
    </StudentDashboardShell>
  );
}
