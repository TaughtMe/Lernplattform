import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";

export const metadata: Metadata = { title: "Impressum" };

const CONTACT_EMAIL = "toby.bryson@sksbg.de";

export default function ImpressumPage() {
  return (
    <LegalPage
      eyebrow="Rechtliches"
      title="Impressum"
      intro="Angaben zum verantwortlichen Anbieter des Lernraums."
    >
      <aside className="ui-legal__beta" aria-labelledby="impressum-beta-title">
        <h2 id="impressum-beta-title">Beta-Test im geschlossenen Rahmen</h2>
        <p>
          Der Lernraum befindet sich in einer Beta-Testphase und wird
          ausschließlich in einem geschlossenen Rahmen mit ausgewählten
          Testpersonen erprobt. Er ist nicht öffentlich zugänglich.
        </p>
        <p>
          Derzeit liegen weder eine Auftragsverarbeitungsvereinbarung (AVV) noch
          eine abschließende Datenschutzerklärung vor. Bitte gib daher keine
          echten personenbezogenen Daten von Schülerinnen und Schülern ein und
          setze den Lernraum nicht im regulären Schulbetrieb ein.
        </p>
      </aside>

      <section>
        <h2>Angaben gemäß § 5 DDG und § 18 MStV</h2>
        <p>
          <strong>Verantwortlich:</strong> Toby Bryson
        </p>
        <p>
          <strong>Kontakt:</strong>{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <p>
          Nicht-kommerzielles Bildungsprojekt. Eine vollständige Anschrift wird
          auf Anfrage über die genannte E-Mail-Adresse mitgeteilt.
        </p>
      </section>

      <section>
        <h2>Urheberrecht</h2>
        <p>
          © 2026 Toby Bryson. Konzept, Quellcode und eigens erstellte Inhalte
          sind urheberrechtlich geschützt. Eingesetzte Open-Source-Software
          unterliegt den Lizenzbedingungen der jeweiligen Projekte.
        </p>
      </section>

      <section>
        <h2>Software für das Vorlesen</h2>
        <p>
          In der Vorschau kann der Lernraum Texte mit einem Sprachmodell
          (KittenTTS, Apache-2.0) auf dem Gerät vorlesen. Die Lautschrift
          erzeugt eSpeak NG unter der GNU General Public License, Version 3. Der
          Text verlässt dabei das Gerät nicht.
        </p>
        <p>
          <a href="/speech/phonemizer/HINWEISE.md">Herkunft und Lizenzen</a>
          {" · "}
          <a href="/speech/phonemizer/LIZENZ-GPL-3.0.txt">GPL-3.0</a>
          {" · "}
          <a href="/speech/phonemizer/quellen/espeak-ng_1.52.0+dfsg.orig.tar.gz">
            Quellen von eSpeak NG
          </a>
          {" · "}
          <a href="/speech/phonemizer/quellen/build.sh">Build-Skript</a>
        </p>
      </section>

      <section>
        <h2>Hinweis zum Angebot</h2>
        <p>
          Der Lernraum ist ein Bildungsprojekt in Entwicklung. Trotz
          sorgfältiger Prüfung kann keine Gewähr für Vollständigkeit,
          Richtigkeit und dauerhafte Verfügbarkeit übernommen werden.
        </p>
      </section>
    </LegalPage>
  );
}
