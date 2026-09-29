"use client";

import { renderScreen, showsKeyboard, type ScreenState } from "./registry";
import styles from "./frame.module.css";

export function ScreenFrame({
  state,
  width,
  height,
}: {
  state: ScreenState;
  width: number;
  height: number;
}) {
  return (
    <div
      className={styles.frame}
      data-screen={state.id}
      data-theme={state.theme}
      style={{ width, height }}
    >
      {renderScreen(state)}
      {showsKeyboard(state) ? (
        <div className={styles.keyboard} aria-hidden="true">
          <span>
            Systemtastatur · 291 px
            <br />
            Screen darüber: 497 px
          </span>
        </div>
      ) : null}
    </div>
  );
}
