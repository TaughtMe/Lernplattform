# Persönliche Sicherung v2: Originaldaten erhalten

Stand: 26.10.2026. Version 0.9.2, aufbauend auf Version 0.9.1 (`489464c`).

## Verhalten

Die Sicherung enthält weiterhin den nutzbaren persönlichen Lernstand in `data`.
Unlesbare Datensätze sowie Originale, bei denen das Lesen zusätzliche oder
veränderte Informationen entfernt, stehen daneben im Bereich `recovery`.
Jeder Eintrag enthält die bekannte persönliche Tabelle, die Datensatzkennung
und das unveränderte JSON-Original. Lehrkraft- und Klassentabellen werden nicht
zusätzlich exportiert.

Beim Einspielen werden nur geprüfte Daten als Lernstand verwendet. Die Originale
bleiben separat in `backupRecovery` erhalten und erscheinen auch in jeder
folgenden Sicherung. Vorhandene lokale Zusatzinformationen werden vor einem
eventuellen Überschreiben ebenfalls dort aufbewahrt. Ein wiederholter Import
dupliziert identische Originale nicht. Widersprüchliche Originalstände bleiben
erhalten; sie werden nicht automatisch zusammengeführt oder gelöscht.

Export und Wiederherstellung verwenden jeweils eine gemeinsame
Datenbanktransaktion. Schlägt das Wiederherstellen fehl, werden auch die
Schreibvorgänge im Rettungsbereich zurückgerollt. Nicht verlustfrei als JSON
darstellbare Originale brechen den Export mit einem Fehler ab, statt eine
scheinbar vollständige Sicherung zu erzeugen.

Die Oberfläche nennt separat aufbewahrte Originale und macht deutlich, dass die
aktuelle App deren Informationen noch nicht vollständig verwenden kann. Diese
Aufbewahrung ist keine automatische fachliche Migration oder Datenreparatur.

## Kompatibilität und Bereitstellung

- Neue Dateien tragen ausdrücklich `schemaVersion: 2`. v1-Dateien und die alte
  reine Stapel/Karten-Struktur bleiben lesbar. Unbekannte höhere Versionen
  werden weiterhin abgelehnt. Alte App-Versionen können v2-Dateien nicht lesen;
  vor dem Einspielen muss die neue Version geladen sein.
- Die persönliche Dexie-Datenbank wird von Version 7 auf 8 erweitert. Bestehende
  Tabellen bleiben unverändert; lediglich `backupRecovery` kommt hinzu. Die
  Datenbank bleibt im persönlichen Datenbereich.
- Der bestehende Standarddateiname `lernraum-personal-v1.json` bei der
  Verzeichnissicherung bleibt absichtlich erhalten, damit vorhandene
  Speicherorte weitergefunden werden. Maßgeblich ist die Version im Inhalt.
- Vor einer produktiven Aktualisierung die vorhandene Sicherung behalten.
  Danach alle alten App-Tabs schließen und die aktuelle Version laden.
  Ein Code-Rollback muss die Datenbankversion 8 und das v2-Dateiformat weiterhin
  unterstützen; ein Löschen der Datenbank ist keine Rollback-Strategie.
- Hier wurden nur lokale Änderungen vorbereitet; keine produktiven Daten oder
  Deployment-Einstellungen wurden verändert.

## Gezielte Nachweise

Die Backup-Suites prüfen normale Sicherungen einschließlich Ordnern und
Zuordnungen sowie alte Formate. `personal-backup-recovery.test.ts` ergänzt:

- v7 → v8 auf einem vorhandenen Geräteprofil ohne Datenänderung;
- unbekannte lokale Felder vor einem neueren Import;
- unbekannte Felder in verschachtelten Objekten;
- Export → Datei → leeres Profil → erneuter Export mit identischen Originalen;
- v1-Import mit zusätzlichen Feldern und unbekannten ganzen Datensätzen;
- wiederholten Import ohne doppelte Originale;
- transaktionalen Rollback bei einem simulierten Schreibfehler;
- klaren Abbruch bei einem nicht als JSON darstellbaren Original.

Die Tests belegen die beschriebenen lokalen Speicherpfade. Ein Geräteverlust,
ein tatsächlich abgeschlossener Dateidownload und die spätere fachliche
Migration beliebiger zukünftiger Formate werden dadurch nicht simuliert.
