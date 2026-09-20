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
            <h1 id="teacher-overview-title">Übersicht</h1>
            <p>
              Von hier aus bereitest du Unterricht vor, verwaltest deine
              Lerngruppen und startest die nächste gemeinsame Runde.
            </p>
          </div>
          <div className="teacher-dashboard__primary-action">
            <Link className="button button--primary" href="/lehrer/live">
              Unterrichtsrunde starten
            </Link>
            <aside className="teacher-dashboard__privacy">
              <span
                className="teacher-dashboard__privacy-dot"
                aria-hidden="true"
              />
              <div>
                <strong>Dieses Gerät ist die Schutzgrenze.</strong>
                <p>
                  Lehrkraftdaten bleiben lokal. Nutze deshalb ein geschütztes,
                  nicht gemeinsam verwendetes Geräteprofil.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </TeacherCockpitShell>
  );
}
