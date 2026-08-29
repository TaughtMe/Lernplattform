import type { Metadata } from "next";
import Link from "next/link";
import { TeacherCockpitShell } from "../components/teacher-cockpit-shell";

export const metadata: Metadata = { title: "Lehrerbereich" };

export default function Page() {
  return (
    <TeacherCockpitShell active="overview">
      <section
        className="teacher-dashboard"
        aria-labelledby="teacher-overview-title"
      >
        <div className="teacher-dashboard__heading">
          <div>
            <p className="eyebrow">Unterricht lokal organisieren</p>
            <h1 id="teacher-overview-title">Guten Morgen</h1>
            <p>
              Von hier aus bereitest du Unterricht vor, verwaltest deine
              Lerngruppen und startest die nächste gemeinsame Runde.
            </p>
          </div>
          <Link className="button button--primary" href="/lehrer/live">
            Unterrichtsrunde starten
          </Link>
        </div>

        <div className="teacher-dashboard__grid">
          <article className="teacher-dashboard__next">
            <div>
              <p className="eyebrow">Direkt loslegen</p>
              <span className="teacher-dashboard__status">Vorbereitung</span>
            </div>
            <h2>Live-Unterricht vorbereiten</h2>
            <p>
              Wähle Laufdiktat, Vokabeln oder Kopfrechnen und öffne danach einen
              Raum für deine Klasse.
            </p>
            <Link href="/lehrer/live">Runde vorbereiten →</Link>
          </article>

          <nav
            className="teacher-dashboard__shortcuts"
            aria-label="Schnellzugriff"
          >
            <Link href="/lehrer/klassen">
              <span>Klassen</span>
              <strong>Lerngruppen organisieren</strong>
              <small>Einschreibecodes und Zuordnungen</small>
            </Link>
            <Link href="/lehrer/aufgaben">
              <span>Aufgaben</span>
              <strong>Arbeit verteilen</strong>
              <small>Material und Fristen verbinden</small>
            </Link>
            <Link href="/lehrer/material">
              <span>Material</span>
              <strong>Inhalte verwalten</strong>
              <small>Pakete sichern und weitergeben</small>
            </Link>
            <Link href="/lehrer/einstellungen">
              <span>Einstellungen</span>
              <strong>Arbeitsplatz einrichten</strong>
              <small>Profil und lokale Datenbank</small>
            </Link>
          </nav>

          <aside className="teacher-dashboard__privacy">
            <span aria-hidden="true">●</span>
            <div>
              <strong>Dieses Gerät ist die Schutzgrenze.</strong>
              <p>
                Lehrkraftdaten bleiben lokal. Nutze deshalb ein geschütztes,
                nicht gemeinsam verwendetes Geräteprofil.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </TeacherCockpitShell>
  );
}
