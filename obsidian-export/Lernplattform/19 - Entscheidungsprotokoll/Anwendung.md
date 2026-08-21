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

## Vorgeschlagene fachliche Erweiterungen – 21. August 2026

**Status: vorgeschlagen, nicht priorisiert, nicht beschlossen.** Auf Nachfrage zusammengestellte Erweiterungsideen jenseits des bisherigen Plans, jeweils mit kurzem Blick auf den aktuellen fachdidaktischen Forschungsstand, wo das ausdrücklich gewünscht war. Kein Punkt hier ist Teil des aktuellen Entwicklungsauftrags; das dient nur als Gedächtnisstütze für spätere Priorisierung.

### Barrierefreiheits-Modus — mit Einschränkung bei der Schriftart

Ein größerer Textmodus (größere Schrift, mehr Zeilenabstand, kein Blocksatz) wurde vorgeschlagen. Bei der naheliegenden Ergänzung „LRS-Schriftart" (z. B. OpenDyslexic) zeigt eine kurze Recherche aber ein durchwachsenes Bild: Eine aktuelle Meta-Analyse sowie mehrere kontrollierte Studien finden **keinen verlässlichen Lesegeschwindigkeits- oder Genauigkeitsvorteil** von OpenDyslexic oder vergleichbaren Spezialschriften gegenüber gewöhnlichen Schriftarten wie Arial — in einer Studie war OpenDyslexic sogar langsamer, und keine der befragten Schüler:innen bevorzugte sie. Ein einzelner Eyetracking-Befund von 2022 deutet auf einen möglichen Verständnisvorteil bei langen Texten hin, ist aber bisher nicht repliziert. Belastbarer ist dagegen der Befund, dass **größerer Buchstabenabstand** (Letter-Spacing) einen positiven Effekt auf die Lesefähigkeit bei Legasthenie hat.

**Empfehlung:** Falls umgesetzt, eher ein Modus mit erhöhtem Letter-Spacing/Zeilenabstand und angepasster Absatzbreite als eine gebrandete „Legastheniker-Schriftart" — das ist die Stellschraube mit tatsächlicher Evidenz, keine kosmetische Umbenennung des gleichen Anspruchs.

Quellen: [Edutopia – Do Dyslexia Fonts Actually Work?](https://www.edutopia.org/article/do-dyslexia-fonts-actually-work/), [Annals of Dyslexia – Meta-Analyse zu dyslexiefreundlichen Schriftarten](https://link.springer.com/article/10.1007/s11881-026-00389-8), [PMC – The effect of a specialized dyslexia font, OpenDyslexic, on reading rate and accuracy](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5629233/)

### Leseverständnis-Modul

Kurze Texte mit Verständnisfragen, um die Lücke zwischen Rechtschreibung (Lernwörter) und freiem Textverständnis zu schließen. Forschung zu Lesestrategietrainings in der Grundschule zeigt wiederholt positive Effekte auf das Leseverständnis, besonders bei Förderung ab den oberen Grundschulklassen und bei leseschwachen Kindern — etwa das Programm „Wir werden Textdetektive" mit signifikanten kurz- und mittelfristigen Transfereffekten bei Viertklässlern, sowie reziprokes Lehren (Vorhersagen, Zusammenfassen, Nachfragen, Klären) als wirksame kooperative Methode.

**Empfehlung:** Kein reines Multiple-Choice-Verständnisquiz, sondern das Modul von Anfang an um die vier Kernstrategien (Vorhersagen, Zusammenfassen, Nachfragen, Klären) herum aufbauen und peergestützte Bearbeitung (leseschwächeres + lesestärkeres Kind) als Option vorsehen, statt nur Einzelarbeit.

Quellen: [Deutsches Schulportal – Methoden für eine wirksame Leseförderung](https://deutsches-schulportal.de/unterricht/methoden-fuer-eine-effektive-lesefoerderung/), [Zeitschrift für Grundschulforschung – Reziproke Lesegruppen](https://link.springer.com/article/10.1007/s42278-022-00142-1)

### DaZ-Unterstützung (Deutsch als Zweitsprache)

Vereinfachte Textstufen und mehr Bildunterstützung für Schüler:innen mit Deutsch als Zweitsprache. Der etablierte fachdidaktische Rahmen dafür ist **Scaffolding im sprachsensiblen Unterricht**: gezielte, abgestufte Unterstützung (Wortkarten, Satzanfänge, Bildkarten), die mit wachsender Sprachkompetenz gezielt wieder abgebaut wird, sowie die getrennte Vermittlung von Fachbegriff und Fachinhalt für sprachschwächere Lernende, bevor beides verknüpft wird.

**Empfehlung:** Bildunterstützung und Wort-/Satzhilfen nicht als Alles-oder-nichts-Schalter, sondern als abgestufte Hilfsstufen anlegen, die pro Übung reduziert werden können — analog zum bereits bestehenden Hilfe-Konzept bei Lernwörtern und Laufdiktat, nur sprachbezogen statt rechtschreibbezogen.

Quellen: [Mercator-Institut – Basiswissen Scaffolding](https://mercator-institut.uni-koeln.de/sites/mercator/user_upload/PDF/05_Publikationen_und_Material/230206_Basiswissen__Scaffolding.pdf), [Mercator-Institut – Handreichung Sprachsensibel unterrichten](https://mercator-institut.uni-koeln.de/sites/mercator/user_upload/PDF/05_Publikationen_und_Material/200805_Handreichung_Sprachsensibel_unterrichten.pdf)

### Weitere, ohne vertiefte Recherche vorgeschlagene Ideen

- **Elternansicht/Fortschrittsbericht**: druckbarer oder teilbarer Überblick über den Lernstand eines Kindes, z. B. für Elterngespräche. Berührt Datenschutzfragen ähnlich der „Persönlichen Lehrerübersicht" in [[../13 - Datenschutz und Rollen/Anwendung|Datenschutz und Rollen]] und müsste vor Einsatz denselben Prüfschritt durchlaufen.
- **Modulübergreifendes Gesamt-Level/XP-System**: aktuell hat nur Tastschreiben eine eigene Punktelogik; ein gemeinsames Profil über alle Module hinweg würde den Spielanreiz bündeln, statt ihn pro Modul zu isolieren.
