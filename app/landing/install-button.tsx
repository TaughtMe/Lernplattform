"use client";

import { useState } from "react";
import { Icon } from "../ui/icons";
import { Sheet } from "../ui/sheet";
import { type InstallGuide, useInstallPrompt } from "../ui/use-install-prompt";

const STEPS: Record<InstallGuide, string[]> = {
  "ios-safari": [
    "Tippe in Safari auf „Teilen“ (Quadrat mit Pfeil nach oben). Auf dem iPad steht es oben rechts, auf dem iPhone unten.",
    "Wähle „Zum Home-Bildschirm“ und bestätige mit „Hinzufügen“.",
  ],
  "ios-other": [
    "Tippe in deinem Browser auf „Teilen“ oder auf das Menü (drei Punkte).",
    "Wähle „Zum Home-Bildschirm“ und bestätige mit „Hinzufügen“. Fehlt der Eintrag, öffne diese Seite in Safari und gehe dort genauso vor.",
  ],
  "mac-safari": [
    "Öffne in der Menüleiste „Ablage“ (oder „Datei“).",
    "Wähle „Zum Dock hinzufügen“ und bestätige mit „Hinzufügen“.",
  ],
  android: [
    "Öffne das Browser-Menü (drei Punkte).",
    "Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.",
  ],
  generic: [
    "Öffne das Menü deines Browsers.",
    "Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“. Gibt es den Eintrag nicht, funktioniert Lernraum auch ohne Installation im Browser.",
  ],
};

/**
 * „Als App installieren“ unter dem Raumcode. Browser mit Installationsdialog
 * öffnen ihn; alle anderen bekommen eine zum Browser passende Anleitung.
 * Bereits installiert oder nicht möglich: kein Knopf.
 */
export function InstallButton({ className }: { className: string }) {
  const { state, guide, install } = useInstallPrompt();
  const [help, setHelp] = useState(false);

  if (state === "unavailable" || state === "installed") return null;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => (state === "manual" ? setHelp(true) : void install())}
      >
        <Icon name="download" size={18} />
        Als App installieren
      </button>
      <Sheet
        open={help}
        title="So installierst du Lernraum"
        onClose={() => setHelp(false)}
      >
        <ol>
          {STEPS[guide ?? "generic"].map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Sheet>
    </>
  );
}
