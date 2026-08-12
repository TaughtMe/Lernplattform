---
tags:
  - lernplattform
  - entscheidungsprotokoll
  - qr-synchronisation
  - klassenranking
status: beschlossen
stand: 2026-08-12
---

# Entscheidungsprotokoll

## Klassenmodus, Ranking und QR-Synchronisation – 12. August 2026

Dieses Protokoll hält die gemeinsam beschlossenen Architekturentscheidungen fest. Die fachlichen Details stehen weiterhin in den verlinkten Kapiteln; hier wird dokumentiert, **was** übernommen wird und **warum**.

## 1. Gemeinsame App und Rollen

**Beschlossen:** Lehrer und Schüler verwenden dieselbe Anwendung. Die Rolle entsteht nicht durch unterschiedliche App-Versionen, sondern durch getrennte lokale Arbeitsbereiche und Berechtigungen.

- Ein Schülergerät kann einen privaten Lernbereich und eine oder mehrere Klassenmitgliedschaften anzeigen.
- Ein Klassen-QR schaltet nur die von der Lehrkraft freigegebenen Schülerfunktionen, Inhalte und Übungen frei.
- Das Verlassen eines Klassenmodus erteilt niemals Lehrerrechte.
- Der Lehrerbereich benötigt eine eigene Authentifizierung, beispielsweise Lehrerlogin, Passkey oder lokale Lehrer-PIN.
- Schülergeräte zeigen den Lehrerbereich nicht als frei zugänglichen Moduswechsel an.
- Persönliche Schülerdaten, Klasseninhalte und Lehrerdaten werden lokal getrennt gespeichert.

Siehe [[../01 - Plattform und Navigation/Anwendung|Plattform und Navigation]] und [[../13 - Datenschutz und Rollen/Anwendung|Datenschutz und Rollen]].

## 2. Local-first und drei getrennte Datenflüsse

**Beschlossen:** Die vollständige persönliche Lernhistorie bleibt grundsätzlich auf dem Schülergerät.

Es werden drei voneinander getrennte Datenflüsse verwendet:

1. **Persönlicher Lernstand:** lokal auf dem Schülergerät; enthält Vokabeln, Antworten, Fehler, Boxstände, Fälligkeiten und Lernhistorie.
2. **Optionales persönliches Cloud-Backup:** freiwillige, verschlüsselte Sicherung für Gerätewechsel und geräteübergreifende Nutzung; die Lehrkraft erhält keinen Zugriff.
3. **Klassenbeitrag:** bewusst erzeugter, stark reduzierter QR-Leistungsbrief für Ranking und Abgabeprotokoll.

Eine permanente Schüler-Lehrer-Synchronisation über Supabase oder ein anderes Backend ist für Version 1 nicht vorgesehen. Das Lehrergerät speichert keine vollständige Kopie der Schüler-Lernstände.

Siehe [[../12 - Inhaltsübertragung und Synchronisation/Anwendung|Inhaltsübertragung und Synchronisation]] und [[../14 - Lokale Daten, Export und Cloud-Backup/Anwendung|Lokale Daten, Export und Cloud-Backup]].

## 3. Individuelle Klasseneinschreibung

**Beschlossen:** Die Lehrkraft legt ihre Klasse lokal an und erzeugt für jeden Schüler einen individuellen Einschreibungs-QR-Code.

- Jeder Schüler erhält vor der ersten Kopplung eine feste pseudonyme Mitgliedschafts-ID.
- Die Lehrkraft kann dieser ID ausschließlich lokal einen Klarnamen oder Alias zuordnen.
- Der QR-Code enthält keine Hardwarekennung und verwendet kein Geräte-Fingerprinting.
- Wiederholtes Scannen desselben Einschreibungs-QR-Codes erzeugt kein neues Schülerprofil.
- Beim ersten gültigen Leistungsbrief wird die Mitgliedschaft an den Schlüssel des Schülergeräts gebunden.
- Ein Ersatz- oder Zweitgerät erfordert eine ausdrückliche Bestätigung durch die Lehrkraft.
- Ein Gerätewechsel kann später über ein persönliches verschlüsseltes Backup oder einen geregelten Übertragungsprozess erfolgen.

Damit werden doppelte Schülerprofile vermieden, ohne Geräte dauerhaft technisch identifizieren zu müssen.

## 4. QR-Leistungsbrief

**Beschlossen:** Rankingbeiträge werden als kleiner, verschlüsselter und signierter QR-Leistungsbrief übertragen.

Der QR-Leistungsbrief enthält nur die für den festgelegten Zweck erforderlichen Werte:

- Formatversion
- Klassen- und Mitgliedschafts-ID
- Turnus- oder Aufgabenpaket-ID
- Berichtszeitraum
- fortlaufende Standnummer
- Paket-ID beziehungsweise Paket-Hash
- aggregierte Rankingwerte, etwa Lernrunden, Tagesziele, Verbesserungs- und Wochenpunkte
- digitale Signatur

Nicht standardmäßig übertragen werden vollständige Antworten, einzelne Tippfehler, private Inhalte oder die gesamte Lernhistorie.

Für Rankingbeiträge wird ein vollständiger kleiner Zwischenstand statt eines bestätigungspflichtigen Deltas verwendet. Das Lehrergerät übernimmt nur eine höhere Standnummer. Derselbe QR-Code darf deshalb gefahrlos erneut gezeigt werden.

## 5. Air-Gap ohne Rückkanal

**Beschlossen:** Die QR-Übertragung funktioniert ohne Netzwerkverbindung zwischen Schüler- und Lehrergerät.

- Das Schülergerät kann technisch nicht erkennen, ob der Code gelesen wurde.
- Der QR-Code bleibt ruhig sichtbar, bis der Schüler ihn selbst schließt.
- Das Schülergerät zeigt keine fingierte Erfolgsanimation und keinen falschen Haken.
- Die Scanbestätigung erscheint ausschließlich auf dem Lehrergerät.
- Ein zusätzlicher Bestätigungs-QR vom Lehrer- zum Schülergerät wird wegen des langsamen Gerätewechsels nicht verwendet.

## 6. Fortlaufender Scanmodus und Klassenbriefkasten

**Beschlossen:** Die Lehrkraft scannt Codes in einem fortlaufenden Modus ohne einzelnen Bestätigungsdialog.

Nach jedem Scan zeigt das Lehrergerät:

- kurzen Ton oder Vibration
- grünen Rahmen bei gültiger Übernahme
- lokalen Namen oder Alias
- neuen, doppelten, veralteten, ungültigen oder klassenfremden Status

Für jeden Turnus oder jedes Aufgabenpaket führt das Lehrergerät ein lokales Abgabeprotokoll:

```text
Klassenbriefkasten · 18 von 26 abgegeben

✓ Anna      abgegeben
✓ Ben       abgegeben
○ Clara     ausstehend
○ David     ausstehend
```

Minimal gespeichert werden Mitgliedschaft, Turnus, höchste Standnummer, Paketnachweis, Eingangszeitpunkt und Status. Die Lehrkraft kann fehlende Abgaben filtern, einen Turnus abschließen und das Protokoll nach einer festgelegten Frist löschen.

Siehe [[../04 - Lehrer-Cockpit/Anwendung|Lehrer-Cockpit]] und [[../11 - QR-Auswertung und Visualisierung/Anwendung|QR-Auswertung und Visualisierung]].

## 7. Klassenranking

**Beschlossen:** Das Ranking wird lokal auf dem Lehrergerät berechnet und gespeichert. Schüler liefern nur die freigegebenen aggregierten Beiträge.

Das Ranking soll Fleiß und Entwicklung fördern, insbesondere:

- regelmäßige sinnvolle Lernrunden
- erreichte Tagesziele
- persönliche Verbesserungen
- früher falsche Inhalte später richtig lösen
- gemeinsame Klassen- und Hausziele

Geschwindigkeit, reine absolute Leistung und unbegrenztes Punktesammeln werden nicht bevorzugt. Vorgesehen sind Tageslimits, Wochenzeiträume, Aliasnamen und vorzugsweise Teamwerte oder positive Entwicklungen statt einer öffentlichen Rangliste vom stärksten bis zum schwächsten Schüler.

Lokal erzeugte Werte bleiben technisch manipulierbar. Das Ranking dient deshalb der Motivation und ist kein belastbarer Nachweis für benotete Leistungen.

Siehe [[../10 - Häuser, Punkte und Motivation/Anwendung|Häuser, Punkte und Motivation]].

## 8. QR-Formate

**Beschlossen:**

- Ein einzelner statischer QR-Code ist der Standard für Rankingbeiträge und kleine Zwischenstände.
- Größere Lernhistorien können später über animierte QR-Codes übertragen werden.
- Ein 2×2-Mehrfachcode kann später als experimenteller Schnellmodus geprüft werden.
- 4×4-Mehrfachcodes gehören nicht zum ersten produktiven Umfang.
- Ein eigener Partikelcode nach dem Vorbild der Apple-Watch-Kopplung wird nicht entwickelt.
- Eine äußere Animation darf den QR-Code optisch begleiten, darf aber keinen erfolgreichen Scan vortäuschen oder die Lesbarkeit beeinträchtigen.

## 9. Datenschutzentscheidungen

**Beschlossen:** Datenschutz wird durch Datenminimierung und technische Trennung umgesetzt, nicht durch den Versuch, Personenbezug zu umgehen.

- Pseudonyme Mitgliedschaften bleiben personenbezogen, sobald die Lehrkraft sie lokal zuordnen kann.
- Klarnamen und Zuordnungstabellen bleiben ausschließlich auf dem geschützten Lehrergerät.
- Keine Hardwarekennung und kein Browser-Fingerprinting.
- Keine automatische Cloudübertragung von Klassenbeiträgen in Version 1.
- Löschfristen, Export und manuelles Löschen werden vorgesehen.
- Vor einem Schuleinsatz müssen Zweck, Rechtsgrundlage, Informationspflichten und organisatorische Zuständigkeiten geprüft werden.

## 10. Bewusst nicht übernommen

- permanente Echtzeit-Synchronisation aller Schüleraktivitäten mit einem Backend
- vollständige Lernhistorie auf dem Lehrergerät
- allgemeiner Klassen-QR als Erzeuger beliebig vieler unkontrollierter Schülerprofile
- automatisch zugänglicher Lehrerbereich auf Schülergeräten
- verpflichtender Rückbestätigungs-QR nach jeder Abgabe
- eigener Partikel-, Farb- oder 3D-Code für Version 1
- öffentliche vollständige Rangliste aller Schüler nach absoluter Leistung

## 11. Noch offen

- genaue Lehrer-Authentifizierung und Wiederherstellung
- konkrete Löschfristen für Klassenlisten, Ranking und Abgabeprotokolle
- verbindliche Zusammensetzung und Begrenzung der Rankingpunkte
- Verfahren für freiwillige Nichtteilnahme ohne Nachteil
- genauer Ablauf beim Ersatz- oder Zweitgerät
- Datenformat und Fragmentierung animierter QR-Codes
- schulrechtliche und organisatorische Freigabe vor produktivem Einsatz

Die daraus abgeleiteten Umsetzungsschritte stehen in [[../18 - Aufgabenübersicht/Anwendung|Aufgabenübersicht]].

## 12. Geräteübergreifende Entwicklung – 12. August 2026

**Beschlossen:** Lernraum wird von Beginn an mobile-first für Smartphones, Tablets, Chromebooks, Notebooks und Desktopgeräte entwickelt. Eine nachträgliche separate Mobilversion ist nicht vorgesehen.

- Gemeinsame responsive Komponenten werden im Plattformkern gepflegt.
- Jede neue Funktion muss Touch, Maus, Tastatur, Hoch- und Querformat berücksichtigen.
- Smartphones werden ab 320 CSS-Pixel Breite unterstützt.
- Touch-Ziele, Safe Areas und Bildschirmtastatur dürfen keine zentralen Aktionen verdecken.
- Die Abnahme umfasst iOS Safari, Android Chrome sowie die verbreiteten Desktop-Browser.
- Laufdiktat und LernBox verwenden dieselben Navigations-, Layout- und Geräteprinzipien.

Die konkrete Testmatrix steht zusätzlich in `docs/device-support.md` des Projektrepositories.

## 13. Qualitätskontrolle als Entwicklungsbestandteil – 12. August 2026

**Beschlossen:** Qualitätssicherung wird nicht erst vor der Veröffentlichung ergänzt. Jede Funktion erhält fachliche, technische, gerätebezogene, barrierebezogene, sicherheitsbezogene und datenschutzbezogene Abnahmekriterien.

- Ein erfolgreicher Build allein reicht nicht für eine Freigabe.
- Datenverlust, Migration, Offlinebetrieb, Wiederherstellung und fehlerhafte Eingaben gehören zu den regulären Testfällen.
- Größere Meilensteine erhalten einen kurzen Qualitätsbericht und eine ausdrückliche Freigabestufe.
- Pilotbetrieb erfolgt begrenzt, mit Sicherungsmöglichkeit, Rückfallplan und dokumentierten Einschränkungen.
- Automatisierte Prüfungen werden durch reale Geräte-, Browser- und Nutzertests ergänzt.
- Pädagogische Regeln werden anhand konkreter Beispiele und nicht nur anhand technischer Funktion geprüft.

Die vollständige Definition of Done und Prüfstrategie steht unter [[../21 - Qualitätsgrundlage und Freigabe/Anwendung|Qualitätsgrundlage und Freigabe]].

## 14. Technischer Qualitäts- und Bibliotheksstandard – 12. August 2026

**Beschlossen:** Nutzerfreundlichkeit, pädagogische Regeln, Barrierefreiheit, Datenintegrität und Gerätekompatibilität werden durch verbindliche Coding-Regeln und automatische Quality Gates abgesichert.

- Fachlogik bleibt framework-unabhängiges, streng typisiertes TypeScript.
- Zod validiert alle Daten an Systemgrenzen; Dexie kapselt später den lokalen IndexedDB-Speicher.
- Vitest, Testing Library und fast-check prüfen Beispiele, reale Interaktionen und generierte Grenzfälle.
- Playwright testet Chromium, Firefox, WebKit sowie Mobil- und Tabletprofile.
- axe-core ergänzt Browserprüfungen um automatische WCAG-A/AA-Kontrollen.
- ESLint verhindert unzulässige Abhängigkeiten des fachlichen Kerns auf React oder Next.
- GitHub Actions führt den vollständigen Qualitätscheck automatisch aus.
- React Aria Components wird nur für komplexe Widgets eingesetzt; natives HTML bleibt der Standard.
- Neue Bibliotheken benötigen einen konkreten Qualitätsnutzen und eine Architekturbegründung.

Bekannte, nicht sofort behebbare Abhängigkeitsrisiken werden mit Reichweite, Gegenmaßnahme und Neubewertung dokumentiert.

## 15. Erster vertikaler Lernweg – 12. August 2026

**Beschlossen und umgesetzt:** Neue Lernfunktionen werden zunächst als kleine vollständige Abläufe gebaut. Der erste Durchstich öffnet ein versioniertes Beispiel-Lernpaket, lässt eine Vokabel beantworten, speichert ein unveränderliches Lernereignis lokal in IndexedDB und zeigt daraus den Lernstand an.

- Die Fachlogik für Antwortprüfung und Fortschritt bleibt unabhängig von React und Dexie.
- Die Oberfläche greift nur über ein typisiertes Repository auf den lokalen Speicher zu.
- Richtige und falsche Versuche werden gespeichert; ein Fehler verschwindet nicht als scheinbar leerer Lernstand.
- Der Lernstand bleibt nach einem Neuladen auf demselben Gerät erhalten.
- Der Ablauf dient als Integrationsmuster für LernBox und Laufdiktat, ohne deren wechselnde Oberflächen vorwegzunehmen.
- Browser-, Mobil-, Mindestbreiten- und Barrierefreiheitstests gehören zur Abnahme dieses Durchstichs.

## 16. Schülereinstieg, freies Üben und Klassenarbeitsraum – 12. August 2026

**Beschlossen:** Nach einem sauberen Schülereinstieg werden Klassen und freies Üben getrennt angeboten. Freies Üben enthält alle verfügbaren Grundfunktionen zur freien Auswahl und bleibt persönlich. Eine Klasse kann technisch alle Module aufnehmen; die erstellende Lehrkraft entscheidet jedoch pro Klasse, welche Module sichtbar und nutzbar sind.

Innerhalb der Klasse bündelt **Heute üben** fällige Inhalte sowie durch Fehler oder die Lehrkraft aktivierte Wiederholungen. **Aufgaben** zeigt sämtliche veröffentlichten Arbeitsaufträge. Lernereignisse aus beiden Klassenbereichen können einen ausdrücklichen rankingfähigen Klassenkontext tragen. Persönliche LernBox und freies Üben werden nicht automatisch geteilt.

## 17. Reduzierte Hauptseite und getrennte Einstiege – 12. August 2026

**Beschlossen:** Die Hauptseite enthält zentral nur **Mein Lernraum**, **Freies Üben** und darunter den Code-Beitritt. Öffentliche Beispielgruppen sowie direkte Einstiege zu Duell und Haus werden entfernt. Mein Lernraum listet ausschließlich alle Klassen und bietet erneut den Code-Beitritt. Für die Aufbauphase bleiben Deutsch, Mathematik, Vokabeln und Tipptraining aktiv; die spätere Lehrer-Konfiguration schränkt sie pro Klasse ein.

## 18. Lokale Lehrer-Konfiguration vor Veröffentlichung – 12. August 2026

**Beschlossen:** Modulfreigaben werden zunächst im getrennten lokalen Lehrerbereich bearbeitet und dort gespeichert. Eine Schülervorschau zeigt die beabsichtigte Sichtbarkeit, verändert aber noch nicht direkt den Schülerbereich. Erst eine bewusste spätere Veröffentlichung erzeugt ein versioniertes Klassenpaket für Schülergeräte. So bleibt die technische Trennung zwischen Lehrer- und Schülerdaten erhalten.

## 19. Übungsplattform statt allgemeiner Aufgabenplanung – 12. August 2026

**Beschlossen:** Der Kern des Lernraums ist selbstständiges Üben und Wiederholen. Die Lehrkraft erstellt im Normalfall keine freien Aufgabenpakete, sondern aktiviert pro Klasse die benötigten Übungsbereiche und sieht datensparsam, was bearbeitet wurde. **Heute üben** entsteht aus Fälligkeiten, Fehlern und passenden Wiederholungsregeln. Nur fachlich definierte Angebote wie Schreibtrainings in Deutsch können später als strukturierte Trainingspakete gezielt freigeschaltet werden. Ein allgemeiner Aufgabenplaner gehört nicht zum Plattformkern.

## 20. Leitner-Fälligkeiten werden aus Ereignissen abgeleitet – 12. August 2026

**Beschlossen:** Boxstand und nächste Wiederholung werden aus der unveränderlichen lokalen Lernhistorie berechnet und nicht als konkurrierender Zustand doppelt gespeichert. Bedeutung und Schreiben bleiben getrennt. Fehler werden sofort wiederholbar, eine spätere richtige Lösung schließt den Fehler ohne direkten Aufstieg, Hilfen verhindern den Aufstieg und pro Runde ist höchstens ein Aufstieg möglich. Die erste Intervallstaffel 1 / 3 / 7 / 14 / 30 Tage ist eine zentrale, vorläufige Ausgangsbasis und muss pädagogisch erprobt werden.
