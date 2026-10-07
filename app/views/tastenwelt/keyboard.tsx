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

type KeyDef = (typeof KEYBOARD_ROWS)[number][number];

/**
 * Große Entertaste: deutsche ISO-Form über zwei Zeilen (oben breit, unten schmal).
 * Kleine Entertaste: eine einzelne Taste in der mittleren Zeile, das „#“ rückt nach oben.
 */
function layoutRows(enterKey: "large" | "small"): KeyDef[][] {
  if (enterKey === "large") return KEYBOARD_ROWS;
  const hash = KEYBOARD_ROWS.flat().find((key) => key.code === "Backslash");
  return KEYBOARD_ROWS.map((row) => {
    if (row.some((key) => key.code === "Enter") && hash) {
      return [
        ...row.filter((key) => key.code !== "Enter"),
        { ...hash, width: 1.55 },
      ];
    }
    if (row.some((key) => key.code === "EnterLower")) {
      return [
        ...row.filter(
          (key) => key.code !== "Backslash" && key.code !== "EnterLower",
        ),
        { id: "Enter", code: "Enter", label: "↵", width: 2.25, kind: "system" },
      ];
    }
    return row;
  });
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
  /** Große Entertaste über zwei Zeilen oder kleine Taste in der mittleren Zeile. */
  enterKey?: "large" | "small";
};

/** Deutsche ISO-Tastatur mit Fingerfarben, Zielhinweis und Wärmekarte. */
export function Keyboard({
  size,
  targets = [],
  wrong = null,
  heat,
  fingerColors = true,
  enterKey = "large",
}: KeyboardProps) {
  const small = enterKey === "small";
  return (
    <div className={cx(styles.board, styles[size])} aria-hidden="true">
      {layoutRows(enterKey).map((row, index) => (
        <div key={index} className={styles.row}>
          {row.map((key) => {
            const level = heat?.[key.code] ?? 0;
            const colored =
              !heat && fingerColors && key.finger && key.finger !== "thumb";
            // Beide Teile der großen Entertaste leuchten zusammen.
            const code = key.code === "EnterLower" ? "Enter" : key.code;
            const iso = !small && code === "Enter";
            return (
              <span
                key={key.code}
                className={cx(
                  styles.key,
                  key.kind !== "character" && styles.control,
                  colored && styles.finger,
                  !heat && targets.includes(code) && styles.target,
                  !heat &&
                    (wrong === key.code || (iso && wrong === "Enter")) &&
                    styles.wrong,
                  level > 0 && styles.heat,
                  level >= 2 && styles.hot,
                  iso && key.code === "Enter" && styles.isoTop,
                  iso && key.code === "EnterLower" && styles.isoBottom,
                )}
                style={
                  {
                    "--w": key.width ?? 1,
                    "--hue": FINGER_HUE[key.finger ?? "thumb"],
                    "--heat": level,
                  } as CSSProperties
                }
              >
                {key.code === "Enter" && small ? "↵" : keyLabel(key)}
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
