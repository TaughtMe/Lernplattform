# Sicherheitsrisikoregister

## Neubewertung am 8. September 2026

Die aktuelle Installation meldete `fast-uri` und `fflate` als verwundbare
indirekte Entwicklungsabhängigkeiten. Beide wurden innerhalb der bestehenden
Versionsbereiche aktualisiert; `npm audit` meldet anschließend null bekannte
Schwachstellen. Der historische Befund SR-001 beschreibt nicht den aktuellen
Lockdateistand.

Die Reparaturmigration erhält die Capability-Grenzen der Raum- und Transfer-API.
Abgelehnte Lehrkraftschlüssel und unbekannte Raumcodes werden dauerhaft gezählt;
die SQL-Tests prüfen das über getrennte Transaktionen. Das IP-Limit setzt voraus,
dass das vorgeschaltete Supabase-Gateway `x-forwarded-for` vertrauenswürdig setzt.
Die Gateway-Konfiguration und echte konkurrierende Requests sind vor
Produktivfreigabe separat zu prüfen. Kurze Raumcodes bleiben ein bewusstes
Pilotmerkmal; sie sind kein Ersatz für individuelle Klassenberechtigungen.

## SR-001 · Indirekte Abhängigkeiten der Build-Kette (vinext, Cloudflare, Lint)

- **Stand:** 13. Oktober 2026
- **Status:** Beobachtung. `npm audit` meldet 10 Befunde (3 mittel, 7 hoch), vorher 15 (3 mittel, 12 hoch). Mit `--omit=dev` (ausgelieferte Pakete) sind es 0.
- **Durchgeführte Updates:** `npm audit fix` (`source-map-js` 1.2.2), `@cloudflare/vite-plugin` 1.63.2 und `wrangler` 4.150.0 (beseitigt `sharp`/`miniflare`), `vinext` 1.1.0. Alle exakt gepinnt, keine Rückstufung, kein `--force`.
- **Verbleibende Meldungen:**

  | Paket (Kette)                                                                  | Schwere | Erreichbarkeit                                                                                                                                                                                                    |
  | ------------------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `braces` → `micromatch` → `fast-glob` → `@next/eslint-plugin-next`             | hoch    | Nur Entwicklungszeit (Lint). Nicht im Bundle. Für `braces` gibt es keine gepatchte Version (3.0.3 ist die neueste), auch `@next/eslint-plugin-next` 16.4.0 nutzt weiter `fast-glob`; ein `overrides` hilft nicht. |
  | `vinext` → `vite-plugin-commonjs` → `vite-plugin-dynamic-import` → `fast-glob` | hoch    | Nur Build-Zeit (Vite-Plugin auf dem Entwicklerrechner und in CI). Nicht im Bundle; Eingaben sind der eigene Quellcode.                                                                                            |
  | `vinext` → `@vercel/og` → `satori` → `fflate` (ZIP64-Endlosschleife)           | mittel  | Nur bei OG-Bildern (`ImageResponse`). Die App erzeugt keine; im Build-Ausgabeordner `dist` kommt keines der Pakete vor.                                                                                           |

- **Prüfung der Erreichbarkeit:** Suche nach den Paketnamen in `dist` nach `npm run build`: keine Treffer für `satori`, `fflate`, `@vercel/og`, `braces`, `micromatch`, `fast-glob`, `source-map-js` und die beiden Vite-Plugins (der Treffer „sharp“ ist das KaTeX-Symbol `\sharp`, nicht das Paket). Die App verarbeitet keine hochgeladenen Bilder.
- **Gegenmaßnahmen:** die Updates oben; keine Bild-Uploads und keine Verarbeitung fremder Bilddateien; wöchentliche Abhängigkeitsprüfung; erneutes Threat Modeling vor Upload-Funktionen. Die angebotene Behebung `npm audit fix --force` stuft vinext auf 0.2.1 und `@next/eslint-plugin-next` auf 14.x zurück und wird nicht angewendet.
- **Ausstiegspfad vinext:** Die App nutzt Next-APIs (`next/link` in 19, `next/navigation` in 15 und `next/headers` in 2 Dateien, Metadaten, `proxy.ts`). Ein Wechsel auf Next.js mit Cloudflare-Adapter (OpenNext) ist grundsätzlich möglich, wird aber nicht umgesetzt. Bekannte Hürden: `worker/index.ts` importiert `vinext/server/image-optimization` und `vinext/server/app-router-entry` und müsste durch den Adapter-Einstieg ersetzt werden (inklusive der Bildoptimierung über `env.IMAGES`); `vite.config.ts` und `build/sites-vite-plugin.ts` hängen an `vinext()` und `@cloudflare/vite-plugin`; vinext-Eigenheiten wie das Zurückschieben gestreamter Metadaten in den `<head>` (Manifest-Link, siehe `docs/umsetzungsplan-pwa-installierbarkeit.md`) und der Entwicklungsport sind Next-seitig neu zu prüfen.
- **Neubewertung:** monatlich oder bei jedem neuen vinext-Release.
- **Historie:** Am 12. August 2026 beschrieb SR-001 `vinext → image-size@2.0.2` (Endlosschleifen bei präparierten ICNS-, JXL- oder HEIF-Dateien). `image-size` ist nicht mehr im Lockfile; die damaligen Gegenmaßnahmen (keine Uploads) gelten weiter.

## SR-002 · Klassenstempel für die Schreiberleichterung

- **Stand:** 2. Oktober 2026
- **Status:** Bewusst akzeptiertes Restrisiko (Entscheidung 50).
- **Hinweis:** Es gibt weder Logins noch verifizierte Lehrkräfte; jeder kann den Lehrerbereich öffnen. Jede Klasse hat ein ECDSA-P-256-Schlüsselpaar. Der Raum trägt nur den SHA-256-Abdruck des öffentlichen Schlüssels (`classSeal`). Die Freigabe der Schreiberleichterung wird vom Klassenschlüssel signiert und liegt im Einschreibe-QR; das Schülergerät prüft Signatur, Passung zur Mitgliedschaft und Abdruck.
- **Geschützt gegen:** selbst ausgestellte Freigaben im Raum der echten Lehrkraft, manipulierte Freigaben (andere Mitgliedschaft, andere Klasse) und das Ändern des Schlüssels im QR. Ohne Klassenwahl beim Raumstart wirkt keine Freigabe.
- **Nicht geschützt gegen:** (1) Ein Kind kann in einer selbst gehosteten Runde mit selbst angelegter Klasse Erleichterung vergeben. Das verschafft keinen Vorteil gegenüber anderen und lässt sich ohne verifizierte Lehrkräfte nicht verhindern. (2) Der private Klassenschlüssel liegt nur auf dem Lehrergerät beziehungsweise in dessen Sicherung (Gesamt-Export); wer die Sicherung hat, kann Freigaben ausstellen. Geht der Schlüssel verloren, stellt die Lehrkraft neue QR-Codes aus.
- **Datenschutz:** Keine LRS-Information an Server, Raum oder andere Geräte. Der Raum erhält nur den Abdruck, keine Klassen-ID und keinen Namen; Toleranz und Platzierung entstehen lokal.
- **Neubewertung:** bei Einführung von Lehrerkonten oder gemeinsam genutzten Geräten.

## SR-003 · Schlüssel und Schülerdaten in fremder Cloud

- **Stand:** 5. Oktober 2026
- **Status:** Gegenmaßnahmen umgesetzt; Pilot und Freigabe offen (Entscheidung 53).
- **Hinweis:** Der optionale Geräte-Abgleich der Lehrkraft legt eine Datei im Cloud-Speicher der Lehrkraft ab (WebDAV, OneDrive, Google Drive). Je nach Umfang enthält sie Namen und Leistungsbriefe von Kindern sowie den privaten Klassenschlüssel (`classes[].seal.privateJwk`) und die Einschreibe-Schlüssel der Kinder. Wer die Datei lesen kann, kann Schreiberleichterungen und Leistungsbriefe fälschen und sieht Schülerdaten.
- **Gegenmaßnahmen:** (1) Der Abgleich ist optional und standardmäßig auf Material, Aufgaben und Klassen ohne Schlüssel beschränkt; Schülerliste und Ergebnisse sind aus und werden bewusst eingeschaltet, Schlüssel nur zusammen mit einem Passwort. (2) Die Datei lässt sich mit einem Passwort verschlüsseln (PBKDF2-SHA-256, 600 000 Durchläufe, AES-GCM-256); die Einrichtung empfiehlt das ausdrücklich und warnt bei Daten von Kindern ohne Passwort. (3) Der abgeleitete Schlüssel liegt als nicht exportierbarer `CryptoKey` nur auf Geräten, an denen „Auf diesem Gerät merken“ an ist. (4) Der Anbieter-Zugriff ist auf den App-Ordner beschränkt; die Lehrkraft bestätigt vor dem Start, dass sie für die Übertragung verantwortlich ist. (5) Schlüssel stehen nie im Inhalts-Hash und nie in Konfliktlisten; ein Gerät ohne Bereich „Schlüssel“ überschreibt sie in der Cloud nicht.
- **Nicht geschützt gegen:** (1) Unverschlüsselte Dateien sind nur durch das Cloud-Konto geschützt. (2) Ein vergessenes Passwort macht die Cloud-Datei unlesbar; sie ist nicht wiederherstellbar. (3) Gemeinsam genutzte Geräte: Wer dort angemeldet ist und den Schlüssel gemerkt hat, kann abgleichen; die Einrichtung fragt deshalb nach geteilten Geräten und merkt den Schlüssel dann nicht. (4) Das WebDAV-App-Passwort liegt auf dem Gerät (verschlüsselt, wenn die Verschlüsselung an und der Schlüssel gemerkt ist, sonst im Klartext); es ist im Nextcloud-Konto jederzeit widerrufbar.
- **Datenschutz:** Kein Lernraum-Server sieht die Datei. Die Datenschutzerklärung nennt den optionalen Abgleich, die Verantwortung der Lehrkraft und die Wege.
- **Neubewertung:** nach dem Pilot, bei Einführung mehrerer Lehrkräfte je Datei oder eines Push-Signals über einen Lernraum-Dienst.
