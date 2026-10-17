"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Icon } from "../../../ui/icons";
import { cx, ThemeSwitch } from "../../parts/parts";
import type { LbFeedback, LbStudy, LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

export function Study(props: LernBoxScreenProps & { study: LbStudy }) {
  const { study } = props;
  const input = useRef<HTMLInputElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (study.feedback) nextButton.current?.focus();
    else if (study.mode === "writing") input.current?.focus();
  }, [study.feedback, study.mode, study.question]);

  const head = (
    <header className={styles.studyHead}>
      <button
        type="button"
        className={styles.backSquare}
        aria-label="Runde beenden"
        title="Runde beenden"
        onClick={props.onEndSession}
      >
        <Icon name="back" size={20} strokeWidth={2.2} />
      </button>
      <span className={styles.studyTitles}>
        <h1 className={styles.studyTitle}>{study.title}</h1>
        <span className={styles.sheetSubtitle}>
          {study.done ? (
            "Runde abgeschlossen"
          ) : (
            <>
              {study.remaining} übrig ·{" "}
              <span className={styles.wideOnly}>
                {study.feedback ? study.directionLabel : study.modeLabel}
              </span>
              <span className={styles.narrowOnly}>{study.directionLabel}</span>
            </>
          )}
        </span>
      </span>
      <ThemeSwitch theme={props.theme} onToggle={props.onToggleTheme} />
    </header>
  );

  if (study.done) {
    return (
      <div className={styles.study}>
        {head}
        <div className={styles.resultWrap}>
          <div className={styles.result}>
            <p className={styles.eyebrow}>Runde abgeschlossen</p>
            <h2 className={styles.doneTitle}>Gut gearbeitet</h2>
            <p className={styles.resultNext}>
              {study.done.correct} gewusst · {study.done.wrong} noch zu üben
            </p>
            <button
              type="button"
              className={styles.cta}
              onClick={props.onEndSession}
            >
              Zur LernBox
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.study}>
      {head}
      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Fortschritt der Runde"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(study.progress * 100)}
      >
        <span style={{ width: `${Math.round(study.progress * 100)}%` }} />
      </div>

      {study.feedback ? (
        <Feedback
          feedback={study.feedback}
          canSpeak={study.canSpeak}
          nextRef={nextButton}
          onNext={props.onNext}
          onSpeak={props.onSpeak}
        />
      ) : (
        <div className={styles.studyBody}>
          <article className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.eyebrow}>{study.eyebrow}</span>
              <span className={styles.cardTools}>
                {study.canSpeak ? (
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label="Vorlesen"
                    title="Vorlesen"
                    onClick={() => props.onSpeak?.("question")}
                  >
                    <Icon name="speaker" size={18} />
                  </button>
                ) : null}
                <span className={styles.boxPill}>Box {study.box}</span>
              </span>
            </div>
            <h2 className={styles.question}>{study.question}</h2>
            {study.mode === "oral" && study.revealed ? (
              <p className={styles.revealed}>
                {study.revealedAnswer}
                {study.canSpeak ? (
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label="Lösung vorlesen"
                    onClick={() => props.onSpeak?.("answer")}
                  >
                    <Icon name="speaker" size={16} />
                  </button>
                ) : null}
              </p>
            ) : null}
          </article>

          {study.mode === "writing" ? (
            <form
              className={styles.answerRow}
              onSubmit={(event) => {
                event.preventDefault();
                props.onCheck?.();
              }}
            >
              <input
                ref={input}
                className={styles.answer}
                aria-label="Deine Antwort"
                placeholder="Antwort tippen"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={study.answer}
                onChange={(event) => props.onAnswer?.(event.target.value)}
              />
              <button
                type="submit"
                className={styles.check}
                disabled={!study.answer.trim()}
              >
                Prüfen{" "}
                <span className={styles.enterKey} aria-hidden="true">
                  ↵
                </span>
              </button>
            </form>
          ) : study.revealed ? (
            <div className={styles.oral}>
              <p className={styles.oralAnswer}>Wusstest du es?</p>
              <div className={styles.oralButtons}>
                <button
                  type="button"
                  className={styles.badButton}
                  onClick={() => props.onAssess?.(false)}
                >
                  Nicht gewusst
                </button>
                <button
                  type="button"
                  className={styles.goodButton}
                  onClick={() => props.onAssess?.(true)}
                >
                  Gewusst
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={styles.cta}
              onClick={props.onReveal}
            >
              Antwort zeigen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Feedback({
  feedback,
  canSpeak,
  nextRef,
  onNext,
  onSpeak,
}: {
  feedback: LbFeedback;
  canSpeak: boolean;
  nextRef: RefObject<HTMLButtonElement | null>;
  onNext: (() => void) | undefined;
  onSpeak: ((side: "question" | "answer") => void) | undefined;
}) {
  const good = feedback.correct;
  return (
    <div className={styles.resultWrap}>
      <div
        className={cx(styles.result, !good && styles.resultBad)}
        role="status"
      >
        <span className={styles.resultIcon}>
          <Icon
            name={good ? "check" : "close"}
            size={good ? 38 : 34}
            strokeWidth={2.8}
          />
        </span>
        <h2 className={styles.resultTitle}>
          {good ? "Gewusst" : "Nicht gewusst"}
        </h2>
        <span className={styles.resultTexts}>
          <span className={styles.resultPrompt}>{feedback.prompt}</span>
          <span className={styles.resultAnswer}>
            {feedback.expected}
            {canSpeak ? (
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Lösung vorlesen"
                onClick={() => onSpeak?.("answer")}
              >
                <Icon name="speaker" size={18} />
              </button>
            ) : null}
          </span>
          {good ? null : (
            <span className={styles.resultGiven}>
              Du: <s>{feedback.given}</s>
            </span>
          )}
        </span>
        <span className={styles.resultNext}>
          {feedback.practice
            ? `Box ${feedback.boxFrom} bleibt · ${feedback.nextLabel}`
            : `Box ${feedback.boxFrom} → Box ${feedback.boxTo} · ${feedback.nextLabel}`}
        </span>
      </div>
      <button
        ref={nextRef}
        type="button"
        className={styles.next}
        onClick={onNext}
      >
        Weiter
        <span className={styles.enterKey} aria-hidden="true">
          ↵
        </span>
      </button>
    </div>
  );
}
