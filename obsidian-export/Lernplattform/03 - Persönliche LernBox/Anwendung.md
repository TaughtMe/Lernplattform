# Persönliche LernBox

## Zweck

Die LernBox ist das lokale Langzeitgedächtnis des Schülers. In Version 1 sammelt sie Unterrichtsvokabeln, eigene Inhalte und optional übernommene Wörter aus Duellen. Später kommen Lernwörter und mathematische Aufgabenfamilien als eigene Lernobjekte hinzu.

Die LernBox ist Teil des gemeinsamen persönlichen Lernraums. **Heute üben**, ein einzelnes Fach, ein bestimmter Stapel und freies Üben sind verschiedene Auswahlen auf denselben Lernbestand; sie erzeugen keine konkurrierenden LernBoxen oder Lernstände.

## Ein Lernstand, mehrere Quellen

Ein Lernobjekt kann gleichzeitig zu eigenen Sammlungen, übernommenen Lehrkraftstapeln und früheren Unterrichtsrunden gehören. Es wird möglichst nur einmal gespeichert und mit mehreren Quellen verknüpft. Eine Bearbeitung verbessert denselben persönlichen Lernstand – unabhängig davon, über welchen Einstieg die Runde begonnen wurde.

Fach und Sprachpaar bleiben verbindliche Grenzen. Gleich geschriebene Wörter werden nicht allein anhand ihres Textes zusammengeführt: Sprache, Grundform, Bedeutungsvariante, Abfragerichtung und gegebenenfalls Verwendungskontext entscheiden, ob derselbe Eintrag vorliegt. So bleiben beispielsweise unterschiedliche Bedeutungen eines Wortes getrennt.

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
- nach Fach und Sprachpaar
- nach Quelle: selbst angelegt, Lehrkraft, Laufdiktat oder andere Lernaktivität

## Auswahl vor dem Lernen

Der Schüler kann jederzeit wählen:

- **Alles fällige:** fachübergreifende Tagesauswahl in kurzen Fachblöcken
- **ein Fach:** nur Fälligkeiten, Fehler und neue Inhalte dieses Fachs
- **ein Stapel:** gezielte Auswahl innerhalb eines Fachs
- **frei üben:** selbst gewählte Inhalte ohne zweiten Lernstand

## Vokabel-Lernrunde

Eine Lernrunde bildet keinen einzelnen Demo-Versuch ab, sondern wählt beim Start die für Modus und Richtung fälligen Karten eines Stapels aus. Die Auswahl bleibt während der Runde stabil und zeigt Karte, Restmenge und Abschlussstand.

- **Schreiben:** Die Antwort wird verdeckt selbst eingegeben. Eine richtige Eingabe bewertet Bedeutung und Schreiben; eine falsche Eingabe setzt beide betroffenen Stände nach den Leitner-Regeln zurück.
- **Karteikarten:** Die Lösung wird bewusst aufgedeckt und anschließend mit „Gewusst“ oder „Noch üben“ selbst bewertet. Dieser schwächere Nachweis verändert nur den Bedeutungsstand und erlaubt wegen der gezeigten Lösung keinen regulären Aufstieg.
- **Richtungen:** Fremdsprache → Deutsch und Deutsch → Fremdsprache besitzen getrennte Fälligkeiten und Boxstände.
- **Rundenende:** Die Oberfläche fasst gewusste und weiter zu übende Karten zusammen. Fehler können danach als neue fällige Runde erneut geladen werden.

Unter **Meine LernBox** läuft keine zweite Anwendung. Deckverwaltung, Kartenverwaltung, die ursprünglichen Leitner-Übergänge, beide Lernrichtungen, Schreib- und Karteikartenmodus sowie Datei-Sicherung sind gezielt aus LernBoxV2 in den gemeinsamen Lernraum portiert. Die Oberfläche verwendet die globale Navigation, Theme-Präferenz und responsive Grundlage; eine eigene PWA-Hülle, ein eigener Router, ein eigener Service Worker und doppelte allgemeine Einstellungen sind ausgeschlossen.

Decks, Karten, Herkunft und Lernstände liegen in derselben persönlichen Lernraum-Datenbank wie die gemeinsamen Lernereignisse. Ein versionierter Eingangsadapter kann fehlerhafte Wörter aus dem Laufdiktat dublettenfrei übernehmen und sofort fällig machen. Bis das Laufdiktat selbst nativ integriert ist, ist sein Ergebnisfluss noch an diesen Adapter anzuschließen.

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
- Ein aktualisiertes Lehrkraftpaket ergänzt oder aktualisiert anhand stabiler IDs, ohne den persönlichen Lernstand zurückzusetzen.
- Eigene Wörter werden ohne bewusste Freigabe nicht übertragen.
- Bei gemeinsam genutzten Geräten müssen Profile oder getrennte lokale Bereiche vorgesehen werden.

## Risiko

Gelöschte Browserdaten oder ein Gerätewechsel können lokale Lernstände entfernen. Deshalb sind Export und verschlüsseltes Backup wichtig.
