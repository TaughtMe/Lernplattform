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
