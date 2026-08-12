---
tags:
  - lernplattform
  - design
  - ui
  - ux
  - startseite
status: designgrundlage
stand: 2026-08-12
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

## Navigation

Nach dem Schülereinstieg wechselt die Plattform in eine bewusst minimalistische Arbeitsoberfläche. Sie zeigt zunächst nur **Meine Klasse(n)** und **Freies Üben**. Innerhalb einer Klasse bilden **Heute üben** und **Aufgaben** die primäre Navigation. Fachmodule erscheinen nur, wenn die Lehrkraft sie für diese Klasse aktiviert hat.

Die öffentliche Startseite ist schülerorientiert. Die Hauptnavigation lautet:

1. **Heute lernen**
2. **Raum beitreten**
3. **Duell**
4. **Mein Haus**

Der **Lehrer-Login** steht getrennt rechts im Header. Es gibt keinen frei zugänglichen Umschalter, der auf einem Schülergerät Lehrerrechte eröffnet.

## Hero-Bereich

Leitüberschrift:

> Gemeinsam lernen, im Unterricht und zu Hause.

Erklärung:

> Lernraum verbindet Unterricht und selbstständiges Wiederholen. Lehrkräfte erstellen Übungen, Schüler:innen bearbeiten sie gemeinsam und übernehmen die Inhalte anschließend in ihre persönliche LernBox.

Zentrale Aktionen:

- Eingabe eines Raumcodes mit der Aktion **Beitreten** in Teal
- **Meine LernBox öffnen** als primäre persönliche Aktion in Korall

Schüler benötigen für den Raumbeitritt grundsätzlich keinen allgemeinen Plattform-Login. Die Lehrkraft verwendet den getrennten Lehrer-Login.

## Beispiel-Lerngruppen

Die Startseite kann sechs ausdrücklich als Demo gekennzeichnete Lerngruppen zeigen:

- Englisch
- Französisch
- Spanisch
- Latein
- Deutsch
- Mathematik

Eine Kachel enthält:

- Fachkürzel und Fachfarbe
- fiktive Klasse und Jahrgang
- aktuelles Thema
- zwei bis drei kurze Beispielinhalte
- die zurückhaltende Aktion **Vorschau ansehen**

Der Hinweis lautet:

> Öffentliche Demo · echte Klassen nur per Raumcode

Echte Klassen, Schülernamen, Mitgliederzahlen und persönliche Lernstände werden nicht öffentlich dargestellt. Die Demo-Kacheln führen nicht zu einer Loginpflicht für Schüler.

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

## Responsive und barrierearme Umsetzung

- Navigation wird auf kleinen Bildschirmen verdichtet, ohne den Raumbeitritt zu verstecken.
- Raumcodefeld und Hauptaktionen werden mobil untereinander angeordnet.
- Kacheln wechseln von drei Spalten auf zwei beziehungsweise eine Spalte.
- Interaktive Elemente erhalten ausreichend große Trefferflächen und sichtbare Fokuszustände.
- Informationen werden nie ausschließlich über Farbe vermittelt.
- Kontrast, Zoom, Tastaturbedienung und Screenreader-Beschriftungen werden vor Freigabe geprüft.

## Abgrenzung

Diese Grundlage definiert zunächst die gemeinsame visuelle Sprache und die öffentliche Startseite. Detailansichten für LernBox, Unterrichtsraum, Duell, Haus und Lehrer-Cockpit werden daraus abgeleitet und jeweils fachlich geprüft.

Siehe auch [[../01 - Plattform und Navigation/Anwendung|Plattform und Navigation]], [[../03 - Persönliche LernBox/Anwendung|Persönliche LernBox]], [[../04 - Lehrer-Cockpit/Anwendung|Lehrer-Cockpit]] und [[../13 - Datenschutz und Rollen/Anwendung|Datenschutz und Rollen]].
