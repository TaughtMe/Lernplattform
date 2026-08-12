# Integration der bestehenden Anwendungen

## Verbindliche Quellen

| Modul      | Repository            | abgeglichener Stand                        | Rolle                                                                                                        |
| ---------- | --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| LernBox    | `TaughtMe/LernBoxV2`  | `64051b6da45a9a29ce67cdecceef815718a13818` | vollständige Referenz für Decks, Karten, Leitner-Lernen, Import/Export, Einstellungen und lokale Speicherung |
| Laufdiktat | `TaughtMe/Laufdiktat` | `6c2ade41eadd2721f051df168244ed09563cea21` | vollständige Referenz für Dashboard, Räume, Spielmodi, Stationen, Battle, Importe, Feedback und Realtime     |

Ein neuer Abgleich aktualisiert die Commit-IDs in diesem Dokument. Änderungen werden anschließend als Upstream-Differenz geprüft, statt Funktionen im Lernraum erneut zu entwerfen.

## Was unverändert übernommen wird

- fachliche Regeln und Zustandsübergänge
- vorhandene Lern- und Unterrichtsabläufe
- getestete Utility-Funktionen und Validierungen
- Komponentenstruktur, soweit sie nicht von einem eigenständigen Router abhängt
- vorhandene Unit-Tests als Integrationsschutz

## Was der Lernraum ergänzt

- gemeinsame Kopfzeile, Navigation und responsives Theme
- Einbettung unter stabilen Lernraum-Routen
- Klassen- und Modulfreigaben
- Zuordnung zu Schüler, Klasse und Lehrkraft
- Übergabe vorhandener Ergebnisse an den gemeinsamen Lernverlauf und das optionale Klassenranking
- Namensräume für lokale Daten, Cache und Realtime-Konfiguration

Diese Ergänzungen dürfen das Verhalten des Quellmoduls nicht stillschweigend verändern. Abweichungen brauchen einen dokumentierten pädagogischen oder technischen Grund und einen Test.

## Integrationsreihenfolge

1. LernBoxV2 vollständig unter dem persönlichen LernBox-Einstieg verfügbar machen. Die übernommene Quelle liegt unter `integrations/lernbox`; ihr Produktionsbuild wird automatisch und isoliert unter `/integrations/lernbox/` eingebettet.
2. Laufdiktat mit Schüleransicht, Lehrer-Dashboard und allen vorhandenen Modi einbinden.
3. Router, Theme und lokale Speicherbereiche in die Lernraum-Hülle überführen.
4. Klassenfreigaben und Ergebnisadapter ergänzen.
5. Die Tests beider Quellprojekte in das gemeinsame Quality Gate aufnehmen.
6. Upstream-Änderungen regelmäßig commitgenau abgleichen.
