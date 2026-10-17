"use client";

import { Edit } from "./parts/edit";
import { Home } from "./parts/home";
import { Sheets } from "./parts/sheets";
import { Study } from "./parts/study";
import type { LernBoxScreenProps } from "./parts/types";
import styles from "./lernbox-screen.module.css";

export type * from "./parts/types";

/** LernBox nach Design 8a/8b (Übersicht, Bearbeiten), 4c/4g–4j (Runde). */
export function LernBoxScreen(props: LernBoxScreenProps) {
  const { main } = props;
  return (
    <div className={styles.screen}>
      {main.kind === "study" ? (
        <Study {...props} study={main.study} />
      ) : main.kind === "edit" ? (
        <Edit {...props} edit={main.edit} />
      ) : (
        <Home {...props} />
      )}
      {props.sheet ? <Sheets {...props} sheet={props.sheet} /> : null}
    </div>
  );
}
