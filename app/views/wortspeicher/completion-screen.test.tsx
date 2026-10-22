import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WordRoundWordResult } from "../../../src/domain/word-round";
import { CompletionScreen } from "./completion-screen";

function result(word: string, firstTry: boolean): WordRoundWordResult {
  return {
    word,
    firstTry,
    attempts: firstTry ? 1 : 2,
    usedHelp: false,
    firstResult: firstTry ? "richtig" : "falsch",
  };
}

function setup(options: Partial<Parameters<typeof CompletionScreen>[0]> = {}) {
  render(
    <CompletionScreen
      title="Doppelkonsonanten"
      stage={1}
      percent={67}
      results={[
        result("Sonne", true),
        result("Mond", true),
        result("Stern", false),
      ]}
      boxWordCount={3}
      practicedToday={3}
      mode="free"
      percentless={false}
      onAgain={() => undefined}
      onOtherStage={() => undefined}
      onHistory={() => undefined}
      {...options}
    />,
  );
}

describe("CompletionScreen", () => {
  it("nennt das Ergebnis dieser Runde ehrlich und zeigt keinen Rekord", () => {
    setup();
    expect(screen.getByText("67 %")).toBeInTheDocument();
    expect(
      screen.getByText("2 von 3 Wörtern dieser Runde auf Anhieb richtig"),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("Bestwert");
    expect(
      screen.queryByText(/Runde aus \d+ von \d+ Wörtern der Wortbox/),
    ).not.toBeInTheDocument();
  });

  it("benennt eine Stichprobe", () => {
    setup({ boxWordCount: 34 });
    expect(
      screen.getByText("Runde aus 3 von 34 Wörtern der Wortbox"),
    ).toBeInTheDocument();
  });

  it("zeigt unter dem Rundenergebnis den Box-Fortschritt der Wortbox", () => {
    setup({ coverage: { mastered: 20, total: 100, percent: 20 }, stage: 3 });
    expect(screen.getByText("67 %")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Wortbox: 20 von 100 Wörtern auf Stufe 3 auf Anhieb richtig (20 %)",
      ),
    ).toBeInTheDocument();
  });

  it("benennt eine Wortbox mit einem Wort im Singular", () => {
    setup({ coverage: { mastered: 1, total: 1, percent: 100 } });
    expect(
      screen.getByText(
        "Wortbox: 1 von 1 Wort auf Stufe 1 auf Anhieb richtig (100 %)",
      ),
    ).toBeInTheDocument();
  });

  it("zeigt ohne Box-Fortschritt keine Zeile zur Wortbox", () => {
    setup();
    expect(document.body).not.toHaveTextContent("Wortbox:");
  });

  it("zeigt die Übungsmenge des Tages", () => {
    setup({ practicedToday: 40 });
    expect(screen.getByText("Heute 40 Wörter geübt")).toBeInTheDocument();
  });

  it("zeigt bei den Fehlerwörtern „n Wörter geübt“ statt eines Prozentwerts", () => {
    setup({ percentless: true });
    expect(screen.getByText("3 Wörter geübt")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("%");
  });

  it("erklärt den Lernstand je nach Art der Runde", () => {
    setup({ mode: "free" });
    expect(
      screen.getByText(
        /Freies Üben verändert den Abstand der Wiederholung nicht/,
      ),
    ).toBeInTheDocument();
  });

  it("erklärt den Lernstand der fälligen Wiederholung", () => {
    setup({ mode: "due" });
    expect(
      screen.getByText(
        /bei Fehlern oder mit Hilfe sind sie morgen wieder dran/,
      ),
    ).toBeInTheDocument();
  });
});
