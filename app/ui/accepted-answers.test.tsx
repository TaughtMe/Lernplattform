import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AcceptedAnswers, acceptedAlsoOf } from "./accepted-answers";

describe("AcceptedAnswers", () => {
  it("rendert nichts bei nur einer Antwort", () => {
    const { container } = render(<AcceptedAnswers text="tree" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("rendert nichts bei leerem Text", () => {
    const { container } = render(<AcceptedAnswers text="  " />);
    expect(container).toBeEmptyDOMElement();
  });

  it("zeigt bei „(to) go“ die Fassungen ohne den ganzen Text", () => {
    render(<AcceptedAnswers text="(to) go" />);
    expect(screen.getByText("Gilt auch: to go · go")).toBeInTheDocument();
    expect(screen.queryByText(/\(to\) go/)).not.toBeInTheDocument();
  });

  it("zeigt Teile an | und /", () => {
    render(<AcceptedAnswers text="groß | riesig" />);
    expect(screen.getByText("Gilt auch: groß · riesig")).toBeInTheDocument();
    expect(acceptedAlsoOf("home / house")).toEqual(["home", "house"]);
  });

  it("blendet die Hauptantwort aus, wenn der Text zusammengesetzt ist", () => {
    expect(acceptedAlsoOf("big | huge", "big")).toEqual(["huge"]);
    expect(acceptedAlsoOf("big", "big")).toEqual([]);
  });

  it("ist normaler Text ohne Live-Bereich", () => {
    render(<AcceptedAnswers text="a | b" />);
    expect(screen.getByText(/Gilt auch/)).not.toHaveAttribute("aria-live");
  });
});
