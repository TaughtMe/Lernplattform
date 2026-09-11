# Reparaturplan und Abgleich vom 8. September 2026

Ausgangspunkt: Lernplattform `codex/foundation` bei `f79d6a1`.
Laufdiktat: lokaler Quellstand und am 8. September erneut abgefragter GitHub-HEAD
`6c2ade41eadd2721f051df168244ed09563cea21`.

## Quellen und Grenzen

- `docs/upstream-integration.md` und der eingecheckte Obsidian-Vault, insbesondere
  Unterrichtsraum (02), Datenschutz/Rollen (13), Datenmodell (15) und Qualität (21).
- Zusätzlich wurde der tatsächliche Vault unter `Schule 2.0/98.Ideen/01.Programmieren/Lernplattform`
  gelesen. Seine Notiz `15a - Lernereignis-Modell` fehlt im Repositoryexport;
  sie bestätigt unveränderliche Ereignisse. Einzelne lokale Notizen sind älter
  und knapper als der Repositoryexport (z. B. Rollen/PIN). Die Reparatur führt
  deshalb keine neue Profil-, Login- oder Freigabeoberfläche ein.
- Im Original meldet `Game.tsx` beim Abschluss den letzten gültigen Index.
  Lernraum sendet fälschlich die Aufgabenanzahl. Der Stationsmodus verwendet bereits
  den richtigen Vertrag und bleibt erhalten.
- Fehlende Wiederaufnahmefelder und das zu spät greifende Beitrittslimit stammen
  bereits aus dem Original. Sie werden nicht als gewünschtes Verhalten übernommen.
- Der globale Rechteentzug für Materialtransfer und die Lehrkraftfreigabe sind
  Lernraum-spezifisch.
- Lokale Lehrerübersichten werden laut Vault über Geräte-/Browserprofile geschützt.
  Ein neuer Login oder eine Freischaltung weiterer Pilotfunktionen ist kein Teil
  dieser Fehlerbehebung. Die Original-App bleibt unverändert.

## Umsetzung und Akzeptanzkriterien

1. Abschluss und Wiederaufnahme: letzter gültiger Aufgabenindex; Fehlerdetails und
   Dauer bleiben erhalten; Erfolg erst nach bestätigter Speicherung; fehlgeschlagene
   Übertragung sichtbar und wiederholbar. Text, Vokabeln, Mathematik, Übung, Battle
   und Stationen bleiben durch bestehende und ergänzte Tests geschützt.
2. SQL: additive Migration für dauerhafte Zählung abgelehnter Beitritts- und
   Lehrkraftversuche, serialisierte Zähler, gezielte Wiederherstellung der
   Transferrechte und vollständigen Fortschrittsabruf. Direkter Tabellenzugriff
   bleibt gesperrt; fremde Tokens werden abgewiesen.
3. Speicherung: Ereignisse validieren und unveränderlich ergänzen; derselbe Versuch
   darf nur einmal wirken; unterschiedliche Fehlversuche bleiben erhalten;
   konkurrierende Tastschreibrunden verlieren keine Aktualisierung.
4. Wartbarkeit: Fortschrittsversand als eigener testbarer Baustein; validierte
   RPC-Antworten und gespeicherte Raumidentitäten. Keine pauschale Umstrukturierung
   unbeteiligter Module.
5. Prüfung: echte SQL-Verhaltens-/Berechtigungstests nach vollständiger Migration,
   gezielte Regressionen, vollständiger lokaler Qualitätscheck und Chromium mit
   Desktop, Mobilgerät und 320 Pixeln samt axe. Ergebnisse und verbleibende
   Betriebsgrenzen werden nach der Durchführung dokumentiert.

## Ergebnis der Umsetzung (9. September 2026)

- Schritte 1–4 sind umgesetzt. Der Stationsvertrag und die fachlichen
  Bewertungsregeln bleiben unverändert. Die Übertragungswarteschlange schreibt
  in Reihenfolge und hält fehlgeschlagene Ergebnisse bis zur Wiederholung im
  geöffneten Tab. Ein Verbindungswechsel versucht die Übertragung erneut.
- 193 Unit-/Komponententests, sechs SQL-Verhaltenstests und sechs
  Server-Rendering-Prüfungen bestanden. Die konfigurierten Coverage-Grenzen
  werden erreicht (Statements 91,02 %, Branches 85,38 %, Funktionen 91,74 %,
  Zeilen 92,26 % beim vollständigen Check).
- Der bestehende Chromium-Lauf besteht mit 15 erfolgreichen Tests. 69 Tests
  sind durch die bereits vorhandenen Pilot-/Konfigurationsbedingungen
  übersprungen; sie sind ausdrücklich kein Nachweis für die ausgeblendeten
  Plattformoberflächen. Die Fach-/Speichertests dieser Module laufen weiter.
- Der zusätzliche Live-Ablauf prüft Abschluss, fehlgeschlagenen Versand,
  Tastatur-Wiederholung, erfolgreiche Bestätigung und Wiederaufnahme auf
  Desktop, Pixel-Profil und 320 Pixeln, einschließlich axe und Touch-Zielgröße.
- `npm audit` meldet nach gezieltem Update von `fast-uri` und `fflate`
  null bekannte Schwachstellen. Direkte Produktabhängigkeiten bleiben gleich.

## Betriebsgrenzen

Die neue Migration ist im Repository vorbereitet und vollständig in PGlite
ausgeführt. Sie wurde nicht auf die produktive Supabase-Datenbank angewendet.
Docker Desktop scheitert lokal am vorhandenen Inference-Dienst; daher sind
Cron-Ausführung, das reale PostgREST-Gateway, Datenbank-Advisors und parallele
Verbindungen nicht lokal geprüft. Der Test ersetzt nur die Cron-Registrierung,
nicht die SQL-Funktionskörper oder Berechtigungen. Vor einem produktiven Rollout
sind die Migration und diese Prüfungen in einer Supabase-Testumgebung auszuführen.

Die Warteschlange ist bewusst sitzungsgebunden. Ein endgültig geschlossener Tab
stellt ungesendete Ergebnisse nicht wieder her; Fehlermeldung und Exit-Warnung
weisen auf das Offenhalten hin. Geräteübergreifende Profile, vollständiges
Neuberechnen alter Lernstände aus Ereignissen und die weitere Aufteilung großer
Lehrkraftkomponenten bleiben eigene Architekturarbeiten. Vorhandene Ereignisse
und gespeicherte Lernstände werden durch diese Reparatur nicht umgeschrieben.

Es wurde nichts gepusht oder veröffentlicht; die Änderungen liegen auf
`codex/foundation` für die Prüfung bereit.
