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
          einen zufälligen Teilnehmertoken sowie pseudonyme Fortschrittsdaten
          einschließlich falsch geschriebener Wörter. Raumzustand und
          Nachrichten werden über Supabase übertragen. Die Zugangsdaten für die
          laufende Sitzung werden zusätzlich im Sitzungsspeicher des Browsers
          gehalten.
        </p>
        <p>
          Bei Mathe-Aufgaben überträgt das Gerät zusätzlich die erste falsche
          Antwort je Aufgabe (höchstens 32 Zeichen) an die Lehrkraft. Sie leitet
          daraus für den CSV-Export auf ihrem Gerät eine Vermutung zur Fehlerart
          ab; die Oberfläche zeigt sie nicht an. Wie die Fehlerzahlen ist die
          Antwort pseudonym und gehört nur zum Raum: Ein Raum schließt
          spätestens 120 Minuten nach dem Öffnen, bei Inaktivität nach drei
          Stunden. Der Server löscht ihn mit allen Fortschrittsdaten, wenn sein
          Ende 24 Stunden zurückliegt. Bei Text und Vokabeln werden keine
          Antworten übertragen.
        </p>
      </section>

      <section>
        <h2>4. Übergabe von Vokabelpaketen über Supabase</h2>
        <p>
          Lehrkräfte können Vokabelpakete per QR-Code oder Übergabecode auf die
          Geräte von Schülerinnen und Schülern geben. Dazu wird das Paket
          (Vokabelkarten mit Begriffen, Übersetzungen und Sprachangaben) im
          Browser der Lehrkraft verschlüsselt und als verschlüsselter Datensatz
          bei Supabase abgelegt. Der Server speichert das verschlüsselte Paket
          und die Zugangsschlüssel nur als Prüfwerte (Hashes). Der Schlüssel zum
          Entschlüsseln steckt im QR-Code beziehungsweise im Übergabecode, den
          die Lehrkraft weitergibt. Das Paket wird für höchstens 24 Stunden
          vorgehalten und danach gelöscht. Wer den QR-Code oder den Code kennt,
          kann das Paket in dieser Zeit abrufen; deshalb sollten sie nur an die
          vorgesehene Gruppe weitergegeben werden. Angaben zum Serverstandort
          von Supabase und zum Auftragsverarbeitungsvertrag werden ergänzt,
          bevor der Lernraum mit echten Schülerdaten eingesetzt wird.
        </p>
      </section>

      <section>
        <h2>5. Sprachausgabe</h2>
        <p>
          Das Vorlesen von Wörtern und Texten nutzt die Sprachausgabe des
          Browsers (Web Speech API). Der Lernraum sendet dafür keine Texte an
          einen eigenen Sprachdienst. Welche Stimme gesprochen wird, hängt vom
          Gerät ab: Sind nur lokal installierte Systemstimmen vorhanden, bleibt
          der Text auf dem Gerät. Bietet der Browser oder das Betriebssystem
          Online-Stimmen an (zum Beispiel in Chrome, Edge oder auf manchen
          Android-Geräten und Chromebooks), kann der vorzulesende Text zur
          Erzeugung der Sprache an den Anbieter dieser Stimme übermittelt
          werden. Darauf hat der Lernraum keinen Einfluss; es gelten die
          Datenschutzhinweise des jeweiligen Browser- oder Geräteherstellers.
          Vorgelesen werden Texte aus dem Lernraum, gegebenenfalls auch von
          Lehrkräften oder Kindern selbst angelegte Inhalte.
        </p>
      </section>

      <section>
        <h2>6. Hosting und technisch notwendige Verbindungsdaten</h2>
        <p>
          Die Anwendung wird über Cloudflare bereitgestellt; Live-Funktionen
          nutzen Supabase. Beim Aufruf verarbeiten diese Anbieter technisch
          notwendige Verbindungsdaten wie IP-Adresse, Zeitpunkt, angeforderte
          Ressource und Browserinformationen, um die Anwendung auszuliefern und
          abzusichern.
        </p>
      </section>

      <section>
        <h2>7. Kamera</h2>
        <p>
          Der QR-Scanner greift erst nach ausdrücklicher Freigabe auf die
          Gerätekamera zu. Die Bilder werden lokal im Browser ausgewertet und
          nicht als Bilddateien gespeichert oder übertragen.
        </p>
      </section>

      <section>
        <h2>8. Cookies und Reichweitenmessung</h2>
        <p>
          Der Lernraum setzt keine Werbe- oder Tracking-Cookies ein und nutzt
          kein eigenes Analysewerkzeug. Technisch notwendige Speicherungen für
          Darstellung, Offline-Funktion, Geräte-Abgleich und Lernfortschritt
          bleiben davon unberührt.
        </p>
      </section>

      <section>
        <h2>9. Optionaler Geräte-Abgleich für Lehrkräfte</h2>
        <p>
          Lehrkräfte können ihre Daten (Material, Aufgaben, Klassen und
          wahlweise Schülerliste, Ergebnisse und Schlüssel) zwischen ihren
          eigenen Geräten abgleichen. Die Daten liegen dabei in einem
          Cloud-Speicher, den die Lehrkraft selbst wählt (WebDAV, Microsoft
          OneDrive oder Google Drive) und der keinen Zugriff durch den
          Lernraum-Betreiber ermöglicht. Die Lehrkraft entscheidet über Anbieter
          und Umfang und ist für die Übertragung verantwortlich; wir empfehlen,
          die Datei mit einem Passwort zu verschlüsseln, sobald Daten von
          Kindern enthalten sind. Ohne Einrichtung findet kein Abgleich statt.
        </p>
      </section>

      <section>
        <h2>10. Rechte betroffener Personen</h2>
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
