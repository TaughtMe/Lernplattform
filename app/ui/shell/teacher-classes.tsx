"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createTeacherClassRepository } from "../../../src/storage/teacher-class-settings";
import { Icon } from "../icons";

const CHANGE_EVENT = "lernraum-teacher-classes-change";

export function notifyTeacherClassesChanged() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

type ClassRow = { id: string; name: string; members: number };

/** Klassenliste der Lehrer-Seitenleiste (Design 2c). */
export function TeacherClassList({
  onNavigate,
}: {
  onNavigate?: (() => void) | undefined;
}) {
  const repository = useMemo(() => createTeacherClassRepository(), []);
  const [rows, setRows] = useState<ClassRow[] | null>(null);
  const [selected] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("klasse"),
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      const classes = await repository.list();
      const withCounts = await Promise.all(
        classes.map(async (course) => ({
          id: course.id,
          name: course.name,
          members: (await repository.listMembers(course.id)).length,
        })),
      );
      if (active) setRows(withCounts);
    };
    const reload = () => void load().catch(() => active && setRows([]));
    reload();
    window.addEventListener(CHANGE_EVENT, reload);
    return () => {
      active = false;
      window.removeEventListener(CHANGE_EVENT, reload);
    };
  }, [repository]);

  const linkProps = onNavigate ? { onClick: onNavigate } : {};

  return (
    <nav className="ui-teacher__nav" aria-label="Klassen">
      <span className="ui-teacher__label">Klassen</span>
      {rows === null ? null : rows.length === 0 ? (
        <p className="ui-tiny ui-teacher__empty">Noch keine Klasse.</p>
      ) : (
        rows.map((row) => (
          <Link
            key={row.id}
            href={`/lehrer/klassen?klasse=${encodeURIComponent(row.id)}`}
            className="ui-teacher__class"
            aria-current={row.id === selected ? "true" : undefined}
            {...linkProps}
          >
            <span className="ui-truncate">{row.name}</span>
            <span
              className="ui-teacher__count"
              aria-label={`${row.members} Schüler`}
            >
              {row.members}
            </span>
          </Link>
        ))
      )}
      <Link href="/lehrer/klassen" className="ui-teacher__new" {...linkProps}>
        <Icon name="plus" size={16} /> Klasse anlegen
      </Link>
    </nav>
  );
}
