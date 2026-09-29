"use client";

import { useState } from "react";
import type { VocabularyTransferChoice } from "../../../src/integrations/laufdiktat/live-session";
import { Icon } from "../../ui/icons";
import { Button, Card, Segmented, Toggle } from "../../ui/primitives";
import { Sheet } from "../../ui/sheet";
import type { TeacherLiveModel } from "./use-teacher-live-room";

const DIRECTIONS = [
  { value: "left-to-right", label: "Links → rechts" },
  { value: "right-to-left", label: "Rechts → links" },
  { value: "mixed", label: "Gemischt" },
] as const;

/** Vokabelheft: Paare links, Abfrage-Einstellungen rechts. */
export function VocabularyBuilder({ t }: { t: TeacherLiveModel }) {
  const [pasteOpen, setPasteOpen] = useState(false);
  return (
    <div className="ui-live__columns ui-live__columns--wide-left">
      <section className="ui-stack" aria-labelledby="vocabulary-title">
        <div className="ui-between ui-wrap">
          <div>
            <h2 id="vocabulary-title" className="ui-h-section">
              Vokabelheft
            </h2>
            <p className="ui-small ui-muted">
              Weitere richtige Antworten mit | trennen.
            </p>
          </div>
          <span className="ui-row ui-wrap">
            <span className="ui-pill">{t.vocabularyPairs.length} Vokabeln</span>
            <label className="ui-btn ui-btn--ghost ui-btn--sm ui-file">
              <Icon name="upload" size={16} />
              Datei importieren
              <input
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                onChange={(event) => t.importFile(event.target.files?.[0])}
              />
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPasteOpen(true)}
            >
              Tabelle einfügen
            </Button>
          </span>
        </div>

        <ol className="ui-list ui-live__vocab" aria-label="Vokabeln">
          {t.vocabularyPairs.map((pair, index) => (
            <li key={pair.id}>
              {(["left", "right"] as const).map((side) => (
                <span
                  key={side}
                  className="ui-stack"
                  style={{ ["--gap" as string]: "4px" }}
                >
                  <input
                    className="ui-input"
                    aria-label={
                      side === "left"
                        ? `Vokabel ${index + 1}`
                        : `Übersetzung ${index + 1}`
                    }
                    placeholder={
                      side === "left" ? `Vokabel ${index + 1}` : "Übersetzung"
                    }
                    value={pair[side].primary}
                    onChange={(event) =>
                      t.updateVocabularyPair(pair.id, side, {
                        primary: event.target.value,
                      })
                    }
                  />
                  <input
                    className="ui-input ui-live__alt"
                    aria-label={`Weitere Antworten ${side === "left" ? "Vokabel" : "Übersetzung"} ${index + 1}`}
                    placeholder="Weitere Antworten: … | …"
                    defaultValue={pair[side].alternatives.join(" | ")}
                    onBlur={(event) =>
                      t.updateVocabularyPair(pair.id, side, {
                        alternatives: event.target.value
                          .split("|")
                          .map((part) => part.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </span>
              ))}
              <button
                type="button"
                className="ui-icon-btn"
                aria-label={`Vokabel ${index + 1} löschen`}
                onClick={() => t.removeVocabularyPair(pair.id)}
              >
                <Icon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ol>
        <Button variant="ghost" size="sm" onClick={t.addVocabularyPair}>
          + Vokabel hinzufügen
        </Button>
      </section>

      <Card
        look="soft"
        className="ui-stack"
        aria-labelledby="vocabulary-settings-title"
      >
        <h2 id="vocabulary-settings-title" className="ui-h-section">
          Abfrage
        </h2>
        <span className="ui-label">
          <Icon name="swap" size={16} /> Richtung
        </span>
        <Segmented
          label="Abfragerichtung"
          value={t.direction}
          options={DIRECTIONS}
          onChange={t.setDirection}
        />
        <Toggle
          label="Groß-/Kleinschreibung prüfen"
          checked={t.vocabularyCaseSensitive}
          onChange={t.setVocabularyCaseSensitive}
        />
        <Toggle
          label="Vokabeln übernehmen"
          hint="Nach der Runde in die persönliche LernBox"
          checked={t.vocabularyTransfer !== "none"}
          onChange={(on) => t.setVocabularyTransfer(on ? "errors" : "none")}
        />
        {t.vocabularyTransfer !== "none" ? (
          <label
            className="ui-stack ui-label"
            style={{ ["--gap" as string]: "4px" }}
          >
            Welche Vokabeln übernehmen?
            <select
              className="ui-input"
              value={t.vocabularyTransfer}
              onChange={(event) =>
                t.setVocabularyTransfer(
                  event.target.value as VocabularyTransferChoice,
                )
              }
            >
              <option value="errors">Nur fehlerhafte Vokabeln</option>
              <option value="all">Alle Vokabeln</option>
            </select>
          </label>
        ) : null}
      </Card>

      <Sheet
        open={pasteOpen}
        title="Tabelle einfügen"
        onClose={() => setPasteOpen(false)}
      >
        <p className="ui-small ui-muted">
          Zwei Spalten aus Excel oder Sheets kopieren oder Semikolon verwenden.
          Alternativen mit | trennen. Die Liste ersetzt die bisherigen Vokabeln.
        </p>
        <textarea
          className="ui-textarea"
          aria-label="Tabelle"
          value={t.vocabularyTableInput}
          onChange={(event) => t.setVocabularyTableInput(event.target.value)}
          placeholder={"Haus\thome | house\nBaum\ttree"}
        />
        <Button
          disabled={!t.vocabularyTableInput.trim()}
          onClick={() => {
            t.importVocabularyTable();
            setPasteOpen(false);
          }}
        >
          Liste übernehmen
        </Button>
      </Sheet>
    </div>
  );
}
