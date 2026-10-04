/**
 * Halten zum Aufdecken im Laufdiktat: zwei Finger (Touch) oder die Tasten A und
 * L gleichzeitig (Tastatur). Reine Zählung ohne DOM; der Hook in
 * `app/raum/spiel/use-hold-to-reveal.ts` verdrahtet nur die Ereignisse.
 */

export type RevealKey = "KeyA" | "KeyL";

export type HoldState = {
  /** `pointerId` der Finger, die gerade aufliegen (Mauszeiger zählen nicht). */
  readonly contacts: readonly number[];
  readonly keys: readonly RevealKey[];
};

export type HoldAction =
  | { type: "pointerdown"; id: number; pointerType: string }
  | { type: "pointerup"; id: number }
  | { type: "keydown"; code: string; repeat?: boolean; modified?: boolean }
  | { type: "keyup"; code: string }
  /** Fokusverlust: ein fehlendes `keyup` darf das Wort nicht stehen lassen. */
  | { type: "blur" }
  | { type: "reset" };

export const EMPTY_HOLD: HoldState = { contacts: [], keys: [] };

export function isRevealKey(code: string): code is RevealKey {
  return code === "KeyA" || code === "KeyL";
}

/** Zwei Finger liegen auf oder A und L sind beide gedrückt. */
export function isHolding(state: HoldState): boolean {
  return state.contacts.length >= 2 || state.keys.length >= 2;
}

export function holdReducer(state: HoldState, action: HoldAction): HoldState {
  switch (action.type) {
    case "pointerdown":
      if (action.pointerType === "mouse") return state;
      if (state.contacts.includes(action.id)) return state;
      return { ...state, contacts: [...state.contacts, action.id] };
    case "pointerup":
      if (!state.contacts.includes(action.id)) return state;
      return {
        ...state,
        contacts: state.contacts.filter((id) => id !== action.id),
      };
    case "keydown":
      if (!isRevealKey(action.code) || action.repeat || action.modified) {
        return state;
      }
      if (state.keys.includes(action.code)) return state;
      return { ...state, keys: [...state.keys, action.code] };
    case "keyup":
      if (!isRevealKey(action.code) || !state.keys.includes(action.code)) {
        return state;
      }
      return { ...state, keys: state.keys.filter((k) => k !== action.code) };
    case "blur":
      return state.keys.length === 0 ? state : { ...state, keys: [] };
    case "reset":
      return EMPTY_HOLD;
  }
}

/**
 * Nach A + L bleibt oft eine Taste länger gedrückt. Deren Wiederholung darf
 * nicht im Antwortfeld landen und das Feld erst nach dem Loslassen aller Tasten
 * fokussiert werden.
 */
export function anyRevealKeyHeld(state: HoldState): boolean {
  return state.keys.length > 0;
}
