"use client";

import { CodeSheet } from "./code-sheet";
import { ImportSheet } from "./import-sheet";
import { ManualSheet } from "./manual-sheet";
import { DeckSheet } from "./new-deck";
import { StartSheet } from "./start-sheet";
import type { LbSheet, LernBoxScreenProps } from "./types";

export function Sheets(props: LernBoxScreenProps & { sheet: LbSheet }) {
  const { sheet } = props;
  if (sheet.kind === "start")
    return <StartSheet {...props} scope={sheet.scope} />;
  if (sheet.kind === "code") return <CodeSheet {...props} />;
  if (sheet.kind === "deck") return <DeckSheet {...props} />;
  if (sheet.kind === "import") return <ImportSheet {...props} />;
  return <ManualSheet {...props} />;
}
