import type { Metadata } from "next";
import Link from "next/link";
import { CLASS_MODULE_LABELS } from "../../../src/domain/class-workspace";
import { demoClass } from "../../../src/domain/demo-class";
import { RoomCodeForm } from "../../components/room-code-form";

export const metadata: Metadata = { title: demoClass.name };

export default function ClassPage() {
  return (
    <main className="learning-room-shell class-context-shell">
      <header className="learning-room-topbar">
        <Link href="/lernen#klasse" className="back-link">
          ← Mein Lernraum
        </Link>
        <strong>{demoClass.name}</strong>
        <span>Organisatorischer Kontext</span>
      </header>

      <section className="class-context">
        <div className="class-context__heading">
          <p className="eyebrow">Meine Klasse · {demoClass.teacherName}</p>
          <h1>{demoClass.name}</h1>
          <p>
            Die Klasse ergänzt deinen persönlichen Lernraum um bereitgestellte
            Inhalte und gemeinsame Unterrichtsrunden. Sie führt keinen zweiten
            Lernstand.
          </p>
          <Link className="button button--primary" href="/lernen">
            Im persönlichen Lernraum üben
          </Link>
        </div>

        <section
          className="class-context__panel"
          aria-labelledby="class-content-title"
        >
          <div>
            <p className="eyebrow">Bereitgestellte Bereiche</p>
            <h2 id="class-content-title">Inhalte aus dieser Klasse</h2>
            <p>
              Übernommene Stapel und Listen erscheinen bei deinen Fächern und
              unter „Meine Inhalte“ mit sichtbarer Herkunft.
            </p>
          </div>
          <div className="module-chips" aria-label="Fachbereiche der Klasse">
            {demoClass.enabledModules.map((module) => (
              <span key={module}>{CLASS_MODULE_LABELS[module]}</span>
            ))}
          </div>
        </section>

        <section
          className="running-room-entry"
          aria-labelledby="class-room-title"
        >
          <div>
            <p className="eyebrow">Gemeinsame Runde</p>
            <h2 id="class-room-title">Unterrichtsraum beitreten</h2>
            <p>
              Gib den Code deiner Lehrkraft ein oder scanne den QR-Code. Die
              Ergebnisse fließen danach in deinen persönlichen Lernstand.
            </p>
          </div>
          <RoomCodeForm idPrefix="class-running-room" mode="auto" />
        </section>
      </section>
    </main>
  );
}
