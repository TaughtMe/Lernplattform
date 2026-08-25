---
tags:
  - lernplattform
  - entscheidungsprotokoll
  - qr-synchronisation
  - klassenranking
  - gamification
status: beschlossen
stand: 2026-08-25
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

## 21. Sichtbare Lernbox und plattformweites Theme – 12. August 2026

**Beschlossen:** Lernraum übernimmt das erprobte visuelle Fünf-Boxen-Muster und die Theme-Grundstruktur aus LernBoxV2. Die fachlichen Regeln des Lernraums bleiben dabei maßgeblich. Bedeutung und Schreiben werden als zwei getrennte Fächerreihen sichtbar, statt den Boxstand nur als Textwert zu nennen. Hell, Dunkel und System werden als semantische, lokal gespeicherte Plattformgrundlage umgesetzt und gehören ab jetzt zur Abnahme jeder neuen Oberfläche.

## 22. Dunkelmodus als warmes Anthrazit – 12. August 2026

**Beschlossen:** Der Dunkelmodus behält dieselbe zurückhaltende Flächenhierarchie wie der Lightmode. Hintergrund und neutrale Karten liegen farblich eng beieinander; große braune oder stark eingefärbte Flächen entfallen. Lernraum und freies Üben behalten ihre Unterscheidung durch äußerst subtile Rot- beziehungsweise Türkistönung. Header, Tags, Konturen, Schatten sowie Coral und Teal folgen den in der Designgrundlage dokumentierten Darkmode-Tokens.

## 23. LernBox-Sitzung statt Ein-Karten-Demo – 12. August 2026

**Beschlossen:** Die Vokabelansicht übernimmt aus LernBoxV2 die Sitzungsstruktur mit fälliger Kartenauswahl, Restanzeige, zwei Abfragerichtungen, Schreibmodus, Aufdecken mit Selbstbewertung und Abschluss. Es wird kein zweiter Karten- oder Boxstand aus LernBoxV2 übernommen. Jede Bewertung erzeugt ein gemeinsames Lernraum-Ereignis; daraus werden Bedeutung, Schreiben und Fälligkeit weiterhin abgeleitet. Aufdecken gilt als schwächerer Nachweis, bewertet kein Schreiben und führt wegen der sichtbaren Lösung nicht zum regulären Boxaufstieg.

## 24. LernBoxV2 und Laufdiktat werden integriert, nicht nachgebaut – 12. August 2026

**Beschlossen:** LernBoxV2 und Laufdiktat sind vollständig funktionsfähige Quellanwendungen. Ihre Fachlogik, Bedienabläufe, Komponenten und Tests werden in den Lernraum übernommen. Der Lernraum erfindet vorhandene Funktionen nicht neu, sondern ergänzt ausschließlich die gemeinsame Plattformhülle, Klassenfreigaben, Identitätszuordnung und Ergebnisübergabe.

Der zuvor beschriebene Ansatz, nur Oberflächenmuster oder einzelne Sitzungsstrukturen zu übernehmen, ist damit überholt. Dies betrifft insbesondere die Entscheidungen 20, 21 und 23, soweit dort eigenständige Lernraum-Regeln an die Stelle des vorhandenen LernBox-Verhaltens gesetzt wurden. Abweichungen vom jeweiligen Quellmodul müssen künftig ausdrücklich begründet und getestet werden. Als abgeglichene Ausgangsstände gelten LernBoxV2 `64051b6` und Laufdiktat `6c2ade4`.

## 25. LernBoxV2 als isoliert gebautes Quellmodul – 12. August 2026

**Beschlossen:** Die vollständige LernBoxV2-Quelle liegt im Lernraum unter `integrations/lernbox` und wird bei Entwicklung und Produktion automatisch mitgebaut. Sie läuft unter einem eigenen Pfad und behält dadurch ihre Dexie-Datenbank, internen Routen, PWA-Funktionen und vollständigen Bedienabläufe. Der Lernraum stellt außen den persönlichen Einstieg, Rücknavigation und die gemeinsame Theme-Präferenz bereit.

Diese erste Integration verändert keine fachlichen LernBox-Regeln. Die noch ausstehende Verbindung zu Klassenfreigaben und gemeinsamen Ergebnissen erfolgt über Adapter an den Modulgrenzen. Ein Browsertest erstellt und öffnet eine persönliche Lernbox in der eingebetteten Originalanwendung; die Einbettung gehört außerdem zur gemeinsamen Barrierefreiheits- und Gerätematrix.

## 26. LernBox und Laufdiktat als native Bestandteile – 13. August 2026

**Beschlossen:** Die Quellrepositories dienen als geprüfte Code- und Fachreferenz. Geeignete Fachlogik, Lernabläufe und Tests werden gezielt in die gemeinsame Lernraum-Architektur übernommen. Die Anwendungen werden nicht als getrennte PWAs, iframes oder vollständige App-Hüllen eingebettet.

- LernBox und Laufdiktat verwenden die globale Lernraum-Navigation, das gemeinsame responsive Theme und gemeinsame Datenbereiche.
- Eigene Router, PWA-Manifeste, Service Worker und allgemeine Theme- oder App-Einstellungen der Quellanwendungen werden nicht übernommen.
- Die ursprünglichen Leitner-Regeln der LernBox bleiben als framework-unabhängige Fachlogik erhalten und werden durch Tests gegen unbeabsichtigte Abweichungen geschützt.
- Fehler aus dem Laufdiktat werden über einen versionierten, dublettenfreien Adapter in die persönliche LernBox übergeben und dort sofort fällig.
- Upstream-Änderungen werden weiterhin commitgenau geprüft, aber nur als passende Änderungen in den gemeinsamen Lernraum portiert.

Diese Entscheidung ersetzt Entscheidung 25 vollständig und präzisiert Entscheidung 24. „Integrieren“ bedeutet die gezielte Wiederverwendung vorhandenen Codes innerhalb einer Anwendung, nicht den Betrieb einer PWA innerhalb der Lernraum-PWA.

## 27. Laufdiktat beginnt als persönlicher nativer Vertikalschnitt – 13. August 2026

**Beschlossen und umgesetzt:** Die Laufdiktat-Integration beginnt mit einem vollständigen persönlichen Lernweg im Deutschbereich. Dieser Schritt portiert die bereits geprüften reinen Fachfunktionen aus Laufdiktat `6c2ade4` und verbindet sie direkt mit der gemeinsamen LernBox, bevor Realtime und Lehrersteuerung folgen.

- Text- und Vokabelrunden verwenden den Ablauf Ansehen, Verdecken, Schreiben, Rückmeldung und Abschluss.
- Klassisches Laufdiktat und freies Üben mit deterministischen, stufenweisen Tipps bleiben unterscheidbar.
- Vokabeln unterstützen Alternativantworten und beide festen sowie die gemischte Abfragerichtung.
- Die Auswahl **alle / nur fehlerhafte / keine übernehmen** wirkt über `LearningBundleV1` auf die gemeinsame persönliche LernBox.
- Textfehler werden noch nicht vorschnell als normale Vokabeln gespeichert; dafür folgt der im Vault geplante Lernobjekttyp Lernwort.
- Live-Raum, Lehrer-Dashboard, Stationen und Battle bleiben nachfolgende Integrationsschritte und erhalten keine zweite App-Hülle.

## 28. Fachfunktionen vor Rollen- und Plattformbetrieb – 13. August 2026

**Beschlossen:** Die nächste Aufbauphase macht zunächst mehr der im Vault beschriebenen fachlichen Lernwege als zusammenhängende, lokal überprüfbare Funktionsprototypen sichtbar. Schülerkonten, Lehrerrollen, Klassenveröffentlichung, Ranking und Synchronisation werden in dieser Phase nicht vorgezogen.

- Der freie Übungsbereich dient als Werkstatt, in der Ablauf und Lernlogik mit eigenen Inhalten ausprobiert werden können.
- Ein Funktionsprototyp muss seinen fachlichen Ablauf vollständig zeigen und automatisiert geprüft sein, darf aber eine spätere dauerhafte Speicherung ausdrücklich ausklammern.
- Der erste neue Prototyp bildet die fünfstufige Lernwort-Merkstrecke einschließlich Blockgrößen, Hilferegel und Aufstiegs-/Rückstufungsempfehlung ab.
- Merkstufe und Leitner-Fälligkeit werden erst mit dem gemeinsamen Lernwort-Datenmodell dauerhaft gespeichert und bleiben fachlich getrennte Werte.
- Die Plattformoberfläche wird schrittweise über echte Lernwege zusammengeführt; reine Platzhalter werden nicht als fertige Module behandelt.

## 29. Tastaturfluss und direkte Lernworteingabe – 13. August 2026

**Beschlossen:** Schreibübungen werden auf einen ununterbrochenen Eingabefluss optimiert. Tastaturbedienung ist kein nachträglicher Zusatz, sondern Teil des fachlichen Ablaufs.

- Eine erwartete Texteingabe erhält automatisch den Fokus; Lernende müssen nicht mit Tab zwischen jedem Wort navigieren.
- Enter bestätigt Antworten. Muss eine Vorlage zuerst bewusst verdeckt werden, führt Enter von der Merkanzeige zur fokussierten Eingabe.
- Richtige Antworten zeigen nur eine kurze positive Bestätigung und wechseln automatisch zur nächsten sinnvollen Ansicht.
- Fehler bleiben sichtbar und benötigen einen bewussten erneuten verdeckten Abruf; Enter startet diesen ohne Mausweg.
- In Merkstufe 4 wird unmittelbar auf den Längenstrichen geschrieben. Die Striche sind funktionaler Eingaberaum und keine davon getrennte Dekoration.
- Der Deutschbereich erhält schrittweise feste Lernwortsammlungen mit Rechtschreibphänomen und den Strategien Silbieren, Verlängern, Ableiten und Merken.

## 30. Große Wortbanken, kleine Lernrunden und echte Merkwörter – 13. August 2026

**Beschlossen:** Eine feste Rechtschreibsammlung enthält mindestens 100 eindeutige Wörter, wird aber nicht automatisch als eine 100-Wörter-Runde abgefragt. Standardmäßig wählt die Merkstrecke 10 über die Wortbank verteilte Wörter; 5, 20 oder alle Wörter bleiben bewusst auswählbar.

**Merkwörter & Fremdwörter** sind ein eigener fachlicher Bereich. Wenn keine verlässliche Strategie wie Silbieren, Verlängern oder Ableiten greift, kennzeichnet Lernraum das Wort ausdrücklich als Merkwort. Das Wortbild wird dann über die Merkstrecke gesichert, ohne eine nicht tragfähige Regel zu behaupten.

## 31. Adaptiver Lernkreislauf als Produktkern – 13. August 2026

**Beschlossen:** Lernraum wird nicht nach einzelnen Apps oder Fächern strukturiert. Laufdiktat, LernBox, Deutsch, Kopfrechnen und Tastschreiben liefern beziehungsweise verarbeiten fachlich typisierte Lernsignale innerhalb eines gemeinsamen lokalen Förderkreislaufs.

- Die Klassenoberfläche verwendet verbindlich **Heute üben**, **Frei üben** und **Mein Fortschritt**.
- Vokabelfehler aktivieren LernBox-Wiederholungen; Rechtschreibfehler aktivieren Lernwörter; Rechenfehler aktivieren neue Aufgaben derselben Kopfrechenfamilie; Tippunsicherheiten aktivieren passende Tastensequenzen.
- Freies Üben ist eine vollwertige Lernleistung und wird positiv anerkannt.
- Klassisch mitgeteilte Übungsaufträge werden im passenden freien Bereich geöffnet und nicht automatisch auf Schülergeräte verteilt.
- Persönliches Lob würdigt jede sinnvolle Aktivität. Klassenpunkte sind davon getrennt, aggregiert und gedeckelt.
- Vollständige Lernsignale bleiben lokal; ein späterer QR-Klassenbeitrag enthält nur ausdrücklich freigegebene Zusammenfassungen.

Die verbindliche Beschreibung steht unter [[../22 - Adaptiver Lernkreislauf/Anwendung|Adaptiver Lernkreislauf]].

## 32. Direkter Fachzugang und separater Laufdiktat-Raum – 13. August 2026

**Beschlossen:** Lernraum verteilt vorerst keine festen Hausaufgaben auf Schülergeräte. Die Lehrkraft teilt einen Übungsbereich klassisch mit, der Schüler öffnet ihn unter **Frei üben**, und die Bearbeitung wird lokal berücksichtigt.

- Deutsch öffnet direkt die Lernwörter, Vokabeln direkt die LernBox und Mathematik direkt das Kopfrechnen aus der Laufdiktat-Fachlogik.
- Das klassische Laufdiktat ist keine Deutsch-Kachel. Raumcode oder QR-Code führen aus Klasse und freiem Bereich in Lobby und Spiel.
- Freie Übungsbereiche erhalten feste Orientierungssymbole. Klassen zeigen nur ein Symbol, wenn die Lehrkraft selbst eines hinterlegt hat.

## 33. QR-Scanner an allen Code-Einstiegen – 13. August 2026

**Beschlossen:** Raum- und Klassenbeitritt bieten überall dieselben zwei Wege: Code eintippen oder QR-Code mit der Kamera scannen. Die Kameraaktion erscheint auf Startseite, in **Meine Klassen**, im Klassenraum und unter **Freies Üben**. Lernraum extrahiert ausschließlich den erwarteten Code und öffnet keine beliebige Adresse aus einem gescannten QR-Code.

## 34. Nativer Laufdiktat-Raumbeitritt – 13. August 2026

**Beschlossen:** Der Laufdiktat-Raum wird als Lernraum-Ablauf integriert und nicht als zweite PWA eingebettet. Der Einstieg übernimmt den vierstelligen Raumcode oder QR-Code, fragt den Namen ab und führt mit der bestehenden sicheren Raumfunktion in eine native Wartelobby. Teilnehmeridentität und Presence folgen dabei der Fachlogik aus Laufdiktat `6c2ade4`; Layout, Theme und Navigation kommen ausschließlich aus Lernraum.

Live-Räume sind die begrenzte Ausnahme vom sonstigen Lokal-first-Lernen: Während einer gemeinsamen Unterrichtsrunde benötigt die Lobby eine flüchtige Realtime-Verbindung. Persönliche Lernhistorie, LernBox und freie Übungen werden dadurch nicht zentral synchronisiert. Im Browser wird ausschließlich ein öffentlicher Publishable Key verwendet; ohne konfigurierte Live-Verbindung wird kein erfolgreicher Beitritt vorgetäuscht.

## 35. Autorisierte Live-Sitzung im nativen Lernraum – 13. August 2026

**Beschlossen:** Das öffentliche Realtime-Ereignis `session-start` ist ausschließlich ein Wecksignal. Es enthält weder Aufgaben noch Lösungen. Das Schülergerät liest Status, Sitzungs-ID und Konfiguration anschließend mit seinem gerätegebundenen Teilnehmertoken über `get_room_state_secure` und validiert die Daten vor der Anzeige.

Text, Vokabeln und Kopfrechenaufgaben laufen danach in einer nativen Lernraum-Oberfläche. Antwortprüfung, stabile individuelle Reihenfolge, Fortschrittsrückgabe, Wiederaufnahme nach Verbindungsabbruch und der verbindungsunabhängige Teilnehmer-Heartbeat werden aus Laufdiktat `6c2ade4` übernommen. Stationsmodus, Battle und die Lehrkraftoberfläche bleiben eigene folgende Integrationsschritte.

## 36. Nativer Lehrkraft-Raum mit sicherer Freigabe – 13. August 2026

**Beschlossen und umgesetzt:** Der Lehrerbereich erstellt Unterrichtsrunden nativ aus Text, Vokabeln oder Kopfrechenaufgaben. Die Lehrkraft kann Inhalte prüfen, Übungsmodus oder Lernstandscheck wählen, eine Lobby öffnen und die verbundenen Geräte vor dem Start sehen. QR-Code und vierstelliger Code führen ausschließlich zum Lernraum-Raumbeitritt.

- Die Parser für Text und Vokabeln verwenden die bereits portierte Laufdiktat-Fachlogik; der Kopfrechenimport übernimmt das sichere Rechenprinzip ohne `eval` und akzeptiert die schulüblichen Operatoren.
- Der geheime Raumzugang der Lehrkraft wird nicht im QR-Code, in einer URL oder dauerhaft im Browser gespeichert.
- Aufgaben und Lösungen werden vor dem Start über `update_session_secure` hinterlegt. `session-start` bleibt ein inhaltsfreies Wecksignal.
- Die Teilnehmeranzeige kombiniert Realtime Presence mit dem autorisierten Teilnehmer-Heartbeat. Presence dient nur dem kurzlebigen Verbindungszustand und nicht als dauerhafte Lernhistorie.
- Ohne `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` bleibt der lokale Lernraum nutzbar, zeigt aber ehrlich an, dass keine Live-Lobby geöffnet werden kann.
- Stationsmodus und Battle bleiben getrennte nächste Integrationsschritte, damit ihre abweichenden Raum- und Spiellogiken nicht stillschweigend vereinfacht werden.

## 37. Vollständiges Laufdiktat-Dashboard als Lernraum-Bestandteil – 13. August 2026

**Beschlossen und umgesetzt:** Das Lehrerdashboard, der klassische Stationsmodus und Battle werden aus Laufdiktat `6c2ade4` als native Lernraum-Funktionen übernommen. Es entsteht keine zweite PWA und keine parallele Einstellungsverwaltung.

- Der Lehrer-Wizard umfasst Inhalt, Einstellungen, Lobby und Live-Auswertung.
- Text, Vokabeln und Kopfrechnen unterstützen Dateiimport beziehungsweise Aufgabenerzeugung.
- Freies Üben, Lernstandscheck, Battle und Stations-Laufdiktat behalten ihre unterschiedlichen Fachregeln.
- Stationen verwenden Schülernummern und wiederaufnehmbaren, monotonen Fortschritt; Battle verwendet kurzlebige Realtime-Angriffe ohne dauerhafte Kampfdaten.
- Aufgaben und Lösungen werden nie über öffentliche Broadcasts übertragen. Schüler- und Lehrkrafttoken bleiben getrennt.
- Der globale Hell-/Dunkelmodus, mobile Darstellung und gemeinsame Lernraum-Navigation gelten auch für diese Oberflächen.
- Die zentrale Live-Auswertung bleibt sitzungsbezogen. Persönliche langfristige Förderung entsteht erst über den ausdrücklich vorgesehenen lokalen Ergebnisadapter.

## 38. Laufdiktat-Kopfrechnen als gemeinsamer Mathematikkern – 13. August 2026

**Beschlossen und umgesetzt:** Der freie Mathematikbereich und der Kopfrechengenerator im Lehrer-Laufdiktat verwenden dieselbe portierte Fachlogik aus Laufdiktat `6c2ade4`.

- Alle vier Grundrechenarten halten Operanden und Ergebnis im gewählten Zahlenraum.
- Negative Ergebnisse, Nullregeln, Einmaleinsreihen und Lückenpositionen sind explizite Einstellungen.
- Eigene Aufgaben dürfen Dezimalzahlen, Klammern, Potenzen, Brüche und Wurzeln enthalten und werden durch einen sicheren Parser ohne `eval` berechnet.
- Fehler werden als Grundrechenfamilie mit Zahlenraum gespeichert. Eine anschließende Förderübung erzeugt neue passende Rechnungen statt bloßer Fehlerkopien.
- Der Mathebereich bleibt auf basale Kopfrechenkompetenzen ausgerichtet. Geometrie oder prüfungsspezifische Stoffpakete gehören nicht zu diesem Kern.

## 39. Ramagotchi erst nach einem stabilen Lernkern – 25. August 2026

**Beschlossen:** Lernraum erhält perspektivisch eine nachhaltige, Habitica-inspirierte Motivationsschicht mit einem persönlichen **Ramagotchi-Lernbegleiter**. Die Umsetzung beginnt erst, wenn die zentralen Lernwege, lokale Datensicherheit, Rollen, Datenschutz, Barrierefreiheit und der Betrieb zuverlässig funktionieren.

- Das Ramagotchi wächst ausschließlich durch sinnvolle, typisierte Lernsignale und persönliche Entwicklung.
- Fehler, Abwesenheit und Lernpausen verursachen keine Krankheit, Traurigkeit, Lebenspunktverluste oder den Verlust erspielter Entwicklung.
- Ziele und Serien werden verzeihend gestaltet; der Wiedereinstieg nach Pausen wird positiv unterstützt.
- Belohnungen bleiben überwiegend kosmetisch. Lerninhalte und Hilfen werden nicht hinter Spielstufen oder Bezahlung gesperrt.
- Klassen- und Hausquests sind kooperativ, freiwillig und verwenden nur aggregierte, gedeckelte Beiträge.
- Die Gamification bleibt abschaltbar und wird vor breiter Einführung mit Schülern auf Motivation, Druckempfinden und unerwünschtes Punktesammeln erprobt.

Die verbindliche Konzeption steht unter [[../23 - Ramagotchi und nachhaltige Gamification/Anwendung|Ramagotchi und nachhaltige Gamification]].

## 40. Ein persönlicher Lernraum statt getrennter Lernwelten – 25. August 2026

**Beschlossen:** Klasse und freies Üben erzeugen keine getrennten Lernbestände. Der Schüler verwendet einen gemeinsamen persönlichen Lernraum mit einem Lernstand pro fachlich identischem Lernobjekt.

- Fächer können manuell angelegt oder durch Lehrkraftinhalte ergänzt werden.
- Vor einer Runde kann **Alles fällige**, ein einzelnes Fach oder ein bestimmter Stapel gewählt werden.
- Fachübergreifende Runden wechseln in überschaubaren Fachblöcken statt nach jeder Karte.
- Freies Üben ist eine Aktion innerhalb eines Fachs und keine zweite LernBox.
- Eigene, aus dem Unterricht übernommene und adaptive Inhalte tragen getrennte Quellen, greifen aber auf denselben persönlichen Lernstand zu.
- Vokabeln werden nicht allein anhand des sichtbaren Textes zusammengeführt; Sprachpaar, Grundform, Bedeutung und Abfragerichtung werden berücksichtigt.

Diese Entscheidung ersetzt die harte Trennung aus Entscheidung 17 und die klassenbezogene Modulstruktur aus Entscheidungen 16, 18 und 19, soweit diese eigene Lernwelten oder gesperrte Grundfunktionen voraussetzen.

## 41. Freie Grundfunktionen und konkrete Lehrkraftinhalte – 25. August 2026

**Beschlossen:** Die Grundfunktionen von Lernraum sind grundsätzlich frei zugänglich. Die Lehrkraft aktiviert nicht ganze Fächer oder Module, sondern stellt konkrete fachliche Inhalte wie Vokabelstapel oder Lernwortlisten bereit.

- Der gemeinsame Lehrkraftinhalt bildet den fachlichen Ausgangspunkt.
- Nach der lokalen Übernahme erzeugt Lernraum aus Fehlern, Hilfen und Fälligkeiten den individuellen Übungsweg jedes Schülers.
- Ein Lehrkraftpaket ergänzt den persönlichen Lernraum, ohne private Inhalte oder Lernstände an die Lehrkraft zurückzugeben.
- Aktualisierungen verwenden stabile IDs und Versionen; sie erzeugen keine zweite Liste und setzen keinen Lernstand zurück.
- Entfernte Lehrkraftinhalte werden nicht ungefragt aus dem persönlichen Lernbestand gelöscht.

Die bereits umgesetzte lokale Modulfreigabe bleibt ein historischer Prototyp und wird nicht als endgültiges Produktmodell weitergeführt.

## 42. Supabase als verschlüsselter 24-Stunden-Übergaberaum – 25. August 2026

**Beschlossen:** Supabase wird für die normale Inhaltsverteilung ausschließlich als kurzlebiger technischer Übergaberaum genutzt.

- Die langfristige Lehrkraftbibliothek liegt lokal, in einer Exportdatei oder optional in einer von der Lehrkraft frei gewählten Cloud.
- Vor der Freigabe erzeugt das Lehrergerät ein versioniertes und clientseitig verschlüsseltes `LearningBundle`.
- QR-Code oder ausreichend starker manueller Code ermöglichen den einmaligen Abruf ohne Schülerkonto.
- Raum und aktives Paket sind höchstens 24 Stunden abrufbar; nach Ablauf werden Zugriffe verweigert und die Daten automatisch gelöscht.
- Im Transferraum entstehen keine Schülerliste, dauerhafte Klassenmitgliedschaft, Abrufhistorie oder persönliche Lernstände.
- Realtime ist für wöchentliche Inhaltsübertragung nicht erforderlich. Falls es verwendet wird, sendet es nur ein inhaltsfreies Wecksignal; das Paket wird danach autorisiert abgerufen.
- Supabase-Backups, Protokolle, konkrete EU-Region, Auftragsverarbeitung, RLS und Löschkonzept werden vor Schuleinsatz geprüft. Eine kurze Verbindung gilt nicht automatisch als DSGVO-Nachweis.

Diese Inhaltsübertragung bleibt von Laufdiktat-Liveräumen, persönlichem Cloud-Backup, Klasseneinschreibung und QR-Klassenbeiträgen getrennt. Die vollständige Beschreibung steht unter [[../12 - Inhaltsübertragung und Synchronisation/Anwendung|Inhaltsübertragung und temporäre Synchronisation]].
