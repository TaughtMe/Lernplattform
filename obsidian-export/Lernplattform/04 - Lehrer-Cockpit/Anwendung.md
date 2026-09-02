# Lehrer-Cockpit

## Zweck

Das Lehrer-Cockpit bündelt Planung, Durchführung und datensparsame Auswertung des Unterrichts.

## Funktionen

- Vokabeln, Lerninhalte und Stapel verwalten
- Inhalte importieren und korrigieren
- Räume und Laufdiktate starten
- Lernhilfen konfigurieren
- Gruppen und Häuser verwalten
- Live-Fortschritt visualisieren
- QR-Statistiken einlesen
- individuelle Schüler-QR-Codes für die Einschreibung erzeugen
- QR-Abgaberunden mit Fortschritt „abgegeben / ausstehend“ verwalten
- Scanergebnisse akustisch, haptisch und visuell bestätigen
- Inhalte als versionierte Pakete für höchstens 24 Stunden freigeben
- temporären QR- oder manuellen Transfercode erzeugen
- lokale oder frei gewählte externe Inhaltsablagen verwenden
- lokale Namens- oder Aliaszuordnungen verwalten
- gespeicherte Daten exportieren und löschen

## Anwendung

Der Lehrerbereich ist in der aktuellen lokalen Einzelplatzphase ohne eigenes Lernraum-Konto und ohne vorgelagerten Login erreichbar. Die Startseite bezeichnet ihn deshalb als **Lehrerbereich** und nicht als **Lehrer-Login**. Das entsperrte Gerät beziehungsweise ein ausschließlich von der Lehrkraft verwendetes Browserprofil bildet die Schutzgrenze. Diese Entscheidung vermeidet lokale Anmeldedaten und eine nur scheinbar sichere Prototyp-PIN.

Wer dasselbe entsperrte Geräteprofil verwenden kann, kann jedoch auch Klassen, lokale Namen, Inhaltsbibliotheken und Einstellungen sehen, verändern, exportieren oder löschen. Vor dem Speichern persönlicher Zuordnungen weist die Oberfläche deshalb auf ein geschütztes, nicht gemeinsam genutztes Geräteprofil hin. Ein Lehrerlogin oder eine echte Kontotrennung bleibt als späteres To-do bestehen und wird erst dann neu bewertet, wenn Schüler und Lehrkräfte dasselbe Gerät beziehungsweise Browserprofil verwenden oder mehrere Lehrkräfte getrennte Arbeitsstände benötigen. Vor einer Umsetzung müssen Authentifizierungsanbieter, Kontowiederherstellung, Datenschutz, Betriebsaufwand und laufende Kosten geklärt sein. Lernraum baut und betreibt keine eigene Login-Infrastruktur, solange dieser zusätzliche Aufwand für die tatsächliche Nutzung nicht gerechtfertigt ist.

Der Lehrerbereich ist kein Prototyp-Einstieg mehr, sondern ein zusammenhängender lokaler Arbeitsplatz. Er speichert ein persönliches Lehrkraftprofil, mehrere Klassen, Schüler beziehungsweise Aliasse, Materialpakete und Arbeitsaufträge in einer versionierten IndexedDB. Eine Datenübersicht zeigt die vorhandenen Datensätze. Die gesamte geprüfte Lehrerdatenbank kann als JSON-Datei exportiert und später wieder zusammengeführt werden.

Klassen können unabhängig voneinander angelegt, ausgewählt und samt zugehörigen Schülern gelöscht werden. Schüler werden je Klasse lokal verwaltet, können entfernt werden und erhalten weiterhin ihren individuellen Einschreibungs-QR-Code. Der QR-Code öffnet die Lernraum-Klassenseite, übernimmt den persönlichen Einschreibecode lokal und verlangt vor der Speicherung die ausdrückliche Bestätigung des angezeigten Schülernamens. Namen und Zuordnungen verlassen das Lehrergerät nicht durch die Aufgaben- oder Materialfreigabe; der Einschreibecode wird als URL-Fragment nicht an den Webserver gesendet.

Die Materialverwaltung speichert, bearbeitet, löscht, importiert und exportiert zunächst versionierte Vokabelpakete. Die bestehenden Werkzeuge für Texte, Vokabeln und Kopfrechenaufgaben im Live-Raum bleiben zusätzlich verfügbar. Weitere fachliche Materialtypen verwenden später denselben lokalen Bibliotheksvertrag.

Arbeitsaufträge enthalten Titel, Anleitung, Fach, optionale Materialverknüpfung und Fälligkeit. Eine Aufgabe wird einer oder mehreren Klassen oder optional gezielt einzelnen Schülern zugeteilt, bleibt lokal bearbeitbar und kann gelöscht werden. Der statische Aufgaben-QR enthält keine Schülernamen oder persönlichen Lernstände. Der Lehrerbereich erzeugt, kopiert und liest diesen Code per Kamera oder manueller Eingabe und zeigt den validierten Auftrag an. Das Schülergerät prüft die lokale Klasseneinschreibung, übernimmt passende Aufgaben dublettenfrei in **Meine Aufgaben** und behält einen bereits erreichten Abschlussstatus auch bei einer erneuten Übernahme.

Die Lehrkraft entscheidet vor einer Aktivität, welche Inhalte, Hilfen, Sozialform und Auswertung verwendet werden. Persönliche Zuordnungen müssen ausdrücklich aktiviert und lokal geschützt werden.

Die frühere Modulfreigabe ist als Produktmodell überholt. Grundfunktionen stehen Schülern frei zur Verfügung. Die Lehrkraft wählt stattdessen konkrete Stapel oder Sammlungen aus ihrer lokalen beziehungsweise selbst gewählten Ablage und veröffentlicht daraus bewusst ein unveränderliches, versioniertes Inhaltspaket. Supabase dient dabei ausschließlich als kurzlebiger Übergaberaum; es ist weder dauerhafte Lehrerbibliothek noch Schüler-Lernspeicher.

Eine Freigabe zeigt QR-Code, manuellen Transfercode und Ablaufzeit. Nach spätestens 24 Stunden ist kein Abruf mehr möglich und der aktive Transferdatensatz wird automatisch gelöscht. Für fehlende Schüler kann die Lehrkraft später aus derselben eigenen Quelle eine neue Freigabe erzeugen, ohne Inhalte erneut einzugeben.

Der native Unterrichtsraum ist als vollständiges Laufdiktat-Dashboard umgesetzt. Die Lehrkraft wählt Text, Vokabeln oder Kopfrechnen, importiert Inhalte oder erzeugt Kopfrechenaufgaben und entscheidet zwischen freiem Üben, Lernstandscheck, Battle und klassischem Stations-Laufdiktat. Modusspezifisch stehen Hilfen, Fehlversuche, Wiederholungen, Sterne, Vorlesen, Reihenfolge, Stationszahl sowie Battle-Angriffe zur Verfügung. Danach öffnet sie eine Lobby mit scanbarem QR-Code und vierstelligem Raumcode. Eine gemeinsame Teilnehmerliste verbindet den kurzfristigen Presence-Stand mit dem autorisierten Raum-Heartbeat. Die Runde kann erst gestartet werden, wenn mindestens ein Gerät verbunden ist.

Während der Runde zeigt das Cockpit aktive und fertige Lernende beziehungsweise Stationsnummern, den Gesamtfortschritt, Sterne und häufige Fehler. Ergebnisse können als CSV exportiert werden. Ein offener Lehrerraum wird mit dem geheimen Lehrkrafttoken nur im Sitzungsspeicher wiederaufgenommen; nach dem Beenden wird dieses Token entfernt.

Der Start folgt demselben Sicherheitsvertrag wie Laufdiktat `6c2ade4`: Zuerst wird die Sitzung mit dem geheimen Lehrkrafttoken serverseitig aktualisiert. Das anschließende Realtime-Ereignis enthält nur ein Wecksignal und keine Aufgaben oder Lösungen. Schülergeräte laden die Inhalte mit ihrem eigenen Teilnehmertoken. Das Lehrkrafttoken bleibt ausschließlich im flüchtigen Zustand des geöffneten Browserfensters und wird weder in URL noch QR-Code geschrieben. Ohne öffentliche Raumkonfiguration simuliert die Oberfläche keine funktionierende Lobby.

Die Lehrkraft stellt einen gemeinsamen fachlichen Ausgangsinhalt bereit. Nach der lokalen Übernahme erzeugt Lernraum aus Fälligkeiten, Fehlern und Hilfen für jeden Schüler einen individuellen Übungsweg in **Heute üben**. Die vollständigen persönlichen Fehler und Wiederholungspläne bleiben auf dem Schülergerät.

## Lokaler Klassenbriefkasten

Für einen Turnus oder ein Aufgabenpaket startet die Lehrkraft eine Abgaberunde. Das Dashboard zeigt die erwarteten Klassenmitglieder und aktualisiert beim fortlaufenden Scannen unmittelbar den Status:

- **ausstehend:** noch kein gültiger Code für diesen Turnus
- **abgegeben:** aktueller Stand wurde übernommen
- **doppelt:** derselbe Stand wurde bereits verarbeitet
- **veraltet:** ein neuerer Stand liegt bereits vor
- **ungültig:** falsche Klasse, Signatur oder beschädigter Code

Nach einem erfolgreichen Scan erscheinen ein kurzer Ton oder eine Vibration, ein grüner Rahmen und der lokale Schülername beziehungsweise Alias. Die Lehrkraft sieht jederzeit beispielsweise **„18 von 26 abgegeben“** und eine Liste der noch fehlenden Schüler.

Für zugeteilte Arbeitsaufträge ist der erste lokale Briefkasten umgesetzt: Das Schülergerät erzeugt nach dem bewussten Abschluss einen statischen, mit dem Einschreibungstoken HMAC-signierten Abgabenachweis. Der Lehrer-QR-Leser prüft Signatur, Klasse und Zuteilung, speichert je Aufgabe und Mitgliedschaft nur den höchsten Stand und zeigt **„x von y abgegeben“** sowie ausstehende Schüler. Doppelte und ältere Nachweise werden erkannt. Ton, Vibration, grüner Scanrahmen, Filter, Löschfrist und der umfangreichere verschlüsselte Ranking-Leistungsbrief bleiben getrennte Ausbauschritte.

## Datenschutz

Standardmäßig werden Pseudonyme, Teams und aggregierte Lernereignisse angezeigt. Klarnamen und dauerhafte Leistungsübersichten sind eine zusätzliche, schulrechtlich zu prüfende Funktion.
