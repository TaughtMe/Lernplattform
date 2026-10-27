# Live-Sicherheit: Bereitstellung und Abnahme

Stand: 26.10.2026. Version 0.9.2, aufbauend auf Version 0.9.1 (`489464c`).
Die Bereitstellung auf `claude/lernraum-ui-v2` setzt die folgenden Schritte
voraus. Bei der Vorbereitung dieses Releases wurde kein produktives
Supabase-Projekt verändert.

## Änderung

Schüler-, Lehrer- und Hintergrundansicht verwenden keine öffentlichen
`room-1234`-Realtime-Kanäle mehr. Raumstart, Ende, Anwesenheit und Fortschritt
kommen aus tokengebundenen HTTP-Aufrufen. Die Schüleransicht prüft alle zwei
Sekunden, die Lehreransicht alle drei Sekunden in der Runde bzw. acht Sekunden
in der Lobby. Verdeckte Seiten pausieren; bei Rückkehr und Wiederverbindung
wird sofort erneut geprüft. Laufende Abfragen überlappen nicht.

Der Server leitet den Absender einer Spielaktion ausschließlich aus dem
Teilnehmertoken ab. Die Schnittstelle nimmt keinen Absendernamen entgegen.
Aktionen gelten nur im aktuellen Battle einer offenen, nicht abgelaufenen
Runde, für einen anderen anwesenden Teilnehmer desselben Raums und für eine
von der Lehrkraft aktivierte Aktion. Pro Absender wird höchstens eine Aktion
in 15 Sekunden angenommen. Die Empfängerabfrage liefert ausschließlich an
dieses Gerät adressierte, höchstens 15 Sekunden alte Aktionen; eine laufende
Ansicht verarbeitet jede Kennung einmal. Die Anzeige wartet auf die
Serverbestätigung, bevor sie eine Aktion als gesendet meldet.

Die kurzlebige Aktionstabelle liegt im privaten Schema, hat RLS und keine
direkten Rechte für öffentliche Rollen. Sie enthält keine Namen oder Tokens
und wird mit dem Raum durch die vorhandene Bereinigung entfernt, sobald
dessen Ende mindestens 24 Stunden zurückliegt (Job alle fünf Minuten). Andere Teilnehmer erhalten nur Tierkennung
und aktuellen Aufgabenindex, keine Fehlerdetails oder Lehrkraftzugänge.
Das bestehende Modell verwendet zufällige Geräte-/Raumtokens und keine
Supabase-Auth-Konten; deshalb prüfen die privilegierten RPCs diese Tokens
statt `auth.uid()`.

## Reihenfolge der Bereitstellung

1. Ein Unterrichtsfenster ohne aktive Runden wählen. Bestehende Räume regulär
   beenden, Ergebnisse sichern und alle alten Raumansichten schließen.
2. Migration `supabase/migrations/20261022045055_secure_room_activity.sql`
   zunächst in einer Testumgebung anwenden. Sie ergänzt die vorhandenen
   Tabellen/RPCs; Lernstände werden weder gelöscht noch umgeschrieben.
   Die untenstehenden positiven und negativen Proben dort durchführen.
3. Nach Abnahme die Migration produktiv anwenden, **vor** dem neuen Client.
   Ohne Migration sind die neuen Aktivitäts-/Spielaufrufe nicht verfügbar.
   Es gibt absichtlich keinen Rückfall auf öffentliche Nachrichten.
4. In Supabase **Realtime → Settings → Allow public access deaktivieren**.
   Das ist zusätzlich zur Codeänderung erforderlich: Alte gecachte Clients
   könnten sonst weiterhin auf öffentlichen Kanälen senden. Das Deaktivieren
   allein schützt keine beliebig berechtigten privaten Kanäle; diese Änderung
   benötigt überhaupt keine Realtime-Kanäle. Bei einem mit anderen Anwendungen
   geteilten Supabase-Projekt deren Nutzung vor dieser Projekteinstellung prüfen.
5. Neuen Client einschließlich aktualisiertem Service Worker bereitstellen.
   Lehrkraft- und Schülergeräte vollständig neu laden; bei installierter PWA
   auch das installierte Fenster schließen/neu öffnen. Keine Browserdaten
   löschen. Auf jedem Gerät Version `0.9.2` und die zugehörige Build-Kennung
   prüfen; alle Geräte müssen denselben freigegebenen Build verwenden.
6. Prüfen, dass neue **und bereits bestehende** öffentliche Verbindungen
   tatsächlich keine Nachrichten/Präsenz mehr erhalten. Verbleibende alte
   Verbindungen vor Wiederaufnahme schließen; ein reiner Client-Rollout ohne
   diese Kontrolle ist keine vollständige Absicherung alter Clients.

Bei einem Rollback des Clients öffentliche Kanäle nicht wieder freischalten.
Live-Unterricht dann pausieren und den Fehler beheben; individuelles Lernen
bleibt unabhängig davon nutzbar. Die additive Migration kann bestehen bleiben.

## Abnahme in der Testumgebung

- Zwei berechtigte Schüler und eine Lehrkraft: Beitreten, Start, Fortschritt,
  zulässige Battle-Aktion, Ablehnung einer deaktivierten Aktion, Wechsel ins
  individuelle Üben, Wiederaufnahme und Ende prüfen. Die Verzögerung entspricht
  dem Abfrageintervall und der Netzlaufzeit.
- Ohne Token, mit falschem Token und mit Token eines anderen Raums: keine
  Peerinformationen, kein Angriff, keine Anwesenheitsänderung. Lehrkrafttoken
  ist kein Teilnehmertoken; Teilnehmertoken darf keine Lehrkraftergebnisse
  abrufen und keinen Raum beenden.
- Kein frei gewählter Absender; Selbstangriff, fremdes Ziel, alte Sitzung,
  beendeter Raum, entfernter Teilnehmer und ein über 120 Minuten alter Raum
  werden abgewiesen. Auch vor dem nächsten Bereinigungsjob.
- Wiederholte gleichzeitige Angriffe desselben Absenders werden durch die
  serverseitige Sperre/Ratenbegrenzung begrenzt. Nur der richtige Empfänger
  erhält die Aktion; erneute Abfrage mit ihrer Kennung liefert sie nicht erneut.
- Reales iPad: Hintergrund/Vordergrund, Standby, Offline/Wiederverbindung und
  Service-Worker-Update prüfen. Keine Sitzung darf durch fremde Nachrichten
  starten oder enden. Netzwerkmitschnitt: keine `room-*`-WebSocket-Abonnements.
- Mit typischer Klassengröße prüfen, dass die zusätzlichen HTTP-Abfragen im
  verwendeten Supabase-Tarif und Schulnetz ausreichend schnell bleiben.

## Lokale Nachweise und Grenzen

Die Datenbank-Vertragstests führen sämtliche Migrationen und tatsächliche
RPC-Funktionskörper in PGlite unter eingeschränkten Rollen aus. Sie prüfen
zusätzlich zu den bestehenden Verträgen die neuen Raum-/Sitzungsgrenzen,
Absender-/Empfängerbindung, Präsenz, Ratenbegrenzung, Entfernung und Ablauf.
Gezielte Frontend- und API-Tests prüfen den HTTP-Vertrag und Start/Ende ohne
öffentliche Kanäle. Dies ersetzt weder die reale Supabase-Projekteinstellung
noch einen WebKit-/iPad- oder Lasttest. Supabase-Advisors wurden mangels
verbundener Testinstanz nicht ausgeführt; sie gehören zur Abnahme der Migration.

Der vierstellige Raumcode bleibt eine Einladung: Wer einen gültigen Code hat,
kann während des Beitrittsfensters einen eigenen Teilnehmerzugang erhalten.
Dieses Paket ergänzt keine individuelle Freigabe jedes Beitritts durch die
Lehrkraft und keinen zusätzlichen geheimen Einladungsnachweis. Es verhindert
das Mithören des bisherigen öffentlichen Nebenkanals und das Behaupten einer
fremden Absenderidentität. Geräte mit gestohlenem Teilnehmertoken und die
pädagogische Echtheit eines vom eigenen Gerät gemeldeten Ergebnisses sind
andere Vertrauensgrenzen. Ein vollständiger Missbrauchsschutz für Spielpunkte
ist ebenfalls nicht Gegenstand dieser Änderung.

Geprüfte Herstellerquellen: [Realtime-Autorisierung](https://supabase.com/docs/guides/realtime/authorization)
und [Supabase-Changelog](https://supabase.com/changelog). Der Markdown-Abruf des
Changelogs war im Recherchewerkzeug nicht lesbar; die HTML-Fassung wurde geprüft.
Die Migration wurde mit der Supabase-CLI angelegt. Eine relevante Änderung für
das verwendete tokengebundene HTTP-Verfahren ergab sich daraus nicht.

## Migration `20261027120000_math_first_wrong_answers`: vor dem Client einspielen

Stand: 27.10.2026. Nicht produktiv eingespielt; die Prüfung und das Einspielen
folgen getrennt (Testumgebung zuerst, wie oben).

**Zweck.** Im Live-Raum überträgt das Kindgerät bei Mathe-Aufgaben die erste
falsche Antwort je Aufgabe (höchstens 32 Zeichen) an die Lehrkraft. Das
Lehrergerät leitet daraus beim CSV-Export die Spalte „Fehlerart (Vermutung)“
ab. Text und Vokabeln übertragen keine Antworten, die Oberfläche zeigt keine
Fehlerart.

**Datenschutz.** Die Antworten liegen in `room_students.first_wrong_answers`,
pseudonym wie `word_errors` (Schlüssel ist der Teilnehmerschlüssel, kein Name).
Ein Raum schließt spätestens 120 Minuten nach dem Öffnen (oder nach drei
Stunden ohne Aktivität); `cleanup_abandoned_rooms` löscht ihn samt
Fortschrittszeilen (Fremdschlüssel mit `on delete cascade`), sobald sein Ende
24 Stunden zurückliegt (Job alle fünf Minuten). Die Datenschutzerklärung nennt
die Übertragung im Abschnitt „Live-Räume“.

**Änderung.**

- Neue Spalte `first_wrong_answers jsonb not null default '{}'` mit Prüfung
  (Objekt, höchstens 65 536 Byte wie `word_errors`).
- `upsert_progress_secure` bekommt als 14. und letztes Argument
  `p_first_wrong_answers jsonb default null`. Die alte Signatur mit 13
  Argumenten wird gelöscht und ersetzt (zwei Überladungen mit Standardwerten
  wären mehrdeutig); `revoke all` und `grant execute ... to anon` stehen für die
  neue Signatur wie bisher, ebenso `security definer` und `search_path`.
- Prüfungen: nur Objekte; Schlüssel müssen der Aufgabentext eines Mathe-Worts
  der Raumkonfiguration sein; höchstens so viele Einträge wie der Raum Wörter
  hat; je Antwort eine Zeichenkette mit höchstens 32 Zeichen; sonst
  Ausnahme „Ungueltige Antwortstatistik“.
- Bereits gespeicherte Aufgaben bleiben beim Zusammenführen erhalten („erste“
  Antwort); ein Aufruf ohne das Argument ändert die Spalte nicht.
- `get_room_students_secure` (liefert `setof room_students`) gibt die Spalte
  ohne Änderung mit zurück; `get_my_progress_secure` bleibt unverändert.

**Abwärtskompatibilität.** Der Client 0.9.4 ruft `upsert_progress_secure` mit
den 13 bisherigen Argumenten auf (benannt über PostgREST); das neue Argument
hat einen Standard, der Aufruf funktioniert weiter. Ältere Lehreransichten
ignorieren die zusätzliche Spalte im Abruf.

**Reihenfolge.** Zuerst die Migration, dann der neue Client. Der neue Client
sendet `p_first_wrong_answers` nur nach einer falschen Mathe-Antwort. Gegen
einen Server ohne Migration scheitert genau dieser Aufruf (unbekanntes
Argument), alle anderen Räume laufen unverändert. Rückfall: den Client
zurücknehmen; die Migration kann bestehen bleiben.

**Proben (Testumgebung, Rolle `anon`).** Neuer Aufruf schreibt, Lehrkraft-Abruf
liefert das Feld; zweiter Aufruf mit anderer Antwort ändert die erste nicht;
Aufruf mit 13 Argumenten positional und benannt funktioniert und lässt das Feld
unverändert; abgelehnt werden: Antwort mit 33 Zeichen, Zahl statt Text,
Array, Schlüssel eines Vokabel- oder Textworts, unbekannter Schlüssel, mehr
Einträge als Wörter. Diese Fälle deckt `npm run test:database` ab.

## Bereitstellungsprotokoll

**26.10.2026, Supabase-Projekt „Lernraum“ (`bidzvtwadsmifkmpoxpq`, eu-west-1):**

- Vorher entsprach die Datenbank exakt dem Stand nach `20261003120000`
  (Funktionskörper mit den Migrationsdateien verglichen). Im Migrationsverlauf
  standen nur die ersten drei Migrationen; die übrigen waren per SQL-Editor
  eingespielt worden. Zum Zeitpunkt der Umstellung gab es keinen Raum.
- `20261022045055_secure_room_activity.sql` wurde per SQL-Editor eingespielt.
  Alle fünf geänderten oder neuen Funktionen stimmen mit der Datei überein;
  nur `anon` darf sie ausführen, `private.room_attacks` hat RLS und keine
  Rechte für öffentliche Rollen.
- Proben unter der Rolle `anon` in einer verworfenen Transaktion: Aktivität
  melden, Peers ohne Token- oder Fehlerdaten, zulässige Battle-Aktion,
  15-Sekunden-Sperre, deaktivierte Aktion, Selbstangriff, fremdes Ziel, alte
  Sitzung, einmalige Zustellung nur an den Empfänger; Abweisung ohne Token, mit
  falschem Token, mit Token eines anderen Raums, mit Lehrkrafttoken und für
  einen über 120 Minuten alten Raum. Alle 22 Proben wie erwartet.
- Die sieben fehlenden Einträge (`20260831120000` bis `20261022045055`) wurden
  im Migrationsverlauf nachgetragen, ohne Schemaänderung.
- Supabase-Advisors: erwartete Hinweise zu `SECURITY DEFINER`-Funktionen für
  `anon` und zu Tabellen mit RLS ohne Policies (beides gewollt, Zugriff nur über
  tokenprüfende RPCs). Hinweis ohne Handlungsbedarf: Fremdschlüssel
  `room_attacks.target_id` ohne führenden Index (Tabelle kurzlebig und klein).
- Offen: Realtime „Allow public access“ deaktivieren (Schritt 4), Client
  bereitstellen (Schritt 5) und alte Verbindungen prüfen (Schritt 6).
