# Lokale Daten, Export und Cloud-Backup

## Lokale Daten

Auf dem Schülergerät bleiben standardmäßig:

- Vokabeln und eigene Stapel
- Tags
- Lernstände und Fälligkeiten
- Lernhistorie
- Siege und Niederlagen
- persönliche XP
- Geschwindigkeit und Einstellungen

## Manueller Export

Eine verschlüsselte Sicherungsdatei ermöglicht Gerätewechsel, Wiederherstellung und eine unabhängige Archivierung.

## Lehrkraftinhalte

Auch die langfristige Inhaltsbibliothek der Lehrkraft bleibt unter ihrer Kontrolle. Sie kann lokal gespeichert, als Datei exportiert oder freiwillig in einer beliebigen geeigneten Cloud gesichert werden. Supabase ist dafür nicht die verbindliche Dauerablage.

Für die Verteilung wählt die Lehrkraft Inhalte aus dieser Quelle und erzeugt bewusst ein temporäres, verschlüsseltes Paket. Der Übergaberaum besteht höchstens 24 Stunden; danach muss eine neue Freigabe erzeugt werden. Die eigene Originalbibliothek bleibt davon unberührt und kann im nächsten Schuljahr wiederverwendet werden.

## Optionaler Cloud-Backup

Das persönliche Cloud-Backup ist freiwillig und ausschließlich für Sicherung, Gerätewechsel und eine optionale geräteübergreifende Nutzung gedacht. Es bleibt technisch und organisatorisch von Klasseneinschreibung, QR-Leistungsbrief und Lehrer-Ranking getrennt. Die Lehrkraft erhält keinen Zugriff auf dieses Backup.

Mögliche Ziele:

- Nextcloud oder WebDAV
- OneDrive
- Google Drive
- schulischer Speicher
- manuelle Dateiablage

## Sicherungsstrategie

- direkt auf dem Gerät verschlüsseln
- nach abgeschlossenen Lernrunden und größeren Änderungen sichern
- fehlgeschlagene Sicherung später nachholen
- zum Beispiel die letzten 30 Versionen behalten
- Umfang der Sicherung auswählbar machen

Ein Upload erst beim Schließen ist im Browser unzuverlässig. Gesichert wird deshalb nach abgeschlossenen Aktionen.

## Wiederherstellung

Vor dem Einspielen zeigt die App Inhalt, Datum und Datenformat-Version an. Konflikte werden nachvollziehbar gelöst, ohne neuere Lernstände unbemerkt zu überschreiben.
