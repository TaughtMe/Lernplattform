# Umsetzungsplan „Lernraum UI“ v2: vom Design aus bauen

Stand: 29.09.2026 · Branch `claude/lernraum-ui-v2` (abgezweigt von `claude/lernraum-ui`)

## Warum v2

In Phase 0–12 (siehe [umsetzungsplan-lernraum-ui.md](umsetzungsplan-lernraum-ui.md)) wurden die bestehenden Seiten ins Design umgebaut. Dadurch bestimmten die alte Seitenstruktur, die alten Texte und die alte Reihenfolge weiter das Ergebnis. Das Design war angenähert, aber nicht identisch.

v2 dreht die Richtung um:

1. **Zuerst die Oberfläche.** Jeder Screen der Vorlage wird als reine Ansicht (`app/views/`) umgesetzt, mit Beispieldaten, ohne Speicher und ohne Supabase.
2. **Messbar identisch.** Jeder Zustand wird automatisch Pixel gegen Pixel mit einem Referenzbild aus der Vorlage verglichen.
3. **Erst danach anbinden.** Pro Screen verbindet ein Hook die Ansicht mit dem vorhandenen Kern (`src/domain`, `src/storage`, Supabase-Verträge). Jede Anbindung ist eine eigene, getestete Scheibe.

Fachlogik, Speicherung, Datensicherung, Freigaberegister, Supabase-Verträge und Tests bleiben unverändert erhalten.

## Bausteine

| Teil                 | Ort                                                 | Zweck                                                                                                   |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Design-Tokens        | `app/ui/tokens.css`                                 | Farben, Schriften, Radien aus der Vorlage, hell und dunkel                                              |
| Schriften            | `@fontsource-variable/work-sans`, `…/fredoka`       | lokal ausgeliefert statt von Google Fonts (Datenschutz, offline, gleiche Dateien wie in den Referenzen) |
| Ansichten            | `app/views/<bereich>/<screen>.tsx` + CSS-Modul      | reine Darstellung, Zustand und Aktionen nur über Props                                                  |
| Gemeinsame Bausteine | `app/views/parts/`                                  | Knöpfe, Chips, Tierbild, Typografie- und Boxmodell-Grundlage (`.view`)                                  |
| Beispieldaten        | `app/views/<bereich>/demo.ts`                       | Daten der Vorlage für Katalog und Vergleich                                                             |
| Katalog              | `/entwicklung/screens`, `/entwicklung/screens/<id>` | jede Ansicht in exakter Rahmengröße, nur in der Entwicklung erreichbar                                  |
| Referenzzustände     | `docs/design/screens.json`                          | welcher Screen, welche Größe, welche Klicks im Canvas                                                   |
| Referenzbilder       | `docs/design/referenz/<id>.png`                     | erzeugt mit `npm run design:references` aus `lernraum-ui.dc.html`                                       |
| Vergleichstest       | `e2e/design/design-fidelity.spec.ts`                | `npm run test:design`, Chromium, Toleranz 1,2 % der Pixel (Kantenglättung, proportionale Balken)        |
| Typen der CSS-Module | `*.module.css.d.ts`                                 | erzeugt mit `npm run css-types`; `npm run typecheck` prüft, dass sie aktuell sind                       |

### Was die Vorlage technisch vorgibt

Beim Nachmessen der Vorlage fielen drei Browser-Standards auf, die das Aussehen prägen. Die Grundlage `.view` in `app/views/parts/parts.module.css` bildet sie nach:

- **Schrift in Schaltflächen:** Buttons erben in der Vorlage die Schrift nicht. Sie zeigen die Standardschrift des Browsers für Bedienelemente: San Francisco auf Apple-Geräten, Segoe UI unter Windows, sonst Arial. Token `--font-control`. Soll es später doch Work Sans sein, genügt eine Zeile.
- **Boxmodell:** Nur Buttons und Auswahlfelder messen mit Rahmen (border-box), alle übrigen Elemente ohne (content-box), inklusive Standard-Innenabständen.
- **Zeilenhöhe:** `normal` statt 1,5.

### Bewusste Abweichungen von der Vorlage

- `--ink3` ist für WCAG-AA-Kontrast leicht nachgedunkelt bzw. aufgehellt.
- Fehlerbalken im Live-Screen sind proportional zur Fehlerzahl; die Vorlage zeigt feste Beispielbreiten.
- Der Raumcode bleibt vierstellig numerisch (Supabase-Vertrag). Die Beispieldaten nutzen „4K2P“ nur, um die Vorlage exakt abzubilden.

## Reihenfolge

Jeder Schritt endet mit grünem Designvergleich, grünen statischen Prüfungen und Freigabe der Ansicht durch die Projektverantwortliche Lehrkraft im Katalog, bevor die Anbindung beginnt.

| Schritt | Screens                    | Ansicht                            | Anbindung                                                                |
| ------- | -------------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| 1       | Grundlage                  | ✅ Tokens, Schriften, Vergleich    | –                                                                        |
| 2       | 2a Startseite              | ✅                                 | offen: Tierprofil, Raumcode, QR-Scanner, Freigaberegister                |
| 3       | 5a/5b Laufdiktat Schüler   | ✅ alle Phasen, hell/dunkel        | offen: Raum-Session, Stationen, Halten/Lesen/Schreiben, Battle, Ergebnis |
| 4       | 5c/5d Laufdiktat Lehrkraft | ✅ alle Schritte, Optionen-Overlay | offen: Import, Abschnitte, Modi, Lobby, Live, CSV                        |
| 5       | 4a–4c LernBox              | offen                              | offen                                                                    |
| 6       | 2b/3a/3b Dashboard         | offen                              | offen                                                                    |
| 7       | 4d–4f Wortspeicher         | offen                              | offen                                                                    |
| 8       | 1d/2c/3c/3d Lehrerbereich  | offen                              | offen                                                                    |
| 9       | 6a–6c Tastenwelt           | offen                              | offen                                                                    |
| 10      | 7a–7c Häuser               | offen                              | offen                                                                    |

Bereiche ohne Vorlage (Klassenverwaltung, Material, Aufgaben, Kopfrechnen) bleiben bis zu einem eigenen Design in ihrer jetzigen Form und werden über das Freigaberegister gesteuert.

## Regeln für die Anbindung

- Ansichten bleiben rein: keine Speicherzugriffe, kein Supabase, keine Zeit- oder Zufallsquellen in `app/views/`.
- Pro Screen ein Hook, der `[props]` für die Ansicht liefert; Tests für den Hook und für die Route.
- Verhalten gegen die Original-Repos (Laufdiktat, LernBox) prüfen, z. B. mit [laufdiktat-parity.md](laufdiktat-parity.md).
- Alte Screens und ihre Stile werden erst gelöscht, wenn die neue Route angebunden ist. Am Ende bleiben von `lernraum-ui.css` nur die Teile, die noch genutzt werden.
