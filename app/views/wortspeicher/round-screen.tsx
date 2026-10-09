"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { LearningWordStage } from "../../../src/domain/learning-word";
import type { WordRoundFeedback } from "../../../src/domain/word-round";
import { Icon } from "../../ui/icons";
import { Button, IconButton, ProgressBar } from "../../ui/primitives";
import { CoverAnswer } from "./cover-answer";
import { FeedbackPanel } from "./feedback-panel";
import { strictInputProps } from "./input-guards";
import { MemoryBlock } from "./memory-block";
import { StagePrompt } from "./stage-prompt";
import { STAGE_COPY } from "./stage-copy";
import styles from "./wortspeicher.module.css";

/**
 * Eine Runde: Kopfzeile mit Fortschritt und je nach Stufe Merken, Schreiben
 * und Rückmeldung (Plan 3.14). Reine Darstellung, alle Abläufe über Rückrufe.
 */
export function RoundScreen({
  title,
  stage,
  index,
  total,
  phase,
  block,
  usedHelp,
  feedback,
  listen,
  onBack,
  onFinishMemorize,
  onHelp,
  onSubmit,
  onRetry,
}: {
  title: string;
  stage: LearningWordStage;
  /** Nullbasiert: aktueller Block. */
  index: number;
  total: number;
  phase: "memorize" | "recall" | "feedback";
  block: readonly string[];
  usedHelp: boolean;
  feedback?: WordRoundFeedback | undefined;
  /** Stufe 6: Anhören, Zustand und Bedeutungshilfe (kommt vom Container). */
  listen?: ReactNode;
  onBack: () => void;
  onFinishMemorize: () => void;
  onHelp: () => void;
  onSubmit: (answer: string) => void;
  onRetry: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const memorizeAction = useRef<HTMLButtonElement>(null);
  const word = block[0] ?? "";
  const isBlock = stage === 5;

  useEffect(() => {
    if (phase === "memorize") memorizeAction.current?.focus();
  }, [phase, index]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!answer.trim()) return;
    onSubmit(answer);
  }

  const succeeded = phase === "feedback" && feedback?.correct === true;

  return (
    <section className={styles.screen} aria-live="polite">
      <header className={styles.head}>
        <div className={styles.headMain}>
          <IconButton label="Übung beenden" square onClick={onBack}>
            <Icon name="back" size={18} />
          </IconButton>
          <div>
            <p className="ui-h-section">{title}</p>
            <span className="ui-small ui-muted">
              Merkstufe {stage} · {STAGE_COPY[stage].title} ·{" "}
              {isBlock ? "Block" : "Wort"}{" "}
              <strong>
                {index + 1} / {total}
              </strong>
            </span>
          </div>
        </div>
      </header>
      <ProgressBar
        value={index + 1}
        max={total}
        label="Fortschritt der Runde"
      />

      <article className={styles.card}>
        {phase === "memorize" ? (
          <>
            <p className="ui-eyebrow">Ansehen und merken</p>
            <div className={styles.memory}>
              {block.map((entry) => (
                <strong key={entry}>{entry}</strong>
              ))}
            </div>
            <p className="ui-small ui-muted">
              {isBlock
                ? "Merke dir alle Wörter. Beim Eingeben ist die Reihenfolge egal."
                : "Präge dir das Wort ein. Danach bleibt nur seine Länge sichtbar."}
            </p>
            <div className={styles.actions}>
              <button
                ref={memorizeAction}
                type="button"
                className="ui-btn ui-btn--primary ui-btn--lg"
                onClick={onFinishMemorize}
              >
                Wörter verdecken
              </button>
            </div>
          </>
        ) : null}

        {phase === "recall" ? (
          <form className="ui-stack" onSubmit={submit}>
            <p className="ui-eyebrow">Selbstständig schreiben</p>
            {stage <= 3 ? (
              <StagePrompt word={word} stage={stage as 1 | 2 | 3} />
            ) : null}
            {isBlock ? (
              <p className="ui-small ui-muted">
                {block.length === 1
                  ? "1 Wort aus dem Merkblock"
                  : `${block.length} Wörter aus dem Merkblock`}
              </p>
            ) : null}
            {stage === 6 ? listen : null}
            {usedHelp ? (
              <div className="ui-notice" role="status">
                <span className={styles.helpWord}>{block.join(" · ")}</span>
              </div>
            ) : null}
            {stage === 4 ? (
              <CoverAnswer word={word} value={answer} onChange={setAnswer} />
            ) : isBlock ? (
              <MemoryBlock
                count={block.length}
                value={answer}
                onChange={setAnswer}
              />
            ) : (
              <div className="ui-stack" style={{ ["--gap" as string]: "6px" }}>
                <label htmlFor="wort-antwort" className="ui-small ui-muted">
                  Deine Lösung
                </label>
                <WordInput value={answer} onChange={setAnswer} />
              </div>
            )}
            <div className="ui-grid2">
              {stage === 1 ? (
                <span />
              ) : (
                <Button variant="ghost" onClick={onHelp} disabled={usedHelp}>
                  Wort zeigen
                </Button>
              )}
              <Button type="submit" disabled={!answer.trim()}>
                Prüfen
              </Button>
            </div>
          </form>
        ) : null}

        {phase === "feedback" && feedback && !succeeded ? (
          <FeedbackPanel
            feedback={feedback}
            homophoneHints={stage === 6}
            retryHint={
              stage === 4 || isBlock
                ? "Du siehst die Wörter noch einmal, danach schreibst du sie neu."
                : "Schau noch einmal genau hin und schreibe das Wort neu."
            }
            onRetry={onRetry}
          />
        ) : null}

        {succeeded ? (
          <div className={styles.success} role="status">
            <Icon name="check" size={22} />
            <strong>Richtig</strong>
          </div>
        ) : null}
      </article>
    </section>
  );
}

function WordInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  return (
    <input
      id="wort-antwort"
      ref={input}
      className="ui-field ui-center"
      placeholder="Wort schreiben"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...strictInputProps}
    />
  );
}
