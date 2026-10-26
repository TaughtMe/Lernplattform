# Version 0.9.3

Stand: 26.10.2026. Grundlage ist Version 0.9.2 (`4e37ff6`) auf
`codex/lernraum-0.9.2-ui-v2`. Umgesetzt sind die kleinen Sofortkorrekturen B1
bis B8 aus dem Gesamtaudit vom 19.10.2026.

## Änderungen

- Die Startseite verlinkt den „Lehrerbereich“ statt „Lehrer-Login“
  (Entscheidung 43, B-009).
- Die Datenschutzerklärung nennt keine ChatGPT-Anmeldung mehr; `chatgpt-auth.ts`
  und die zugehörigen Service-Worker-Ausnahmen entfallen. Neu beschrieben sind
  die Übergabe von Vokabelpaketen über Supabase und die Sprachausgabe (B-011).
- Der QR-Bogen druckt alle Codes über mehrere Seiten; Leiste und Kopfzeile des
  Lehrerrahmens entfallen im Druck. Ein Browsertest zählt die Namen im PDF
  (C-006).
- Der Einschreibe-QR ist mit und ohne Schreiberleichterung gleich groß und gleich
  dicht (B-008).
- Inhalte: s/ss/ß-Regeltext mit „Verlängern“, keine Wörter auf -ng in der
  Auslautverhärtung, Dehnungs-h ohne silbentrennendes h, Bedeutungshilfen ohne
  Zielwort. Kriegs-, Gewalt- und Todeswörter sind aus den Grundschul-Wortboxen
  ersetzt (D-006, E-005).
- „Laufdiktat allein“ schaltet Autokorrektur, automatische Großschreibung und
  Rechtschreibprüfung ab (G-013).
- Live-Raum: Beim Beenden entsteht keine CSV mehr ungefragt; die Ergebnisse
  bleiben stehen, bis die Lehrkraft „Ergebnisse als CSV herunterladen“ wählt.
  Zellen, die ein Tabellenprogramm als Formel liest, werden entschärft (F-002,
  B-007).
- Die Lehrer-Liveansicht zeigt je Tier aufklappbar die Fehlerwörter mit Anzahl
  (E-003, erster Schritt).

## Offen

- Serverstandort und Auftragsverarbeitungsvertrag von Supabase sind in der
  Datenschutzerklärung als Nachtrag angekündigt.
- Neben dem Einzel-QR steht weiterhin der Hinweis auf die Schreiberleichterung.
- Die Textbox-Texte TXT-011, TXT-024, TXT-034 und TXT-046 führen noch Wörter mit
  silbentrennendem h als Dehnungs-h-Zielwörter; sie müssen neu geschrieben werden.

Für die produktive Freigabe gelten die Voraussetzungen aus
[Version 0.9.2](version-0.9.2.md) unverändert.
