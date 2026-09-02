import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";

export const metadata: Metadata = { title: "Datenschutzerklärung" };

const CONTACT_EMAIL = "toby.bryson@sksbg.de";

export default function DatenschutzPage() {
  return (
    <LegalPage
      eyebrow="Datenschutz"
      title="Datenschutzerklärung"
      intro="Der Lernraum ist local-first aufgebaut: Persönliche Lernstände bleiben grundsätzlich auf dem verwendeten Gerät."
    >
      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          Toby Bryson, <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>

      <section>
        <h2>2. Lokale Lern- und Einstellungsdaten</h2>
        <p>
          Lernkarten, Übungsfortschritte und Einstellungen werden im Browser des
          Geräts gespeichert, unter anderem in IndexedDB, Local Storage und
          Session Storage. Sie werden nicht allein durch diese lokale
          Speicherung an den Betreiber übertragen. Beim Löschen der Browserdaten
          können diese Inhalte verloren gehen.
        </p>
        <p>
          Der Service Worker speichert für Offline-Nutzung technisch notwendige
          Seiten und Programmdateien im Browser-Cache. Er enthält keine
          personenbezogene Auswertung und kann über die Browserdaten entfernt
          werden.
        </p>
      </section>

      <section>
        <h2>3. Live-Räume</h2>
        <p>
          Beim Beitritt zu einem Live-Raum verarbeitet der Lernraum einen
          Raumcode, einen Anzeigenamen beziehungsweise eine Stationskennung,
          einen zufälligen Teilnehmertoken sowie pseudonyme Fortschrittsdaten.
          Raumzustand und Nachrichten werden über Supabase übertragen. Die
          Zugangsdaten für die laufende Sitzung werden zusätzlich im
          Sitzungsspeicher des Browsers gehalten.
        </p>
      </section>

      <section>
        <h2>4. Anmeldung für geschützte Bereiche</h2>
        <p>
          Soweit ein Bereich eine Anmeldung mit ChatGPT verlangt, werden die von
          der Anmeldefunktion bereitgestellte Nutzerkennung, E-Mail-Adresse und
          gegebenenfalls der Anzeigename zur Anmeldung und Zugriffssteuerung
          verarbeitet.
        </p>
      </section>

      <section>
        <h2>5. Hosting und technisch notwendige Verbindungsdaten</h2>
        <p>
          Die Anwendung wird über Cloudflare bereitgestellt; Live-Funktionen
          nutzen Supabase. Beim Aufruf verarbeiten diese Anbieter technisch
          notwendige Verbindungsdaten wie IP-Adresse, Zeitpunkt, angeforderte
          Ressource und Browserinformationen, um die Anwendung auszuliefern und
          abzusichern.
        </p>
      </section>

      <section>
        <h2>6. Kamera</h2>
        <p>
          Der QR-Scanner greift erst nach ausdrücklicher Freigabe auf die
          Gerätekamera zu. Die Bilder werden lokal im Browser ausgewertet und
          nicht als Bilddateien gespeichert oder übertragen.
        </p>
      </section>

      <section>
        <h2>7. Cookies und Reichweitenmessung</h2>
        <p>
          Der Lernraum setzt keine Werbe- oder Tracking-Cookies ein und nutzt
          kein eigenes Analysewerkzeug. Technisch notwendige Speicherungen für
          Anmeldung, Darstellung, Offline-Funktion und Lernfortschritt bleiben
          davon unberührt.
        </p>
      </section>

      <section>
        <h2>8. Rechte betroffener Personen</h2>
        <p>
          Betroffene Personen können im Rahmen der gesetzlichen Voraussetzungen
          Auskunft, Berichtigung, Löschung, Einschränkung oder Widerspruch
          verlangen und sich bei einer Datenschutzaufsichtsbehörde beschweren.
          Anfragen können an{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> gerichtet
          werden.
        </p>
      </section>
    </LegalPage>
  );
}
