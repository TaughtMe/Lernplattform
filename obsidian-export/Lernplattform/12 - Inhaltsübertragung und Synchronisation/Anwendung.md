---
tags:
  - lernplattform
  - inhaltsübertragung
  - supabase
  - local-first
  - datensparsamkeit
status: konzept-beschlossen
stand: 2026-08-25
---

# Inhaltsübertragung und temporäre Synchronisation

## Aktueller Implementierungsstand

**Stand 25. August 2026:** Das Supabase-Projekt `Lernraum` ist in `eu-west-1` auf PostgreSQL 17 aktiv. Die Migration `create_encrypted_content_transfers` ist ausgerollt und liegt nachvollziehbar im Repository. Sie enthält die RLS-geschützte Tabelle `content_transfers`, vier fähigkeitsgebundene RPC-Funktionen und einen stündlichen Löschauftrag für abgelaufene Datensätze.

Die zuvor getrennte Laufdiktat-Datenbank ist außerdem ohne historische Unterrichtsdaten in dasselbe Projekt migriert. Die Migration `migrate_laufdiktat_live_rooms` stellt tokengebundene Räume, pseudonyme Teilnehmende, Fortschritt, Heartbeat und die automatische Löschung beendeter Räume bereit. Projekt-URL und Publishable Key sind als Cloudflare-Buildvariablen hinterlegt. Am 25. August 2026 wurde der komplette Laufdiktat-Ablauf in Produktion mit getrenntem Lehrer- und Schülergerät geprüft: Beitritt, Sitzungsstart, Nummernwahl, zwei verdeckte Stationsabrufe, Fortschrittsanzeige mit 100 Prozent und sauberes Raumende waren erfolgreich.

Der Cloudflare-Build für Commit `6fa3ad6` ist erfolgreich veröffentlicht. Wegen wiederholt beschädigter Dependency-Cache-Wiederherstellungen ist der Cloudflare-Buildcache deaktiviert. Der Produktionscheck umfasste außerdem das Anlegen der Klasse `Testklasse 1`, das Hinzufügen und einmalige Einschreiben von `Testschüler 1`, die idempotente Wiederholung desselben Einschreibecodes sowie das Fortbestehen beider Datensätze nach Neuladen und Service-Worker-Update.

Der direkte Tabellenzugriff ist für anonyme und angemeldete Clients vollständig entzogen. Reservierung, einmaliger Upload sowie Abruf über QR-Nachweis oder manuellen Code erfolgen ausschließlich über eng begrenzte Funktionen. Upload- und Abrufnachweise werden nur als SHA-256-Hash gespeichert. Der manuelle Code enthält einen zufälligen Raumfinder und ein separates Geheimnis; nach fünf Fehlversuchen innerhalb von 15 Minuten wird der Raum für weitere Codeversuche 15 Minuten gesperrt. Dabei entsteht nur ein raumbezogener Zähler ohne Schülerzuordnung oder Abrufhistorie.

Eine zweite Härtungsmigration entzieht zusätzlich die automatischen Standardrechte für künftig angelegte Tabellen, Sequenzen und Funktionen. Neue Data-API-Endpunkte müssen dadurch immer ausdrücklich zusammen mit ihrem Zugriffs- und RLS-Modell freigegeben werden. Die Transfer-RPCs sind ausschließlich für die anonyme Browserrolle mit Publishable Key erreichbar; die derzeit nicht benötigte angemeldete Rolle besitzt keine Ausführungsrechte.

Der Anwendungskern verschlüsselt das validierte `LearningBundle` clientseitig mit AES-256-GCM. Der zufällige Inhaltsschlüssel wird getrennt für QR-Nachweis und manuellen Code umschlossen; Supabase erhält nur Chiffrat, Nonces, verschlüsselte Schlüsselumschläge und nicht personenbezogene Versionsdaten. QR- und Code-Roundtrip sowie falscher Abrufnachweis sind automatisiert getestet. Die Lehrkraftoberfläche kann jetzt Vokabelpaare als versioniertes Paket veröffentlichen und zeigt QR- sowie 24-stelligen Manuellcode. Die Schüleroberfläche ruft das Paket per Scanner oder Code ab, entschlüsselt und validiert es lokal und übernimmt es idempotent in die persönliche LernBox; vorhandene Karten werden nicht dupliziert.

Die Lehrkraftoberfläche besitzt außerdem eine lokale, vom Transferraum getrennte Inhaltsbibliothek. Vorbereitete Vokabelpakete werden mit stabiler Paket-ID und fortlaufendem Revisionsstand im lokalen Lehrerbereich gespeichert, erneut geöffnet oder gelöscht. Die gesamte Bibliothek lässt sich als JSON-Datei im ausdrücklich benannten Format `lernraum.teacher-content-library`, Version 1, exportieren und nach strenger Schema- und Dublettenprüfung wieder importieren. Beim Import werden Pakete mit derselben stabilen ID aktualisiert; Supabase erhält weder diese Bibliothek noch ihre Sicherungsdatei.

Die Supabase-Sicherheitsprüfung weist erwartungsgemäß darauf hin, dass die vier anonym erreichbaren RPCs als `SECURITY DEFINER` laufen und die Tabelle keine direkte RLS-Policy besitzt. Das ist hier beabsichtigt: Die Tabelle hat keinerlei Clientrechte, während jede Funktion ihren eigenen zufälligen Fähigkeitsnachweis prüft und `EXECUTE` für `PUBLIC` ausdrücklich entzogen wurde. Dieser bewusste Ausnahmefall muss bei späteren Schemaänderungen erneut geprüft werden.

Die Anbindung des geprüften Unterbaus an die Lehrkraft- und Schüleroberfläche ist als erster vollständiger Vokabelweg umgesetzt:

1. ~~Supabase-Projekt-URL und Publishable Key in Entwicklung und Hosting konfigurieren~~ (erledigt am 25. August 2026)
2. ~~Lehrkraftauswahl mit `publishLearningBundle` verbinden und QR-/Manuellcode anzeigen~~ (erledigt am 25. August 2026)
3. ~~Schülerabruf mit QR-Scanner und Codefeld verbinden~~ (erledigt am 25. August 2026)
4. ~~Entschlüsseltes Bundle über den vorhandenen idempotenten Eingangsadapter in die persönliche LernBox übernehmen~~ (erledigt am 25. August 2026)
5. ~~Netzabbruch, Ablauf, beschädigtes Chiffrat und erneute Freigabe als UI- und Ende-zu-Ende-Fälle testen~~ (automatisiert erledigt am 25. August 2026)
6. Backup-Aufbewahrung und tatsächliche Löschfristen vor dem Schuleinsatz betrieblich dokumentieren

Für neue Supabase-Projekte werden Tabellen nicht mehr selbstverständlich über die Data API freigegeben. Benötigte Rechte werden deshalb ausdrücklich und minimal vergeben; RLS bleibt für jede exponierte Tabelle verpflichtend. Im Browser wird nur der moderne Publishable Key verwendet. Ein Secret- oder `service_role`-Schlüssel wird weder im Client noch im Vault gespeichert.

## Zweck

Lehrkraftinhalte werden ohne manuelles Abschreiben schnell auf Schülergeräte übertragen und dort dauerhaft lokal nutzbar gemacht. Supabase ist dabei ausschließlich ein **verschlüsselter, kurzlebiger Übergaberaum** und weder permanente Inhaltsbibliothek noch dauerhafter Schülerdienst.

## Getrennte Verantwortungsbereiche

### Lehrkraft

Die Lehrkraft verwaltet ihre langfristige Inhaltsbibliothek selbst:

- lokal auf ihrem Gerät
- als exportierte Sicherungsdatei
- optional in einer frei gewählten Cloud wie Nextcloud, WebDAV, OneDrive, Google Drive oder schulischem Speicher

Lernraum setzt keinen bestimmten dauerhaften Cloudanbieter voraus. Eine Liste kann im nächsten Schuljahr aus dieser Quelle erneut ausgewählt und freigegeben werden.

### Supabase

Supabase speichert nur den technischen Transferraum und das verschlüsselte Inhaltspaket für höchstens 24 Stunden. Eine dauerhafte Schüler-Lehrer-Verbindung, Lehrerbibliothek oder Lernhistorie ist ausgeschlossen.

### Schülergerät

Das Schülergerät übernimmt das Paket in den gemeinsamen persönlichen Lernraum. Fächer, Stapel, Lernstände, Fehler, Fälligkeiten und individuelle adaptive Übungen bleiben lokal und können anschließend offline verwendet werden.

## Verbindlicher Ablauf

1. Die Lehrkraft wählt lokal oder aus ihrer eigenen Ablage einen Stapel beziehungsweise eine Sammlung.
2. Lernraum erzeugt ein unveränderliches, versioniertes `LearningBundle` mit stabilen IDs.
3. Das Paket wird bereits auf dem Lehrergerät verschlüsselt.
4. Lernraum legt einen temporären Supabase-Transferraum mit einer Ablaufzeit von höchstens 24 Stunden an.
5. Die Lehrkraft zeigt einen QR-Code und einen ausreichend starken manuellen Transfercode.
6. Das Schülergerät ruft das Paket einmalig ab, entschlüsselt und validiert es lokal.
7. Die Inhalte werden idempotent in das passende Fach und die persönliche LernBox integriert.
8. Nach erfolgreicher Übernahme benötigt der Schüler keine Verbindung mehr.
9. Nach Ablauf verweigert der Server jeden Abruf; ein Löschprozess entfernt Raum und aktives Paket automatisch.

Für fehlende Schüler erzeugt die Lehrkraft später aus derselben eigenen Quelle eine neue Freigabe. Realistisch kann dies bei neuen Wochenvokabeln etwa einmal pro Woche erfolgen; eine dauerhafte Hintergrundsynchronisation ist dafür nicht erforderlich.

## Daten im temporären Raum

Zulässig sind nur:

- zufällige Transferraum-ID
- Paket-ID, Schema-Version und Inhaltsversion
- Erstellungs- und Ablaufzeit
- verschlüsseltes Inhaltspaket
- technisch notwendiger, kurzlebiger Abrufstatus ohne Schülerzuordnung

Nicht gespeichert werden:

- Schülername oder Schülerkonto
- dauerhafte Klassenmitgliedschaft
- Liste der abrufenden Schüler
- persönlicher Lernstand
- Antworten, Fehler oder Hilfen
- Fälligkeiten und adaptive Empfehlungen
- spätere Lernaktivitäten
- dauerhafte Lehrerbibliothek

## Verbindung und Realtime

Der Normalfall ist eine einmalige autorisierte Anfrage: Code prüfen, Paket laden, lokal validieren, Verbindung beenden. Eine dauerhaft offene Realtime-Verbindung ist für wöchentliche Inhaltsfreigaben nicht vorgesehen.

Falls eine Veröffentlichung während des Unterrichts sofort sichtbar werden soll, darf Realtime wie beim Laufdiktat ausschließlich ein inhaltsfreies Wecksignal senden. Das verschlüsselte Paket wird danach mit der temporären Berechtigung abgerufen; Inhalte und Lösungen werden nicht über einen öffentlichen Broadcast verteilt.

## Code und Verschlüsselung

- Der QR-Code kann einen ausreichend zufälligen Abrufnachweis enthalten.
- Der manuelle Code muss deutlich stärker als ein vierstelliger Laufdiktatcode sein und gut unterscheidbare Zeichen verwenden.
- Fehlversuche werden begrenzt und rate-limitiert.
- Der Entschlüsselungsschlüssel wird nicht als frei auflistbares Datenbankfeld gespeichert.
- Ein öffentlicher Client verwendet ausschließlich einen Publishable Key; ein `service_role`- oder anderer geheimer Serverschlüssel gehört niemals in die App.
- Exponierte Tabellen erhalten RLS und minimale Berechtigungen. Ein gültiger Code darf ausschließlich genau das zugehörige, noch nicht abgelaufene Paket lesen.

Die genaue Kryptografie, Codeentropie und Supabase-API werden erst bei der Implementierung anhand aktueller Dokumentation festgelegt und sicherheitsgeprüft.

## Versionierung und Dubletten

Jedes Paket und jeder Inhalt besitzt stabile IDs sowie eine Version. Bei erneuter Freigabe erkennt das Schülergerät vorhandene Inhalte:

- neue Einträge werden ergänzt
- geänderte Einträge werden als neue Inhaltsversion übernommen
- unveränderte Einträge werden nicht dupliziert
- persönlicher Lernstand wird nicht zurückgesetzt
- entfernte Lehrkraftinhalte werden nicht ungefragt aus dem persönlichen Bestand gelöscht
- mehrere Quellen können auf dasselbe fachlich identische Lernobjekt verweisen

Eine Zusammenführung erfolgt nicht allein anhand sichtbaren Textes. Bei Vokabeln gehören mindestens Sprachpaar, Grundform, Bedeutungsvariante und Abfragerichtung zur Identitätsprüfung.

## Datenschutz und Löschung

Die Architektur setzt Datenminimierung, Speicherbegrenzung und Datenschutz durch Technikgestaltung um. Eine kurze Verbindung allein garantiert jedoch keine DSGVO-Konformität. Vor dem Schuleinsatz müssen Verantwortlichkeit, Rechtsgrundlage, Auftragsverarbeitung, Informationspflichten, technische und organisatorische Maßnahmen sowie schulrechtliche Vorgaben geprüft werden.

- Ein konkreter EU-Projektstandort wird bevorzugt; eine allgemeine Regionsbezeichnung genügt nicht als Compliance-Nachweis.
- Die aktive Löschung nach 24 Stunden wird technisch überprüft.
- Backup-Aufbewahrung des Dienstes wird im Löschkonzept berücksichtigt.
- Clientseitige Verschlüsselung sorgt dafür, dass Sicherungen nach Möglichkeit nur unlesbares Chiffrat enthalten.
- Protokolle und Diagnosedaten werden auf das technisch notwendige Minimum begrenzt.

## Getrennte Datenflüsse

Die temporäre Inhaltsübertragung bleibt technisch getrennt von:

1. Live-Unterrichtsräumen des Laufdiktats
2. optionalem persönlichem Cloud-Backup
3. Klasseneinschreibung und Häusern
4. QR-Leistungsbriefen und aggregierten Klassenbeiträgen

Keiner dieser Wege darf stillschweigend eine zentrale Kopie der vollständigen Schüler-Lernhistorie erzeugen.

## Späterer Offline-Fallback

Für vollständig netzfreie Umgebungen können animierte QR-Codes ein komprimiertes Paket in mehreren Teilen übertragen. Dieser Weg bleibt eine spätere Ergänzung und verwendet dieselben Paket-, Validierungs- und Dublettenregeln.

Siehe auch [[../03 - Persönliche LernBox/Anwendung|Persönliche LernBox]], [[../14 - Lokale Daten, Export und Cloud-Backup/Anwendung|Lokale Daten, Export und Cloud-Backup]], [[../15 - Gemeinsames Datenmodell/Anwendung|Gemeinsames Datenmodell]] und [[../16 - PWA, Offlinebetrieb und Sicherheit/Anwendung|PWA, Offlinebetrieb und Sicherheit]].
