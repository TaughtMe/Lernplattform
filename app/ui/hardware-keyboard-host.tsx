"use client";

import { useEffect } from "react";
import { watchHardwareKeyboard } from "../../src/storage/hardware-keyboard";

/**
 * Merkt sich still, sobald auf diesem Gerät eine Hardwaretastatur benutzt
 * wurde. Die Startseite empfiehlt die Tastenwelt erst danach (Befund C-003).
 */
export function HardwareKeyboardHost() {
  useEffect(() => watchHardwareKeyboard(document), []);
  return null;
}
