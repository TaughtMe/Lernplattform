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
        <h2 id="impressum-beta-title">
          Beta-Betrieb in einzelnen Schulklassen
        </h2>
        <p>
          Der Lernraum ist in einer Beta-Phase. Er wird in einzelnen
          Schulklassen im Unterricht erprobt. Verantwortlich ist eine
          Privatperson, keine Schule, kein Schulträger und kein Unternehmen.
        </p>
        <p>
          Der Lernraum ist kostenlos und zeigt keine Werbung. Er ist nicht von
          einer Schulbehörde geprüft oder freigegeben. Eine
          Auftragsverarbeitungsvereinbarung (AVV) liegt nicht vor. Bitte gib
          deshalb keine echten Namen von Schülerinnen und Schülern und keine
          Angaben zu Förderbedarf oder LRS ein.
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
