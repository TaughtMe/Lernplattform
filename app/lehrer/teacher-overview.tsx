"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createTeacherAssignmentRepository,
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
} from "../../src/storage/teacher-class-settings";
import { useRelease } from "../release/release-context";
import { Icon, type IconName } from "../ui/icons";

type Counts = {
  classes: number;
  members: number;
  contents: number;
  assignments: number;
};

/** Lehrer-Übersicht nach Design 1d: Raum starten und Arbeitsbereiche. */
export function TeacherOverview() {
  const visibility = useRelease();
  const classes = useMemo(() => createTeacherClassRepository(), []);
  const contents = useMemo(() => createTeacherContentLibraryRepository(), []);
  const assignments = useMemo(() => createTeacherAssignmentRepository(), []);
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const list = await classes.list();
      const members = await Promise.all(
        list.map((course) => classes.listMembers(course.id)),
      );
      const [contentList, assignmentList] = await Promise.all([
        contents.list(),
        assignments.list(),
      ]);
      if (!active) return;
      setCounts({
        classes: list.length,
        members: members.reduce((sum, items) => sum + items.length, 0),
        contents: contentList.length,
        assignments: assignmentList.length,
      });
    })().catch(() => active && setCounts(null));
    return () => {
      active = false;
    };
  }, [classes, contents, assignments]);

  const areas: Array<{
    href: string;
    icon: IconName;
    title: string;
    detail: string;
    visible: boolean;
  }> = [
    {
      href: "/lehrer/klassen",
      icon: "room",
      title: "Klassen",
      detail: counts
        ? `${counts.classes} Klassen · ${counts.members} Schüler`
        : "Klassen und Einschreibe-QR",
      visible: visibility.lehrer,
    },
    {
      href: "/lehrer/material",
      icon: "content",
      title: "Inhalte",
      detail: counts
        ? `${counts.contents} Pakete abgelegt`
        : "Vokabelpakete vorbereiten und freigeben",
      visible: visibility.lehrer,
    },
    {
      href: "/lehrer/aufgaben",
      icon: "list",
      title: "Aufgaben",
      detail: counts
        ? `${counts.assignments} Aufgaben`
        : "Aufträge und Abgabenachweise",
      visible: visibility["lehrer-aufgaben"],
    },
    {
      href: "/lehrer/haeuser",
      icon: "house",
      title: "Häuser",
      detail: "Leistungsbriefe scannen, Beamer-Ansicht",
      visible: visibility.motivation,
    },
  ];

  return (
    <section
      className="ui-page ui-teacher-home"
      aria-labelledby="teacher-overview-title"
    >
      <header>
        <p className="ui-eyebrow">Unterricht</p>
        <h1 id="teacher-overview-title" className="ui-h-page">
          Übersicht
        </h1>
      </header>

      <div className="ui-card ui-card--dark ui-teacher-home__start">
        <div className="ui-stack">
          <p className="ui-eyebrow ui-muted">Raum starten</p>
          <h2 className="ui-teacher-home__claim">
            Drei Schritte, dann steht der Code an der Wand.
          </h2>
          <p className="ui-small ui-muted">
            Inhalt wählen, Modus festlegen, Lobby öffnen: Laufdiktat, freies
            Üben, Battle oder Stationen. Schüler brauchen kein Konto.
          </p>
        </div>
        <Link className="ui-btn ui-btn--gold ui-btn--lg" href="/lehrer/live">
          <Icon name="play" size={16} /> Unterrichtsrunde starten
        </Link>
      </div>

      <div className="ui-grid-auto" style={{ ["--min" as string]: "220px" }}>
        {areas
          .filter((area) => area.visible)
          .map((area) => (
            <Link
              key={area.href}
              href={area.href}
              className="ui-card ui-card--pad ui-teacher-home__area"
            >
              <Icon name={area.icon} size={22} />
              <strong>{area.title}</strong>
              <span className="ui-small ui-muted">{area.detail}</span>
            </Link>
          ))}
      </div>

      <aside className="ui-notice">
        <strong>Dieses Gerät ist die Schutzgrenze.</strong> Lehrkraftdaten
        bleiben lokal. Nutze deshalb ein geschütztes, nicht gemeinsam
        verwendetes Geräteprofil.
      </aside>
    </section>
  );
}
