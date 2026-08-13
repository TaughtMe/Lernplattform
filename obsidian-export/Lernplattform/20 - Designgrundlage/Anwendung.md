---
tags:
  - lernplattform
  - design
  - ui
  - ux
  - startseite
status: designgrundlage
stand: 2026-08-13
---

# Designgrundlage

## Status und Zweck

Der abgestimmte Startseitenentwurf dient als **visuelle und konzeptionelle Designgrundlage** für Lernraum. Er legt die gewünschte Richtung für Oberfläche, Navigation, Farbwirkung und zentrale Interaktionen fest. Er ist noch kein pixelgenaues finales Design; Details dürfen bei Umsetzung, Responsivität, Barrierefreiheit und Nutzertests angepasst werden.

## Referenzentwurf

![[Lernraum-Startseite-Referenz.png]]

## Markenwirkung

- **Name:** Lernraum
- **Stimmung:** freundlich, warm, ruhig und modern
- **Charakter:** schulisch und motivierend, aber nicht kindlich oder überladen
- **Typografie:** gut lesbare, freundliche Sans-Serif mit leicht runden Formen
- **Flächen:** viel Freiraum, helle Karten und weiche Rundungen

## Farbrollen

- **Korall** ist die primäre Markenfarbe. Sie kennzeichnet Logo, zentrale persönliche Aktionen und ausgewählte aktive Zustände.
- **Teal** ist die sekundäre Aktionsfarbe. Sie eignet sich besonders für Raumbeitritt, bestätigende Aktionen und positive Zustände.
- **Warmes Creme** bildet den ruhigen Seitenhintergrund.
- **Dunkelbraun** wird für Überschriften und Fließtext statt hartem Schwarz verwendet.
- Fachkacheln erhalten eigene, klar unterscheidbare Akzentfarben.

Vorläufige Richtwerte für die spätere Token-Definition:

```text
primary-coral: warmes Korallrot
secondary-teal: kräftiges Teal
background-warm: sehr helles Creme
surface: Weiß
text-primary: sehr dunkles Braun
text-secondary: gedämpftes Braun/Grau
```

Die endgültigen Farbwerte werden bei der Implementierung festgelegt und auf ausreichenden Kontrast nach WCAG geprüft.

## Heller und dunkler Darstellungsmodus

Lernraum unterstützt von Beginn an **Hell**, **Dunkel** und **System**. Die Wahl gilt plattformweit, wird lokal auf dem Gerät gespeichert und vor dem ersten Rendern angewendet, damit beim Seitenwechsel kein heller oder dunkler Blitz entsteht. „System“ folgt der Betriebssystemeinstellung und reagiert auch auf deren Änderung.

- Alle Farben werden über semantische Design-Tokens wie Hintergrund, Oberfläche, Text, Linie und Aktionsfarbe vergeben.
- Fach- und Statusfarben müssen in beiden Modi ausreichenden Kontrast besitzen und dürfen nie die einzige Information tragen.
- Neue Komponenten gelten erst als fertig, wenn Fokus, Hover, Fehler, Erfolg, deaktivierte Zustände und Inhalte in beiden Modi geprüft wurden.
- Browserleisten erhalten einen zur Systemeinstellung passenden Farbhinweis.
- Der Umschalter bleibt auf Smartphone, Tablet und Desktop erreichbar, ohne Lernaktionen oder die mobile Navigation zu verdecken.

### Dunkelmodus: warm charcoal statt dunkelbrauner Flächen

Der Dunkelmodus übersetzt die ruhige Hierarchie des Lightmodes und ist keine bloße Abdunkelung. Große Flächen liegen eng beieinander; Farbe bleibt auf Orientierung und Aktionen begrenzt.

```text
background:     #171513
surface:        #211E1B
surface-hover:  #28231F
border:         #39332E
text-primary:   #F4EEE8
text-secondary: #B9ADA3
accent-coral:   #E77A78
accent-teal:    #58B8B5
```

- Header verwenden denselben warmen Anthrazitgrund wie die Seite und werden nur durch eine feine Linie `#302B27` getrennt.
- Die Lernraum-Karte darf mit `#241D1B` minimal rötlich, die Karte „Freies Üben“ mit `#192322` minimal türkis getönt sein.
- Karten verzichten im Ruhezustand auf starke Schatten und farbige Konturen. Hover hebt Fläche und Kontur nur leicht an.
- Modultags bleiben transparent mit zurückhaltender Kontur `#554C45` und sekundärer Textfarbe.
- Das Türkis wird im Dunkelmodus entsättigt und darf auf großen Aktionsflächen nicht wie eine neue Markenfarbe wirken.

## Navigation

Die Startseite bleibt ruhig und zeigt als zentrale Entscheidungen **Mein Lernraum** und **Freies Üben**. Darunter steht die Code-Eingabe für einen Raum. Beispielgruppen, Duell und Haus gehören nicht auf die Hauptseite.

Nach dem Einstieg zeigt **Mein Lernraum** die lokal bekannten Klassen und erneut die Möglichkeit, per Code beizutreten. Innerhalb einer Klasse kehren drei Bereiche in derselben Reihenfolge wieder:

1. **Heute üben** – fällige Inhalte sowie sinnvolle Wiederholungen aus früheren Fehlern
2. **Frei üben** – alle in der Klasse aktivierten Grundlagenmodule
3. **Mein Fortschritt** – private Rückmeldung zu Aktivität und verbesserten Fehlern

Diese drei Bereiche bilden eine zusammenhängende Arbeitsansicht, keine Sammlung getrennter Anwendungen. LernBox ist ein fester Lernweg. Das klassische Laufdiktat wird separat per Raumcode betreten, bleibt aber technisch ein nativer Teil des Lernraums.

## Verbindliche Ansichten

### Bereichseinstieg

Der Einstieg beantwortet nur: **Wo möchte ich arbeiten?** Große, ruhige Flächen führen zu Klasse oder freiem Üben. Fachmodule werden als Wege dargestellt, nicht als konkurrierende Produktwelten.

### Klassenraum

Der Klassenraum beantwortet: **Was hilft mir heute weiter?** Er verbindet persönliche Fälligkeiten, freie Wahl und Fortschritt auf einer Seite. Eine kompakte Sprungnavigation darf die drei Bereiche sichtbar halten.

### Aktive Lernrunde

Während einer Aufgabe wird die Oberfläche deutlich reduziert. Eingabe, Rückmeldung und nächster sinnvoller Schritt stehen im Vordergrund. Enter bestätigt; nach einer richtigen Antwort folgt bei passenden Formaten automatisch die nächste Aufgabe mit gesetztem Fokus.

### Lehrkraft

Die Lehrkraft aktiviert die Grundlagenmodule einer Klasse. Hausaufgaben und konkrete Übungsbereiche teilt sie weiterhin klassisch mit; Lernraum bildet keinen digitalen Wochen- oder Aufgabenplaner ab.

Freie Übungsbereiche erhalten feste Orientierungssymbole. Klassen erhalten kein automatisch zugewiesenes Symbol; ein Klassensymbol erscheint nur, wenn die Lehrkraft später selbst eines hinterlegt.

## Komponentenprinzipien

- Korall bleibt als Markenfarbe deutlich erkennbar, ohne jede Fläche einzufärben.
- Teal wird gezielt als funktionaler Kontrast verwendet.
- Pro Ansicht soll eine klare primäre Aktion erkennbar sein.
- Sekundäre Aktionen bleiben visuell zurückhaltend.
- Karten verwenden helle Flächen, feine Konturen, moderate Rundungen und wenig Schatten.
- Fachfarben unterstützen die Orientierung, ersetzen aber keine Textbeschriftung.
- Sprache bleibt kurz, freundlich und handlungsorientiert.
- Arbeitsansichten verzichten auf öffentliche Demo-Inhalte, große Werbe-Heros und unnötige Navigation.
- „Heute üben“ erklärt knapp, warum ein Inhalt erscheint: fällig, aus Fehlern oder durch die Lehrkraft.
- Positive Rückmeldung würdigt jede sinnvolle Übung; Menge darf sichtbar werden, aber kleine Beiträge werden nicht abgewertet.
- Modulgrenzen sind visuell erkennbar, unterbrechen aber nicht den gemeinsamen Lernfluss.

## Responsive und barrierearme Umsetzung

- Navigation wird auf kleinen Bildschirmen verdichtet, ohne den Raumbeitritt zu verstecken.
- Beschriftung und kurzer Hilfetext stehen oberhalb der Code-Eingabe; Eingabe, Kamera und Beitritt werden nicht mit dem Text in eine enge gemeinsame Zeile gezwängt.
- Reine vierstellige Raumcodes verwenden vier kleine Ziffernfelder mit automatischem Fokuswechsel und Einfügen-Unterstützung. Kombinierte Klassen- oder Raumcodes behalten wegen ihrer variablen Länge ein zusammenhängendes Feld.
- Codefelder und Hauptaktionen werden mobil bei Bedarf untereinander angeordnet.
- Kacheln wechseln von drei Spalten auf zwei beziehungsweise eine Spalte.
- Interaktive Elemente erhalten ausreichend große Trefferflächen und sichtbare Fokuszustände.
- Informationen werden nie ausschließlich über Farbe vermittelt.
- Kontrast, Zoom, Tastaturbedienung und Screenreader-Beschriftungen werden vor Freigabe geprüft.

## Abgrenzung

Diese Grundlage beschreibt die gemeinsame visuelle Sprache und die verbindliche Struktur der Hauptansichten. Fachlogik und Datengrenzen werden in den jeweiligen Modulen festgelegt.

Siehe auch [[../01 - Plattform und Navigation/Anwendung|Plattform und Navigation]], [[../03 - Persönliche LernBox/Anwendung|Persönliche LernBox]], [[../04 - Lehrer-Cockpit/Anwendung|Lehrer-Cockpit]], [[../13 - Datenschutz und Rollen/Anwendung|Datenschutz und Rollen]] und [[../22 - Adaptiver Lernkreislauf/Anwendung|Adaptiver Lernkreislauf]].
