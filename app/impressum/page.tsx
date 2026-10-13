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
