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

Eine portable Sicherungsdatei ermöglicht Gerätewechsel, Wiederherstellung und eine unabhängige Archivierung. Sie kann in ein vom Nutzer gewähltes lokales Verzeichnis geschrieben oder manuell heruntergeladen werden.

## Lehrkraftinhalte

Auch die langfristige Inhaltsbibliothek der Lehrkraft bleibt unter ihrer Kontrolle. Sie kann lokal gespeichert, als Datei exportiert oder freiwillig in einer beliebigen geeigneten Cloud gesichert werden. Supabase ist dafür nicht die verbindliche Dauerablage.

Für die Verteilung wählt die Lehrkraft Inhalte aus dieser Quelle und erzeugt bewusst ein temporäres, verschlüsseltes Paket. Der Übergaberaum besteht höchstens 24 Stunden; danach muss eine neue Freigabe erzeugt werden. Die eigene Originalbibliothek bleibt davon unberührt und kann im nächsten Schuljahr wiederverwendet werden.

## Optionaler Cloud-Backup

Das persönliche Cloud-Backup ist freiwillig und ausschließlich für Sicherung, Gerätewechsel und eine optionale geräteübergreifende Nutzung gedacht. Es bleibt technisch und organisatorisch von Klasseneinschreibung, QR-Leistungsbrief und Lehrer-Ranking getrennt. Die Lehrkraft erhält keinen Zugriff auf dieses Backup.

Die Plattform stellt ausschließlich die Schnittstelle zum ausgewählten Speicherziel sowie Export und Wiederherstellung bereit. Der Nutzer entscheidet selbst, welchen Anbieter oder Server er verwendet, welche Daten er dort speichert und mit wem er Sicherungsdateien oder Zugänge teilt. Vor dem Aktivieren weist die Oberfläche ausdrücklich darauf hin, dass sensible oder personenbezogene Daten im gewählten Ziel liegen können und dass Freigaben, Kontoschutz, Speicherort, Aufbewahrung und Löschung in der Verantwortung des Nutzers beziehungsweise der zuständigen Schule liegen.

Diese Nutzerverantwortung ersetzt nicht die Verantwortung der Plattform für eine technisch sichere Anbindung, minimale Berechtigungen, verständliche Einwilligungs- und Widerrufsmöglichkeiten sowie transparente Datenschutzinformationen. Die Plattform teilt Sicherungen niemals selbstständig und übermittelt sie nur nach einer bewussten Auswahl des Nutzers.

Mögliche Ziele:

- lokales, vom Nutzer gewähltes Verzeichnis auf dem Gerät
- Google Drive
- Microsoft OneDrive
- frei konfigurierbares WebDAV-Ziel, zum Beispiel Nextcloud oder ownCloud
- WebDAV-kompatibler schulischer Speicher
- manueller Download als universeller Rückfallweg

## Sicherungsstrategie

- keine zusätzliche anwendungsseitige Verschlüsselung voraussetzen; Geräte-, Transport- und Anbieterschutz verwenden
- optionale Dateiverschlüsselung später als zusätzliche Schutzstufe ermöglichen
- nach abgeschlossenen Lernrunden und größeren Änderungen sichern
- fehlgeschlagene Sicherung später nachholen
- zum Beispiel die letzten 30 Versionen behalten
- Umfang der Sicherung auswählbar machen

Die lokale Verzeichnisauswahl wird angeboten, soweit Browser und Betriebssystem einen dauerhaften Dateizugriff zulassen. Andernfalls bleibt der manuelle Download verfügbar. Google Drive und OneDrive werden über die jeweilige Anmeldung des Nutzers angebunden. Für WebDAV hinterlegt der Nutzer Serveradresse und Zugangsdaten beziehungsweise ein anwendungsspezifisches Passwort; dadurch bleiben Nextcloud, ownCloud und andere kompatible Dienste frei wählbar.

## Anbieterfreischaltung

Google Drive und Microsoft OneDrive benötigen vor der Nutzung jeweils eine registrierte OAuth-Anwendung:

- **Google Drive:** Google-Cloud-Projekt anlegen, Drive API aktivieren, OAuth-Zustimmungsbildschirm und erlaubte Weiterleitungs- beziehungsweise JavaScript-Ursprünge konfigurieren und einen möglichst engen Drive-Berechtigungsumfang verwenden. Test- und Produktivkonfiguration werden getrennt. Eine öffentliche Freigabe kann abhängig vom Berechtigungsumfang eine Google-Prüfung erfordern.
- **Microsoft OneDrive:** Anwendung in Microsoft Entra ID registrieren, Web-/SPA-Weiterleitungsadressen konfigurieren und die erforderliche delegierte Microsoft-Graph-Berechtigung hinterlegen. Bevorzugt wird der auf den Anwendungsordner begrenzte Zugriff, soweit die vorgesehenen persönlichen und schulischen Kontotypen ihn unterstützen.
- **WebDAV:** keine zentrale Freischaltung bei der Lernplattform. Der Nutzer trägt Serveradresse und eigene Zugangsdaten oder ein anwendungsspezifisches Passwort ein. Der Server muss HTTPS, WebDAV und Zugriffe von der Plattform-Domain erlauben.

Client-IDs und zulässige Weiterleitungsadressen sind Konfiguration, keine Geheimnisse. Client-Secrets und dauerhaft verwendbare Anbieter- oder WebDAV-Passwörter dürfen nicht in den ausgelieferten Browsercode gelangen. Welche OAuth-Variante ohne Client-Secret verwendet wird, wird vor der Implementierung für die PWA verbindlich festgelegt.

Ein Upload erst beim Schließen ist im Browser unzuverlässig. Gesichert wird deshalb nach abgeschlossenen Aktionen.

## Wiederherstellung

Vor dem Einspielen zeigt die App Inhalt, Datum und Datenformat-Version an. Konflikte werden nachvollziehbar gelöst, ohne neuere Lernstände unbemerkt zu überschreiben.
