"use client";

import type { FormEvent, ReactNode } from "react";
import { Button, ButtonLink, Card, PageHeader } from "../../ui/primitives";

export type StartPointChoice = {
  id: "spelling" | "math";
  title: string;
  detail: string;
};

export type StartPointScreenProps =
  | {
      phase: "choose";
      choices: readonly StartPointChoice[];
      onChoose: (id: StartPointChoice["id"]) => void;
    }
  | {
      phase: "task";
      /** Nummer der Aufgabe, ab 1. Eine Gesamtzahl gibt es bewusst nicht. */
      number: number;
      instruction: string;
      /** Das Gezeigte: Lückenwort, Rechenaufgabe oder der Knopf zum Anhören. */
      prompt: ReactNode;
      value: string;
      speaking: boolean;
      /** Nur bei „Hören und schreiben“. */
      onListen?: (() => void) | undefined;
      busy: boolean;
      saveIssue?: string | undefined;
      onChange: (value: string) => void;
      onSubmit: () => void;
      onStop: () => void;
    }
  | {
      phase: "result";
      title: string;
      detail: string;
      startHref: string;
      startLabel: string;
      otherHref: string;
      onRepeat: () => void;
    };

/**
 * „Wir suchen deinen Startpunkt“ (D2-1): kein Test, keine Zahl, kein Etikett.
 * Die Ansicht zeigt nur, was sie bekommt; Aufgaben, Antworten und Speicher
 * liegen im Container.
 */
export function StartPointScreen(props: StartPointScreenProps) {
  if (props.phase === "choose") {
    return (
      <div className="ui-page">
        <PageHeader eyebrow="Zum Einstieg" title="Wir suchen deinen Startpunkt">
          Das ist kein Test und es gibt keine Note. Du machst ein paar Aufgaben,
          dann sagen wir dir, womit du gut anfangen kannst.
        </PageHeader>
        <div className="ui-stack">
          {props.choices.map((choice) => (
            <Card key={choice.id} className="ui-stack">
              <h2 className="ui-h-section">{choice.title}</h2>
              <p className="ui-small ui-muted">{choice.detail}</p>
              <div>
                <Button onClick={() => props.onChoose(choice.id)}>
                  Startpunkt suchen
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (props.phase === "task") {
    const submit = (event: FormEvent) => {
      event.preventDefault();
      if (!props.busy && props.value.trim() !== "") props.onSubmit();
    };
    return (
      <div className="ui-page">
        <PageHeader
          eyebrow={`Aufgabe ${props.number}`}
          title="Wir suchen deinen Startpunkt"
        />
        <Card look="pop" className="ui-stack">
          <form className="ui-stack" onSubmit={submit}>
            <label className="ui-label" htmlFor="startpunkt-antwort">
              {props.instruction}
            </label>
            <div className="ui-center">{props.prompt}</div>
            {props.onListen ? (
              <p className="ui-sr-only" role="status">
                {props.speaking ? "Das Wort wird gesprochen." : ""}
              </p>
            ) : null}
            <input
              id="startpunkt-antwort"
              className="ui-field"
              value={props.value}
              onChange={(event) => props.onChange(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={props.busy}
            />
            {props.saveIssue ? (
              <p className="ui-notice ui-notice--bad" role="status">
                {props.saveIssue}
              </p>
            ) : null}
            <div className="ui-row ui-wrap">
              <Button
                type="submit"
                disabled={props.busy || props.value.trim() === ""}
              >
                Weiter
              </Button>
              <Button variant="ghost" onClick={props.onStop}>
                Aufhören
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="ui-page">
      <PageHeader eyebrow="Dein Startvorschlag" title={props.title}>
        {props.detail}
      </PageHeader>
      <Card look="pop" className="ui-stack">
        <p className="ui-small ui-muted">
          Das ist nur ein Vorschlag. Du entscheidest, womit du anfängst. Was
          noch nicht geklappt hat, üben wir bald noch einmal.
        </p>
        <div className="ui-row ui-wrap">
          <ButtonLink href={props.startHref}>{props.startLabel}</ButtonLink>
          <Button variant="soft" onClick={props.onRepeat}>
            Noch einmal suchen
          </Button>
          <ButtonLink variant="ghost" href={props.otherHref}>
            Selbst wählen
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
