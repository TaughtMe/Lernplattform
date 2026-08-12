# Persönliche LernBox

## Zweck

Die LernBox ist das lokale Langzeitgedächtnis des Schülers. In Version 1 sammelt sie Unterrichtsvokabeln, eigene Inhalte und optional übernommene Wörter aus Duellen. Später kommen Lernwörter und mathematische Aufgabenfamilien als eigene Lernobjekte hinzu.

Die LernBox bleibt ein eigener persönlicher Bereich und wird nicht durch „Heute üben“ ersetzt. Eine Klassen-Tagesauswahl darf Fälligkeiten und Fehlerhinweise aus dem gemeinsamen Lernkern verwenden, zeigt sie aber im Kontext der jeweiligen Klasse und ihrer aktivierten Module.

## Anwendung

Die Startansicht zeigt zum Beispiel:

- heute fällige Wörter
- schwierige Wörter
- zuletzt hinzugefügte Inhalte
- häufig falsch beantwortete Wörter
- persönliche Fehlerübungen aus Laufdiktat und Testmodus
- Fortschritt nach Stapel, Tag oder Box

## Ansichten

- alle Vokabeln
- nach Tag oder Unterrichtseinheit
- nach Leitner-Box
- nach Herkunft
- nach Fälligkeit
- nach persönlicher Schwierigkeit
- nach Lernobjekttyp: Vokabel, Lernwort oder später mathematische Aufgabenfamilie

## Vokabel-Lernrunde

Eine Lernrunde bildet keinen einzelnen Demo-Versuch ab, sondern wählt beim Start die für Modus und Richtung fälligen Karten eines Stapels aus. Die Auswahl bleibt während der Runde stabil und zeigt Karte, Restmenge und Abschlussstand.

- **Schreiben:** Die Antwort wird verdeckt selbst eingegeben. Eine richtige Eingabe bewertet Bedeutung und Schreiben; eine falsche Eingabe setzt beide betroffenen Stände nach den Leitner-Regeln zurück.
- **Karteikarten:** Die Lösung wird bewusst aufgedeckt und anschließend mit „Gewusst“ oder „Noch üben“ selbst bewertet. Dieser schwächere Nachweis verändert nur den Bedeutungsstand und erlaubt wegen der gezeigten Lösung keinen regulären Aufstieg.
- **Richtungen:** Fremdsprache → Deutsch und Deutsch → Fremdsprache besitzen getrennte Fälligkeiten und Boxstände.
- **Rundenende:** Die Oberfläche fasst gewusste und weiter zu übende Karten zusammen. Fehler können danach als neue fällige Runde erneut geladen werden.

Die vollständige LernBoxV2 ist unter **Meine LernBox** integriert. Deckverwaltung, Kartenverwaltung, Leitner-Lernen, beide Lernrichtungen, Schreibtraining, Übungsmodus, Vokabeltests, Tags, Import, Export, Sicherung, Einstellungen und lokale Dexie-Speicherung stammen aus dem funktionsfähigen Quellmodul. Der zuvor gebaute einzelne Lernraum-Prototyp ist nicht mehr die Zielimplementierung.

Die Lernraum-Hülle ergänzt den gemeinsamen Einstieg und übernimmt die systemweite Theme-Präferenz. Klassenfreigaben und die Ergebnisübergabe werden als Adapter ergänzt, ohne die vorhandene LernBox-Fachlogik zu ersetzen.

## Persönliche Fehlerübung

Nach einem Test erzeugt **„Meine Fehler jetzt üben“** aus den fehlerhaften Vokabel-IDs eine Übungsrunde. Nach Hilfen folgt immer noch ein verdeckter Abruf. Erst eine spätere richtige Antwort ohne Hilfe erlaubt den regulären Aufstieg im Leitner-System.

## Lernwörter

Lernwörter können aus Laufdiktaten, Tests, eigenen Texten, Lehrerzuweisungen und festen Listen entstehen. Vorgesehene Sammlungen umfassen unter anderem:

- ie, ih und ieh; Dehnungs-h; Doppelvokale
- Doppelkonsonanten; ck und tz; s, ss und ß
- ä/e und äu/eu; Auslautverhärtung; f/v und w/v
- Groß- und Kleinschreibung sowie Wortbausteine
- Silbieren, Verlängern, Ableiten und echte Merkwörter

Mathematik wird später nicht als Sammlung einzelner falscher Ergebnisse gespeichert. Stattdessen verweist ein Lernobjekt auf eine Kompetenz oder Aufgabenfamilie, aus der passende neue Aufgaben erzeugt werden.

## Regeln

- Persönliche Lernstände gehören dem Gerät.
- Freies Üben und persönliche LernBox werden nicht automatisch dem Klassenranking zugerechnet.
- Entfernte Lehrervokabeln werden nicht automatisch aus der LernBox gelöscht.
- Eigene Wörter werden ohne bewusste Freigabe nicht übertragen.
- Bei gemeinsam genutzten Geräten müssen Profile oder getrennte lokale Bereiche vorgesehen werden.

## Risiko

Gelöschte Browserdaten oder ein Gerätewechsel können lokale Lernstände entfernen. Deshalb sind Export und verschlüsseltes Backup wichtig.
