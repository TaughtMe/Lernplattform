import type { Metadata } from "next";
import Link from "next/link";
import { TeacherClassConfigurator } from "../components/teacher-class-configurator";
import { TeacherContentTransfer } from "../components/teacher-content-transfer";
import { TeacherLiveRoom } from "../components/teacher-live-room";
import {
  TeacherAssignmentManager,
  TeacherProfilePanel,
} from "../components/teacher-workspace-manager";

export const metadata: Metadata = { title: "Lehrerbereich" };

const navigation = [
  { href: "#uebersicht", label: "Übersicht" },
  { href: "#unterrichtsrunde", label: "Live-Unterricht" },
  { href: "#klassenverwaltung", label: "Klassen" },
  { href: "#inhaltsbibliothek", label: "Material" },
  { href: "#aufgabenverwaltung", label: "Aufgaben" },
  { href: "#lehrkraftprofil", label: "Einstellungen" },
] as const;

export default function Page() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const liveRoomConfig = url && publishableKey ? { url, publishableKey } : null;

  return (
    <main className="teacher-shell teacher-cockpit">
      <aside className="teacher-cockpit__sidebar">
        <Link className="teacher-cockpit__brand" href="/">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>
            <strong>Lernraum</strong>
            <small>Lehrkraft</small>
          </span>
        </Link>

        <nav aria-label="Lehrerbereiche">
          {navigation.map((item, index) => (
            <a
              className={index === 0 ? "is-active" : undefined}
              href={item.href}
              key={item.href}
              aria-current={index === 0 ? "page" : undefined}
            >
              <span aria-hidden="true" />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="teacher-cockpit__device">
          <strong>Lokaler Arbeitsplatz</strong>
          <small>Offline nutzbar</small>
          <span>● Daten bleiben auf diesem Gerät</span>
        </div>
      </aside>

      <div className="teacher-cockpit__content">
        <header className="teacher-cockpit__topbar">
          <div>
            <span className="teacher-cockpit__mobile-mark" aria-hidden="true">
              L
            </span>
            <strong>Lehrer-Cockpit</strong>
          </div>
          <Link href="/lernen">Zum persönlichen Lernraum</Link>
        </header>

        <section
          className="teacher-dashboard"
          id="uebersicht"
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
            <a className="button button--primary" href="#unterrichtsrunde">
              Unterrichtsrunde starten
            </a>
          </div>

          <div className="teacher-dashboard__grid">
            <article className="teacher-dashboard__next">
              <div>
                <p className="eyebrow">Direkt loslegen</p>
                <span className="teacher-dashboard__status">Vorbereitung</span>
              </div>
              <h2>Live-Unterricht vorbereiten</h2>
              <p>
                Wähle Laufdiktat, Vokabeln oder Kopfrechnen und öffne danach
                einen Raum für deine Klasse.
              </p>
              <a href="#unterrichtsrunde">Runde vorbereiten →</a>
            </article>

            <nav
              className="teacher-dashboard__shortcuts"
              aria-label="Schnellzugriff"
            >
              <a href="#klassenverwaltung">
                <span>Klassen</span>
                <strong>Lerngruppen organisieren</strong>
                <small>Einschreibecodes und Zuordnungen</small>
              </a>
              <a href="#aufgabenverwaltung">
                <span>Aufgaben</span>
                <strong>Arbeit verteilen</strong>
                <small>Material und Fristen verbinden</small>
              </a>
              <a href="#inhaltsbibliothek">
                <span>Material</span>
                <strong>Inhalte verwalten</strong>
                <small>Pakete sichern und weitergeben</small>
              </a>
              <a href="#lehrkraftprofil">
                <span>Einstellungen</span>
                <strong>Arbeitsplatz einrichten</strong>
                <small>Profil und lokale Datenbank</small>
              </a>
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

        <div className="teacher-tools">
          <div className="teacher-section-anchor" id="unterrichtsrunde">
            <TeacherLiveRoom liveRoomConfig={liveRoomConfig} />
          </div>
          <div className="teacher-section-anchor" id="klassenverwaltung">
            <TeacherClassConfigurator />
          </div>
          <div className="teacher-section-anchor" id="inhaltsbibliothek">
            <TeacherContentTransfer transferConfig={liveRoomConfig} />
          </div>
          <div className="teacher-section-anchor" id="aufgabenverwaltung">
            <TeacherAssignmentManager />
          </div>
          <div className="teacher-section-anchor" id="lehrkraftprofil">
            <TeacherProfilePanel />
          </div>
        </div>

        <nav
          className="teacher-cockpit__mobile-nav"
          aria-label="Mobile Lehrerbereiche"
        >
          {navigation.slice(0, 4).map((item, index) => (
            <a
              className={index === 0 ? "is-active" : undefined}
              href={item.href}
              key={item.href}
            >
              <span aria-hidden="true" />
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </main>
  );
}
