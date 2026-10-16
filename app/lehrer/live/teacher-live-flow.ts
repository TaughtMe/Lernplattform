/**
 * Ablauf des Lehrkraft-Laufdiktats als reiner Reducer: in welchem Schritt die
 * Lehrkraft steht und welche Flags den Ablauf steuern. Der Raum selbst (Daten,
 * Server, Kanal) liegt im Sitzungs-Hook; der Reducer erfährt nur, ob einer
 * offen ist, und lässt unmögliche Übergänge (z. B. `live` ohne Raum) stehen.
 */

/** Die vier Schritte des Lehrkraft-Laufdiktats. */
export type Stage = "content" | "settings" | "lobby" | "live";

export type LiveFlowState = {
  stage: Stage;
  /** Der Raum ist zu Ende (Frist oder Server); die letzten Ergebnisse bleiben sichtbar. */
  roomClosed: boolean;
  /** Eine Anfrage an den Raumdienst läuft. */
  busy: boolean;
  /** „Jetzt starten“ wartet darauf, dass Inhalt, Modus und Klasse übernommen sind. */
  startRequested: boolean;
  /** Die Wiederaufnahme eines offenen Raums ist geprüft; sie hat Vorrang vor Adressen. */
  restoreChecked: boolean;
};

export const initialLiveFlow: LiveFlowState = {
  stage: "content",
  roomClosed: false,
  busy: false,
  startRequested: false,
  restoreChecked: false,
};

export type LiveFlowAction =
  | { type: "goBack" }
  /** Nur der Schritt `content` → `settings`; weiter geht es über `forwardCommand`. */
  | { type: "goForward" }
  | { type: "jumpToStage"; stage: Stage; hasRoom: boolean }
  /** Der Raum wurde geöffnet. */
  | { type: "lobbyOpened" }
  /** Die Sitzung wurde gestartet. */
  | { type: "sessionStarted"; hasRoom: boolean }
  /** Der Raum wurde beendet oder aufgeräumt: zurück zum Inhalt. */
  | { type: "roomEnded" }
  /** Der Raum ist zu Ende, die Ergebnisse bleiben im Live-Schritt stehen. */
  | { type: "roomClosed"; hasRoom: boolean }
  | { type: "restoreChecked" }
  /** Ein offener Raum wurde wiederaufgenommen. */
  | { type: "restored"; live: boolean }
  | { type: "busy"; busy: boolean }
  | { type: "startRequested" }
  | { type: "startHandled" };

function withStage(state: LiveFlowState, stage: Stage): LiveFlowState {
  return state.stage === stage ? state : { ...state, stage };
}

export function liveFlowReducer(
  state: LiveFlowState,
  action: LiveFlowAction,
): LiveFlowState {
  switch (action.type) {
    case "goBack": {
      // Ein geschlossener Raum hat keine Lobby und keine Einstellungen mehr.
      if (state.roomClosed) return state;
      if (state.stage === "settings") return withStage(state, "content");
      if (state.stage === "lobby") return withStage(state, "settings");
      if (state.stage === "live") return withStage(state, "lobby");
      return state;
    }
    case "goForward":
      return state.stage === "content" ? withStage(state, "settings") : state;
    case "jumpToStage": {
      // Lobby und Live gibt es nur mit offenem Raum.
      if (
        (action.stage === "lobby" || action.stage === "live") &&
        !action.hasRoom
      ) {
        return state;
      }
      return withStage(state, action.stage);
    }
    case "lobbyOpened":
      return withStage(state, "lobby");
    case "sessionStarted":
      return action.hasRoom ? withStage(state, "live") : state;
    case "roomEnded":
      // Wie das frühere Zurücksetzen: immer zum Inhalt, unabhängig vom Raum.
      return state.stage === "content" && !state.roomClosed
        ? state
        : { ...state, stage: "content", roomClosed: false };
    case "roomClosed":
      if (!action.hasRoom || state.roomClosed) return state;
      return { ...state, roomClosed: true };
    case "restoreChecked":
      return state.restoreChecked ? state : { ...state, restoreChecked: true };
    case "restored":
      return {
        ...state,
        stage: action.live ? "live" : "lobby",
        restoreChecked: true,
      };
    case "busy":
      return state.busy === action.busy
        ? state
        : { ...state, busy: action.busy };
    case "startRequested":
      return state.startRequested ? state : { ...state, startRequested: true };
    case "startHandled":
      return state.startRequested ? { ...state, startRequested: false } : state;
  }
}

/** Was nach „Weiter“ außer dem Schrittwechsel zu tun ist (läuft im Hook). */
export type LiveFlowCommand =
  "open-lobby" | "start-session" | "end-room" | "reset-room";

/**
 * „Weiter“ im aktuellen Schritt: Einstellungen öffnen den Raum, die Lobby
 * startet die Sitzung, der Live-Schritt beendet den Raum. Ein geschlossener
 * Raum braucht keinen Aufruf mehr und wird nur zurückgesetzt.
 */
export function forwardCommand(state: LiveFlowState): LiveFlowCommand | null {
  if (state.stage === "settings") return "open-lobby";
  if (state.stage === "lobby") return "start-session";
  if (state.stage === "live")
    return state.roomClosed ? "reset-room" : "end-room";
  return null;
}

/** Ein Sprung zur Lobby ohne offenen Raum öffnet erst den Raum. */
export function jumpCommand(
  stage: Stage,
  hasRoom: boolean,
): LiveFlowCommand | null {
  return stage === "lobby" && !hasRoom ? "open-lobby" : null;
}
