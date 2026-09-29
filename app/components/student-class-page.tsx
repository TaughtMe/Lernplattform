"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClassEnrollment } from "../../src/domain/class-enrollment";
import { createStudentClassesRepository } from "../../src/storage/student-classes";
import { ClassOverview } from "../klasse/class-overview";
import { ButtonLink, EmptyState } from "../ui/primitives";
import { StudentPage } from "../ui/shell/student-page";

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

  if (!loaded || !value)
    return (
      <StudentPage activePath="/lernen/klasse">
        <div className="ui-page">
          {!loaded ? (
            <p className="ui-small ui-muted" role="status">
              Klasse wird geladen …
            </p>
          ) : (
            <EmptyState title="Klasse nicht auf diesem Gerät">
              <ButtonLink href="/lernen/klasse" variant="ghost" size="sm">
                Einschreibecode übernehmen
              </ButtonLink>
            </EmptyState>
          )}
        </div>
      </StudentPage>
    );

  return (
    <ClassOverview
      teacherName={value.teacherName}
      className={value.className}
      intro={`Schuljahr ${value.schoolYear}. Die Klasse ergänzt deinen persönlichen Lernraum; dein Lernstand bleibt lokal.`}
    />
  );
}
