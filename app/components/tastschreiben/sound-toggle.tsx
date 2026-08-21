"use client";

import { useState } from "react";
import { isSoundEnabled, setSoundEnabled } from "../../../src/tastschreiben/sound.ts";
import { useIsClient } from "../use-is-client.ts";

export function SoundToggle() {
  const isClient = useIsClient();
  const [, forceRender] = useState(0);

  if (!isClient) {
    return <span className="sound-toggle" aria-hidden="true" />;
  }

  const enabled = isSoundEnabled();

  function toggle() {
    setSoundEnabled(!enabled);
    forceRender((n) => n + 1);
  }

  return (
    <button type="button" className="sound-toggle" aria-label={enabled ? "Ton ausschalten" : "Ton einschalten"} onClick={toggle}>
      {enabled ? "🔊" : "🔇"}
    </button>
  );
}
