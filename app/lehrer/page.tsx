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

export default function Page() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const liveRoomConfig = url && publishableKey ? { url, publishableKey } : null;
  return (
    <main className="teacher-shell">
      <header className="teacher-topbar">
        <Link className="brand" href="/" aria-label="Lernraum Startseite">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>Lernraum</span>
        </Link>
        <Link className="teacher-topbar__exit" href="/lernen">
          Zum persönlichen Lernraum
        </Link>
      </header>
      <section
        className="teacher-overview"
        aria-labelledby="teacher-overview-title"
      >
        <div className="teacher-overview__heading">
          <div>
            <p className="eyebrow">Lehrerbereich</p>
            <h1 id="teacher-overview-title">Unterricht lokal organisieren</h1>
            <p>
              Bereite Übungen vor, teile konkrete Inhalte und verwalte deine
              Klassen direkt auf diesem Gerät – ohne zusätzliches Lehrerkonto.
            </p>
          </div>
          <span className="teacher-local-note">Kein Login erforderlich</span>
        </div>

        <nav className="teacher-overview__actions" aria-label="Lehrerwerkzeuge">
          <a href="#lehrkraftprofil">
            <span>Arbeitsplatz einrichten</span>
            <strong>Profil und Datenbank</strong>
            <small>
              Persönliche Angaben und lokalen Datenbestand verwalten
            </small>
          </a>
          <a href="#klassenverwaltung">
            <span>Lerngruppen organisieren</span>
            <strong>Klassen und Schüler verwalten</strong>
            <small>Mehrere Klassen, Zuordnungen und Einschreibecodes</small>
          </a>
          <a href="#inhaltsbibliothek">
            <span>Material verwalten</span>
            <strong>Inhalte speichern und teilen</strong>
            <small>Lokale Pakete bearbeiten, sichern und freigeben</small>
          </a>
          <a href="#aufgabenverwaltung">
            <span>Arbeit verteilen</span>
            <strong>Aufgaben erstellen und zuteilen</strong>
            <small>Material und Frist mit mehreren Klassen verbinden</small>
          </a>
          <a href="#qr-werkzeuge">
            <span>Codes austauschen</span>
            <strong>QR-Codes erstellen und lesen</strong>
            <small>Aufträge ohne Schülernamen weitergeben und prüfen</small>
          </a>
          <a href="#unterrichtsrunde">
            <span>Direkt loslegen</span>
            <strong>Unterrichtsrunde vorbereiten</strong>
            <small>Text, Vokabeln oder Kopfrechnen live durchführen</small>
          </a>
        </nav>

        <p className="teacher-overview__privacy">
          <strong>Dieses Gerät ist die Schutzgrenze.</strong> Wer Zugriff auf
          den entsperrten Browser hat, kann auch die hier gespeicherten
          Lehrkraftdaten sehen und bearbeiten. Nutze deshalb ein geschütztes,
          nicht gemeinsam verwendetes Geräteprofil.
        </p>
      </section>
      <div className="teacher-section-anchor" id="lehrkraftprofil">
        <TeacherProfilePanel />
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
      <div className="teacher-section-anchor" id="unterrichtsrunde">
        <TeacherLiveRoom liveRoomConfig={liveRoomConfig} />
      </div>
    </main>
  );
}
