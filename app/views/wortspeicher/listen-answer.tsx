"use client";

import { Icon } from "../../ui/icons";
import styles from "./wortspeicher.module.css";

/**
 * Stufe 6: großer Lautsprecher-Knopf. Das Wort selbst bleibt unsichtbar; nur
 * bei gleich klingenden Wörtern steht eine kurze Bedeutungshilfe darunter
 * (zählt nicht als Hilfe).
 */
export function ListenAnswer({
  speaking,
  meaning,
  onListen,
}: {
  speaking: boolean;
  /** Bedeutungshilfe, z. B. „zum Fahren“; leer bei eindeutigen Wörtern. */
  meaning?: string | undefined;
  onListen: () => void;
}) {
  return (
    <div className={styles.listen}>
      <button
        type="button"
        className="ui-btn ui-btn--gold ui-btn--lg"
        onClick={onListen}
      >
        <Icon name="speaker" size={22} /> Anhören
      </button>
      <p className="ui-sr-only" role="status">
        {speaking ? "Das Wort wird gesprochen." : ""}
      </p>
      {meaning ? <p className={styles.meaning}>Bedeutung: {meaning}</p> : null}
    </div>
  );
}
