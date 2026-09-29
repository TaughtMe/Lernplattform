"use client";

import { Icon } from "../../ui/icons";
import { Button } from "../../ui/primitives";
import type {
  TeacherLiveModel,
  TeacherLiveRefs,
} from "./use-teacher-live-room";

const BASE_PUNCTUATION = [".", ",", "!", "?"];

/** Text in Abschnitte teilen (Design 5c/5d): Eingabe links, Schülersicht rechts. */
export function TextBuilder({
  t,
  sourceRef,
  markerContainerRef,
}: {
  t: TeacherLiveModel;
} & Pick<TeacherLiveRefs, "sourceRef" | "markerContainerRef">) {
  const { splitConfig } = t;
  const punctuation = [
    ...BASE_PUNCTUATION,
    ...splitConfig.punctuation.filter((c) => !BASE_PUNCTUATION.includes(c)),
  ];

  return (
    <div className="ui-live__columns">
      <div className="ui-stack">
        {t.markerMode ? (
          <MarkerEditor t={t} markerContainerRef={markerContainerRef} />
        ) : (
          <SourceField t={t} sourceRef={sourceRef} />
        )}

        <section className="ui-stack ui-live__rules" aria-label="Trennregeln">
          <div className="ui-row ui-wrap">
            <span className="ui-label">Teilen nach</span>
            <button
              type="button"
              className="ui-chip"
              aria-pressed={splitConfig.punctuationEnabled}
              onClick={() =>
                t.setSplitConfig({
                  ...splitConfig,
                  punctuationEnabled: !splitConfig.punctuationEnabled,
                })
              }
            >
              Satzzeichen
            </button>
            <button
              type="button"
              className="ui-chip"
              aria-pressed={splitConfig.newlineEnabled}
              onClick={() =>
                t.setSplitConfig({
                  ...splitConfig,
                  newlineEnabled: !splitConfig.newlineEnabled,
                })
              }
            >
              Zeile
            </button>
            <button
              type="button"
              className="ui-chip"
              aria-pressed={t.markerMode}
              disabled={!t.source.trim()}
              onClick={t.toggleMarkerMode}
            >
              Marker
            </button>
            <label className="ui-btn ui-btn--ghost ui-btn--sm ui-file ui-live__import">
              <Icon name="upload" size={16} />
              Datei importieren
              <input
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                onChange={(event) => t.importFile(event.target.files?.[0])}
              />
            </label>
          </div>

          {splitConfig.punctuationEnabled ? (
            <div
              className="ui-row ui-wrap"
              aria-label="Trennzeichen"
              role="group"
            >
              {punctuation.map((character) => (
                <button
                  type="button"
                  key={character}
                  className="ui-chip ui-live__char"
                  aria-pressed={splitConfig.punctuation.includes(character)}
                  onClick={() => t.togglePunctuation(character)}
                >
                  {character}
                </button>
              ))}
              <form
                className="ui-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  t.addCustomDelimiter();
                }}
              >
                <input
                  className="ui-input ui-live__delimiter"
                  aria-label="Eigener Trenner"
                  placeholder="Eigener Trenner"
                  value={t.customDelimiter}
                  maxLength={20}
                  onChange={(event) => t.setCustomDelimiter(event.target.value)}
                />
                <Button
                  type="submit"
                  variant="soft"
                  size="sm"
                  disabled={!t.customDelimiter}
                >
                  Hinzufügen
                </Button>
              </form>
              {splitConfig.customDelimiters.map((delimiter) => (
                <button
                  key={delimiter.id}
                  type="button"
                  className="ui-chip"
                  aria-label={`Trenner ${delimiter.value} entfernen`}
                  onClick={() => t.removeCustomDelimiter(delimiter.id)}
                >
                  {delimiter.value} <Icon name="close" size={14} />
                </button>
              ))}
            </div>
          ) : null}

          {splitConfig.newlineEnabled ? (
            <div className="ui-row ui-wrap">
              <span className="ui-small ui-muted">Zeilen trennen bei</span>
              <div
                className="ui-seg"
                role="group"
                aria-label="Zeilen trennen bei"
              >
                {(
                  [
                    ["line", "jeder Zeile"],
                    ["paragraph", "nur Leerzeilen"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={splitConfig.newlineMode === mode}
                    onClick={() =>
                      t.setSplitConfig({ ...splitConfig, newlineMode: mode })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {t.source && !t.markerMode ? (
            <div className="ui-row ui-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={t.markSelectionAsSection}
              >
                Markierung als Abschnitt
              </Button>
              <Button variant="ghost" size="sm" onClick={t.splitAtCursor}>
                Hier trennen
              </Button>
              <Button
                variant="link"
                disabled={!t.manualRanges.length}
                onClick={t.clearManualRanges}
              >
                Manuelle Marken entfernen
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      <SectionList t={t} />
    </div>
  );
}

function SourceField({
  t,
  sourceRef,
}: {
  t: TeacherLiveModel;
} & Pick<TeacherLiveRefs, "sourceRef">) {
  return (
    <label className="ui-stack ui-live__source">
      <span className="ui-label">Text – Sätze werden automatisch getrennt</span>
      <textarea
        ref={sourceRef}
        className="ui-textarea"
        value={t.source}
        disabled={!t.hydrated}
        placeholder="Text eingeben oder Datei importieren …"
        onChange={(event) =>
          t.setSources({ ...t.sources, text: event.target.value })
        }
      />
    </label>
  );
}

/** Abschnitte per Antippen zweier Wörter oder per Maus-Markierung festlegen. */
function MarkerEditor({
  t,
  markerContainerRef,
}: {
  t: TeacherLiveModel;
} & Pick<TeacherLiveRefs, "markerContainerRef">) {
  return (
    <div className="ui-stack">
      <p className="ui-notice">
        Text markieren oder zwei Wörter antippen (Anfang und Ende), um einen
        Bereich zu einem Abschnitt zusammenzufassen. Einen manuellen Abschnitt
        antippen löst ihn wieder.
      </p>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- onMouseUp reagiert nur auf eine native Textauswahl; jedes Wort ist ein eigener Knopf. */}
      <div
        ref={markerContainerRef}
        className="ui-live__marker"
        onMouseUp={t.handleMarkerMouseUp}
      >
        {t.markerPieces.map((piece, index) => {
          const words = t
            .tokenizeMarkerText(piece.text, piece.start)
            .map((token, tokenIndex) =>
              token.isWord ? (
                <span
                  key={tokenIndex}
                  role="button"
                  tabIndex={0}
                  className={`ui-live__marker-word${
                    t.markerAnchor?.start === token.start &&
                    t.markerAnchor.end === token.end
                      ? " is-anchored"
                      : ""
                  }`}
                  onClick={() => t.handleMarkerWordTap(token)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      t.handleMarkerWordTap(token);
                    }
                  }}
                >
                  {token.text}
                </span>
              ) : (
                <span key={tokenIndex}>{token.text}</span>
              ),
            );
          if (piece.kind === "manual") {
            const range = {
              start: piece.start,
              end: piece.start + piece.text.length,
            };
            return (
              <span
                key={index}
                role="button"
                tabIndex={0}
                title="Antippen, um die manuelle Markierung zu entfernen"
                className="ui-live__marker-piece is-manual"
                onClick={() => t.removeManualSection(range)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    t.removeManualSection(range);
                  }
                }}
              >
                {piece.text}
              </span>
            );
          }
          if (piece.kind === "auto") {
            return (
              <span
                key={index}
                className={`ui-live__marker-piece ${
                  piece.autoIndex % 2 === 0 ? "is-even" : "is-odd"
                }`}
              >
                {words}
              </span>
            );
          }
          return <span key={index}>{words}</span>;
        })}
      </div>
    </div>
  );
}

/** Schülersicht: Abschnitte ein- und ausschließen, umsortieren. */
function SectionList({ t }: { t: TeacherLiveModel }) {
  const sections = t.displayedTextSections;
  return (
    <section className="ui-stack" aria-labelledby="section-list-title">
      <div className="ui-between">
        <h2 id="section-list-title" className="ui-label">
          <span>{t.words.length} Abschnitte</span> · so sehen es die Schüler
        </h2>
      </div>
      {sections.length ? (
        <ol className="ui-list ui-live__sections" aria-label="Abschnittsliste">
          {sections.map((section, index) => {
            const included = !t.excludedSectionIds.includes(section.id);
            return (
              <li key={section.id} className={included ? "" : "is-excluded"}>
                <label className="ui-live__section-text">
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() => t.toggleSectionExcluded(section.id)}
                  />
                  <span className="ui-live__section-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{section.text}</span>
                </label>
                <span className="ui-row" style={{ ["--gap" as string]: "2px" }}>
                  <button
                    type="button"
                    className="ui-icon-btn ui-icon-btn--square ui-live__move"
                    aria-label={`Abschnitt ${index + 1} nach oben`}
                    disabled={index === 0}
                    onClick={() => t.moveSection(index, index - 1)}
                  >
                    <Icon name="up" size={16} />
                  </button>
                  <button
                    type="button"
                    className="ui-icon-btn ui-icon-btn--square ui-live__move"
                    aria-label={`Abschnitt ${index + 1} nach unten`}
                    disabled={index === sections.length - 1}
                    onClick={() => t.moveSection(index, index + 1)}
                  >
                    <Icon name="down" size={16} />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="ui-empty ui-small">
          Sobald Text eingegeben ist, erscheinen hier die Abschnitte.
        </p>
      )}
    </section>
  );
}
