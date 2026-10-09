import type { ClipboardEvent, DragEvent, FormEvent } from "react";
import {
  STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES,
  isBlockedRunningDictationInput,
} from "../../../src/domain/running-dictation-input";

/**
 * Eingabefelder im Wortspeicher: kein Einfügen, Ablegen, keine Autokorrektur
 * und keine Rechtschreibprüfung (Entscheidung 29).
 */
export const strictInputProps = {
  ...STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES,
  onPaste: (event: ClipboardEvent) => event.preventDefault(),
  onDrop: (event: DragEvent) => event.preventDefault(),
  onBeforeInput: (event: FormEvent) => {
    if (
      isBlockedRunningDictationInput(
        (event.nativeEvent as InputEvent).inputType,
      )
    ) {
      event.preventDefault();
    }
  },
};
