import type { CSSProperties } from "react";
import {
  KEYBOARD_ROWS,
  type Finger,
} from "../../../src/tastschreiben/keyboard-layout";
import { cx } from "../parts/parts";
import { FINGER_HUE, LEFT_HAND, RIGHT_HAND } from "./fingers";
import styles from "./keyboard.module.css";

/** Symbole der Vorlage für Steuertasten. */
const CONTROL_GLYPH: Readonly<Record<string, string>> = {
  Backspace: "⌫",
  Tab: "⇥",
  CapsLock: "⇪",
  Enter: "",
  EnterLower: "↵",
  ShiftLeft: "⇧",
  ShiftRight: "⇧",
  Space: "",
};

function keyLabel(key: (typeof KEYBOARD_ROWS)[number][number]) {
  const glyph = CONTROL_GLYPH[key.code];
  if (glyph !== undefined) return glyph;
  if (key.kind !== "character") return key.label;
  return key.label === "ß" ? "ß" : key.label.toLocaleUpperCase("de-DE");
}

type KeyboardProps = {
  size: "large" | "small";
  /** Codes der nächsten Taste(n), z. B. Buchstabe und Umschalt. */
  targets?: readonly string[];
  /** Code der zuletzt falsch getroffenen Taste. */
  wrong?: string | null;
  /** Fehlerstärke 1–3 je Tastencode (Wärmekarte „Unsichere Tasten“). */
  heat?: Readonly<Record<string, number>>;
  fingerColors?: boolean;
};

/** Deutsche ISO-Tastatur mit Fingerfarben, Zielhinweis und Wärmekarte. */
export function Keyboard({
  size,
  targets = [],
  wrong = null,
  heat,
  fingerColors = true,
}: KeyboardProps) {
  return (
    <div className={cx(styles.board, styles[size])} aria-hidden="true">
      {KEYBOARD_ROWS.map((row, index) => (
        <div key={index} className={styles.row}>
          {row.map((key) => {
            const level = heat?.[key.code] ?? 0;
            const colored =
              !heat && fingerColors && key.finger && key.finger !== "thumb";
            return (
              <span
                key={key.code}
                className={cx(
                  styles.key,
                  key.kind !== "character" && styles.control,
                  colored && styles.finger,
                  !heat && targets.includes(key.code) && styles.target,
                  !heat && wrong === key.code && styles.wrong,
                  level > 0 && styles.heat,
                  level >= 2 && styles.hot,
                )}
                style={
                  {
                    "--w": key.width ?? 1,
                    "--hue": FINGER_HUE[key.finger ?? "thumb"],
                    "--heat": level,
                  } as CSSProperties
                }
              >
                {keyLabel(key)}
                {key.home ? <span className={styles.bump} /> : null}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Fingerleiste unter der Tastatur; hebt die Finger für die nächste Taste hervor. */
export function FingerLegend({ active }: { active: readonly Finger[] }) {
  const chip = ([finger, label]: [Finger, string], index: number) => (
    <span
      key={`${finger}-${index}`}
      className={cx(styles.chip, active.includes(finger) && styles.on)}
      style={{ "--hue": FINGER_HUE[finger] } as CSSProperties}
    >
      <span className={styles.dot} />
      {label}
    </span>
  );
  return (
    <div className={styles.legend} aria-hidden="true">
      <div className={styles.hand}>{LEFT_HAND.map(chip)}</div>
      <div className={styles.hand}>{RIGHT_HAND.map(chip)}</div>
    </div>
  );
}
