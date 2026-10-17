import { describe, expect, it } from "vitest";
import {
  forwardCommand,
  initialLiveFlow,
  jumpCommand,
  liveFlowReducer,
  type LiveFlowAction,
  type LiveFlowState,
  type Stage,
} from "./teacher-live-flow";

function at(stage: Stage, rest: Partial<LiveFlowState> = {}): LiveFlowState {
  return { ...initialLiveFlow, stage, ...rest };
}

function run(state: LiveFlowState, ...actions: LiveFlowAction[]) {
  return actions.reduce(liveFlowReducer, state);
}

const STAGES: Stage[] = ["content", "settings", "lobby", "live"];

describe("liveFlowReducer", () => {
  it("startet im Inhalt, ungeprüft, ohne laufende Anfrage", () => {
    expect(initialLiveFlow).toEqual({
      stage: "content",
      roomClosed: false,
      busy: false,
      startRequested: false,
      restoreChecked: false,
    });
  });

  describe("goBack", () => {
    it("geht von Live über Lobby und Einstellungen zum Inhalt", () => {
      expect(run(at("live"), { type: "goBack" }).stage).toBe("lobby");
      expect(run(at("lobby"), { type: "goBack" }).stage).toBe("settings");
      expect(run(at("settings"), { type: "goBack" }).stage).toBe("content");
    });

    it("bleibt im Inhalt stehen", () => {
      const state = at("content");
      expect(liveFlowReducer(state, { type: "goBack" })).toBe(state);
    });

    it("tut bei geschlossenem Raum nichts", () => {
      for (const stage of STAGES) {
        const state = at(stage, { roomClosed: true });
        expect(liveFlowReducer(state, { type: "goBack" })).toBe(state);
      }
    });
  });

  describe("goForward", () => {
    it("wechselt vom Inhalt zu den Einstellungen", () => {
      expect(run(at("content"), { type: "goForward" }).stage).toBe("settings");
    });

    it("lässt alle anderen Schritte stehen; sie öffnen, starten oder beenden über Befehle", () => {
      for (const stage of ["settings", "lobby", "live"] as const) {
        const state = at(stage);
        expect(liveFlowReducer(state, { type: "goForward" })).toBe(state);
      }
    });
  });

  describe("jumpToStage", () => {
    it("springt zu Inhalt und Einstellungen mit und ohne Raum", () => {
      for (const hasRoom of [false, true]) {
        expect(
          run(at("live"), { type: "jumpToStage", stage: "content", hasRoom })
            .stage,
        ).toBe("content");
        expect(
          run(at("content"), {
            type: "jumpToStage",
            stage: "settings",
            hasRoom,
          }).stage,
        ).toBe("settings");
      }
    });

    it("springt zu Lobby und Live nur mit Raum", () => {
      expect(
        run(at("settings"), {
          type: "jumpToStage",
          stage: "lobby",
          hasRoom: true,
        }).stage,
      ).toBe("lobby");
      expect(
        run(at("lobby"), { type: "jumpToStage", stage: "live", hasRoom: true })
          .stage,
      ).toBe("live");
    });

    it("lässt Lobby und Live ohne Raum unverändert", () => {
      for (const stage of ["lobby", "live"] as const) {
        const state = at("settings");
        expect(
          liveFlowReducer(state, {
            type: "jumpToStage",
            stage,
            hasRoom: false,
          }),
        ).toBe(state);
      }
    });

    it("lässt den Zustand beim Sprung zum selben Schritt unverändert", () => {
      const state = at("settings");
      expect(
        liveFlowReducer(state, {
          type: "jumpToStage",
          stage: "settings",
          hasRoom: false,
        }),
      ).toBe(state);
    });
  });

  describe("Raum öffnen, starten, beenden", () => {
    it("wechselt nach dem Öffnen in die Lobby", () => {
      expect(run(at("settings"), { type: "lobbyOpened" }).stage).toBe("lobby");
      expect(run(at("content"), { type: "lobbyOpened" }).stage).toBe("lobby");
    });

    it("startet die Sitzung nur mit Raum, auch wenn die Lobby inzwischen verlassen wurde", () => {
      expect(
        run(at("lobby"), { type: "sessionStarted", hasRoom: true }).stage,
      ).toBe("live");
      expect(
        run(at("settings"), { type: "sessionStarted", hasRoom: true }).stage,
      ).toBe("live");
      for (const stage of STAGES) {
        const state = at(stage);
        expect(
          liveFlowReducer(state, { type: "sessionStarted", hasRoom: false }),
        ).toBe(state);
      }
    });

    it("kehrt nach dem Beenden zum Inhalt zurück und öffnet den Raum wieder", () => {
      const ended = run(at("live", { roomClosed: true }), {
        type: "roomEnded",
      });
      expect(ended.stage).toBe("content");
      expect(ended.roomClosed).toBe(false);
      expect(run(at("lobby"), { type: "roomEnded" }).stage).toBe("content");
    });

    it("setzt das Beenden ohne Raum aus dem geschlossenen Live-Schritt auf den Inhalt", () => {
      // Der Reducer kennt den Raum nicht; wie das frühere Zurücksetzen gilt es immer.
      const ended = run(at("live", { roomClosed: true }), {
        type: "roomEnded",
      });
      expect(ended.stage).toBe("content");
      expect(ended.roomClosed).toBe(false);
    });

    it("lässt das Beenden im Inhalt ohne Besonderheit unverändert", () => {
      const state = at("content");
      expect(liveFlowReducer(state, { type: "roomEnded" })).toBe(state);
    });

    it("merkt einen geschlossenen Raum, ohne den Schritt zu wechseln", () => {
      const closed = run(at("live"), { type: "roomClosed", hasRoom: true });
      expect(closed).toEqual({ ...at("live"), roomClosed: true });
    });

    it("schließt keinen Raum, den es nicht gibt, und nicht zweimal", () => {
      const state = at("live");
      expect(
        liveFlowReducer(state, { type: "roomClosed", hasRoom: false }),
      ).toBe(state);
      const closed = at("live", { roomClosed: true });
      expect(
        liveFlowReducer(closed, { type: "roomClosed", hasRoom: true }),
      ).toBe(closed);
    });
  });

  describe("Wiederaufnahme", () => {
    it("meldet die Prüfung genau einmal", () => {
      const checked = run(at("content"), { type: "restoreChecked" });
      expect(checked.restoreChecked).toBe(true);
      expect(liveFlowReducer(checked, { type: "restoreChecked" })).toBe(
        checked,
      );
    });

    it("setzt Lobby oder Live und gilt als geprüft", () => {
      expect(run(at("content"), { type: "restored", live: false })).toEqual({
        ...at("lobby"),
        restoreChecked: true,
      });
      expect(run(at("content"), { type: "restored", live: true })).toEqual({
        ...at("live"),
        restoreChecked: true,
      });
    });
  });

  describe("Flags", () => {
    it("schaltet busy und lässt gleiche Werte stehen", () => {
      const busy = run(at("settings"), { type: "busy", busy: true });
      expect(busy.busy).toBe(true);
      expect(liveFlowReducer(busy, { type: "busy", busy: true })).toBe(busy);
      expect(run(busy, { type: "busy", busy: false }).busy).toBe(false);
      const idle = at("settings");
      expect(liveFlowReducer(idle, { type: "busy", busy: false })).toBe(idle);
    });

    it("merkt „Jetzt starten“ und verbraucht es", () => {
      const requested = run(at("settings"), { type: "startRequested" });
      expect(requested.startRequested).toBe(true);
      expect(liveFlowReducer(requested, { type: "startRequested" })).toBe(
        requested,
      );
      const handled = run(requested, { type: "startHandled" });
      expect(handled.startRequested).toBe(false);
      expect(liveFlowReducer(handled, { type: "startHandled" })).toBe(handled);
    });
  });

  it("ändert den Eingabezustand nie", () => {
    const state = at("lobby", { busy: true });
    const copy = { ...state };
    run(
      state,
      { type: "goBack" },
      { type: "roomEnded" },
      { type: "restored", live: true },
    );
    expect(state).toEqual(copy);
  });

  it("führt den ganzen Weg: Inhalt, Einstellungen, Lobby, Live, Ende", () => {
    const walk = run(
      initialLiveFlow,
      { type: "restoreChecked" },
      { type: "goForward" },
      { type: "busy", busy: true },
      { type: "lobbyOpened" },
      { type: "busy", busy: false },
      { type: "busy", busy: true },
      { type: "sessionStarted", hasRoom: true },
      { type: "busy", busy: false },
      { type: "roomClosed", hasRoom: true },
    );
    expect(walk).toEqual({
      stage: "live",
      roomClosed: true,
      busy: false,
      startRequested: false,
      restoreChecked: true,
    });
    expect(run(walk, { type: "roomEnded" })).toEqual({
      ...initialLiveFlow,
      restoreChecked: true,
    });
  });
});

describe("forwardCommand", () => {
  it("öffnet, startet und beendet je nach Schritt", () => {
    expect(forwardCommand(at("content"))).toBeNull();
    expect(forwardCommand(at("settings"))).toBe("open-lobby");
    expect(forwardCommand(at("lobby"))).toBe("start-session");
    expect(forwardCommand(at("live"))).toBe("end-room");
  });

  it("setzt einen geschlossenen Raum im Live-Schritt nur zurück", () => {
    expect(forwardCommand(at("live", { roomClosed: true }))).toBe("reset-room");
  });
});

describe("jumpCommand", () => {
  it("öffnet für einen Sprung zur Lobby ohne Raum erst den Raum", () => {
    expect(jumpCommand("lobby", false)).toBe("open-lobby");
    expect(jumpCommand("lobby", true)).toBeNull();
  });

  it("springt zu allen anderen Schritten direkt", () => {
    for (const stage of ["content", "settings", "live"] as const) {
      expect(jumpCommand(stage, false)).toBeNull();
      expect(jumpCommand(stage, true)).toBeNull();
    }
  });
});
