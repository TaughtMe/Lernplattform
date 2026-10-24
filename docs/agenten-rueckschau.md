# Agenten-Rückschau

Protokoll der Skill `/rueckschau` (`.claude/skills/rueckschau/SKILL.md`). Die
Datei wird nur von der Rückschau gelesen, nicht in jeder Sitzung, und kostet
deshalb keine laufenden Tokens.

Maßnahmen-Stufen: 1 automatische Prüfung, 2 Ursache beseitigen, 3 Regel in
`AGENTS.md`, 4 nur protokollieren.

| Datum      | Befund                                                                                                           | Häufigkeit                                    | Stufe | Maßnahme                                                                                                                    | Status                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 2026-10-24 | Eingecheckte `public/sw.js` und `public/version.json` veralten; Build-Kennung wird in eigenen Commits nachgeholt | 4 Nachhol-Commits in 300 Commits; Audit A-014 | 2     | Dateien nicht mehr einchecken (`.gitignore`); `npm run dev`/`build` und der Cloudflare-Build (`npm run build`) erzeugen sie | umgesetzt im Branch `claude/kind-einstein-15b4o8` |
