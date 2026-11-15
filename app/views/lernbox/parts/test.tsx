"use client";

import { useEffect, useRef, useState } from "react";
import {
  gradeLearningBoxTestAnswer,
  summarizeLearningBoxTest,
  type TestAnswer,
} from "../../../../src/domain/learning-box-forms";
import { cx } from "../../parts/parts";
import { FormHead, FormProgress } from "./form-head";
import type { LbTest, LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

/**
 * Test: kurze Übungsprüfung aus Schreib- und Auswahlfragen. Zwischen den
 * Fragen gibt es keine Rückmeldung; das Ergebnis steht am Ende. Welche
 * Antworten für die Boxen zählen, entscheidet die Anbindung über
 * `onTestAnswer` (LF-3 bis LF-6). Der Elternteil setzt `key={test.testKey}`.
 */
export function Test(props: LernBoxScreenProps & { test: LbTest }) {
  const { test } = props;
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [choice, setChoice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, TestAnswer>>({});
  const field = useRef<HTMLInputElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  /** Schützt vor doppeltem Absenden (Enter plus Klick): jede Frage zählt einmal. */
  const submitted = useRef(new Set<string>());
  const onFinished = useRef(props.onFormFinished);
  useEffect(() => {
    onFinished.current = props.onFormFinished;
  });

  const question = test.questions[index];
  const finished = question === undefined;

  useEffect(() => {
    if (finished) {
      resultHeading.current?.focus();
      onFinished.current?.();
    } else if (question.kind === "written") field.current?.focus();
    else questionHeading.current?.focus();
  }, [finished, question]);

  function submit(given: string) {
    if (!question || submitted.current.has(question.id)) return;
    submitted.current.add(question.id);
    const correct = gradeLearningBoxTestAnswer(question, given);
    props.onTestAnswer?.(question, correct);
    setAnswers((current) => ({
      ...current,
      [question.id]: { given, correct },
    }));
    setInput("");
    setChoice(null);
    setIndex((current) => current + 1);
  }

  const summary = summarizeLearningBoxTest(test.questions, answers);
  const hasInput =
    question?.kind === "choice" ? choice !== null : !!input.trim();
  const subtitle = finished
    ? "Test abgeschlossen"
    : `Test · Frage ${index + 1} von ${test.questions.length}`;
  const status = finished
    ? `${summary.correct} von ${summary.total} richtig`
    : "";

  return (
    <div className={styles.study}>
      <FormHead {...props} title={test.title} subtitle={subtitle} />
      <FormProgress
        value={test.questions.length ? index / test.questions.length : 1}
      />
      <div
        className={
          finished ? cx(styles.result, styles.formResult) : styles.formBody
        }
      >
        {question ? (
          <form
            key={question.id}
            className={styles.testForm}
            onSubmit={(event) => {
              event.preventDefault();
              if (hasInput)
                submit(question.kind === "choice" ? (choice ?? "") : input);
            }}
          >
            <article className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.eyebrow}>
                  {question.kind === "written"
                    ? "Schreibfrage"
                    : "Auswahlfrage"}
                </span>
              </div>
              <h2
                ref={questionHeading}
                tabIndex={-1}
                className={styles.question}
              >
                {question.prompt}
              </h2>
            </article>
            {question.kind === "written" ? (
              <input
                ref={field}
                className={styles.answer}
                aria-label="Deine Antwort"
                placeholder="Antwort tippen"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
            ) : (
              <fieldset className={styles.choiceList}>
                <legend className={styles.fieldLabel}>
                  Wähle die passende Antwort
                </legend>
                {question.options.map((option) => (
                  <label
                    key={option}
                    className={cx(
                      styles.choice,
                      choice === option && styles.choiceOn,
                    )}
                  >
                    <input
                      type="radio"
                      className={styles.choiceInput}
                      name="lb-test-choice"
                      value={option}
                      checked={choice === option}
                      onChange={() => setChoice(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </fieldset>
            )}
            <div className={styles.testActions}>
              <button
                type="submit"
                className={styles.check}
                disabled={!hasInput}
              >
                Weiter
              </button>
              <button
                type="button"
                className={styles.testSkip}
                onClick={() => submit("")}
              >
                Weiß ich nicht
              </button>
            </div>
          </form>
        ) : (
          <h2 ref={resultHeading} tabIndex={-1} className={styles.doneTitle}>
            Test geschafft
          </h2>
        )}
        <p className={styles.matchStatus} role="status">
          {status}
        </p>
        {finished ? (
          <>
            <p className={styles.resultNext}>
              {test.counted === null
                ? ""
                : test.counted > 0
                  ? `${
                      test.counted === 1
                        ? "1 geschriebene Antwort hat"
                        : `${test.counted} geschriebene Antworten haben`
                    } für deine Boxen gezählt.`
                  : "Für deine Boxen hat nichts gezählt. Das war nur Üben."}
            </p>
            {summary.missed.length === 0 ? (
              <p className={styles.resultNext}>Alles richtig</p>
            ) : (
              <section className={styles.missed} aria-labelledby="lb-missed">
                <h3 id="lb-missed" className={styles.missedTitle}>
                  Das üben wir noch
                </h3>
                <ul className={styles.missedList}>
                  {summary.missed.map(({ question: missed, given }) => (
                    <li key={missed.id} className={styles.missedItem}>
                      <span className={styles.resultPrompt}>
                        {missed.prompt}
                      </span>
                      <span className={styles.missedAnswer}>
                        {missed.expectedLabel}
                      </span>
                      <span className={styles.resultGiven}>
                        {given ? (
                          <>
                            Du: <s>{given}</s>
                          </>
                        ) : (
                          "Du: keine Antwort"
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <div className={styles.testActions}>
              {summary.missed.length > 0 ? (
                <button
                  type="button"
                  className={styles.cta}
                  onClick={() =>
                    props.onPracticeMissed?.(
                      summary.missed.map(({ question: missed }) => ({
                        cardId: missed.cardId,
                        direction: missed.direction,
                      })),
                    )
                  }
                >
                  Diese Karten jetzt üben
                </button>
              ) : null}
              <button
                type="button"
                className={styles.cta}
                onClick={props.onEndSession}
              >
                Zur LernBox
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
