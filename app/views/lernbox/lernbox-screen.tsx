"use client";

import { Edit } from "./parts/edit";
import { Home } from "./parts/home";
import { Match } from "./parts/match";
import { Sheets } from "./parts/sheets";
import { Study } from "./parts/study";
import { Test } from "./parts/test";
import type { LernBoxScreenProps } from "./parts/types";
import styles from "./lernbox-screen.module.css";

export type * from "./parts/types";

/** LernBox nach Design 8a/8b (Übersicht, Bearbeiten), 4c/4g–4j (Runde). */
export function LernBoxScreen(props: LernBoxScreenProps) {
  const { main } = props;
  return (
    <div className={styles.screen}>
      {main.kind === "match" ? (
        <Match key={main.match.gameKey} {...props} match={main.match} />
      ) : main.kind === "test" ? (
        <Test key={main.test.testKey} {...props} test={main.test} />
      ) : main.kind === "study" ? (
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
