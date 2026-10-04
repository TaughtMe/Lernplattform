"use client";

import { useState } from "react";
import { Icon } from "../ui/icons";
import { Sheet } from "../ui/sheet";
import { useInstallPrompt } from "../ui/use-install-prompt";

/**
 * „Als App installieren“ unter dem Raumcode. Chrome, Edge und Android öffnen
 * den Installationsdialog; iPhone und iPad bekommen eine kurze Anleitung.
 * Bereits installiert oder nicht möglich: kein Knopf.
 */
export function InstallButton({ className }: { className: string }) {
  const { state, install } = useInstallPrompt();
  const [help, setHelp] = useState(false);

  if (state === "unavailable" || state === "installed") return null;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => (state === "ios" ? setHelp(true) : void install())}
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
          <li>Tippe in Safari auf „Teilen“ (Quadrat mit Pfeil nach oben).</li>
          <li>Wähle „Zum Home-Bildschirm“ und bestätige mit „Hinzufügen“.</li>
        </ol>
      </Sheet>
    </>
  );
}
