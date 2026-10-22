"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  readBrowserLearningChoice,
  requestPersistentStorage,
  writeBrowserLearningChoice,
} from "../../src/storage/storage-protection";
import { InstallSteps } from "../landing/install-button";
import { useInstallPrompt, type InstallGuide } from "../ui/use-install-prompt";
import styles from "./storage-protection.module.css";

/** Ziel von „Sicherung einspielen“: der vorhandene Ablauf in den Einstellungen. */
export const RESTORE_BACKUP_HREF = "/lernen/einstellungen#backup-title";

const CHOICE_EVENT = "lernraum-browser-learning-change";

function subscribeChoice(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHOICE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHOICE_EVENT, onChange);
  };
}

/**
 * iPad oder iPhone im Browser, nicht installiert. Nur dort hat die App auf dem
 * Home-Bildschirm einen anderen Speicher als die geöffnete Seite. Vor der
 * Hydration und auf dem Server ist die Antwort `null`.
 */
function useIosBrowserGuide(): InstallGuide | null {
  const { state, guide } = useInstallPrompt();
  return state === "manual" && (guide === "ios-safari" || guide === "ios-other")
    ? guide
    : null;
}

/**
 * Hinweise der Lernen-Startseite zum Schutz vor Speicherverlust (Audit B-002,
 * Regeln S-4 und S-5). Beide erscheinen nur auf einem Gerät ohne Lernstand und
 * blockieren nichts. `hasLearningState` ist `null`, solange unbekannt.
 */
export function StorageProtectionNotice({
  hasLearningState,
}: {
  hasLearningState: boolean | null;
}) {
  const iosGuide = useIosBrowserGuide();
  const stored = useSyncExternalStore(
    subscribeChoice,
    () => readBrowserLearningChoice(),
    () => false,
  );
  // Auch bei gesperrtem Speicher verschwindet der Hinweis für diese Sitzung.
  const [dismissed, setDismissed] = useState(false);
  const browserChosen = stored || dismissed;

  // Erst mit vorhandenem Lernstand lohnt die Bitte um dauerhaften Speicher;
  // sie ist leise und ohne Erfolgsversprechen.
  useEffect(() => {
    if (hasLearningState === true) void requestPersistentStorage();
  }, [hasLearningState]);

  if (hasLearningState !== false) return null;
  const showInstall = iosGuide !== null && !browserChosen;

  return (
    <div className={styles.notices} data-testid="storage-protection">
      {showInstall ? (
        <section
          className="ui-notice ui-stack"
          aria-labelledby="install-first-title"
        >
          <h2 id="install-first-title" className={styles.title}>
            Zuerst zum Home-Bildschirm
          </h2>
          <p className={styles.text}>
            Füge den Lernraum zuerst zum Home-Bildschirm hinzu. Dann bleiben
            deine Daten sicherer. Wichtig: Was du hier im Browser lernst, ist in
            der App nicht zu sehen.
          </p>
          <InstallSteps guide={iosGuide} className={styles.steps} />
          <button
            type="button"
            className={`ui-btn ui-btn--ghost ui-btn--sm ${styles.action}`}
            onClick={() => {
              writeBrowserLearningChoice();
              setDismissed(true);
              window.dispatchEvent(new Event(CHOICE_EVENT));
            }}
          >
            Trotzdem im Browser lernen
          </button>
        </section>
      ) : null}
      <section className="ui-notice ui-stack" aria-label="Sicherung einspielen">
        <p className={styles.text}>
          Du hast schon gelernt und eine Sicherungsdatei? Hol sie hierher.
        </p>
        <Link
          href={RESTORE_BACKUP_HREF}
          className={`ui-btn ui-btn--ghost ui-btn--sm ${styles.action}`}
        >
          Ich habe schon gelernt – Sicherung einspielen
        </Link>
      </section>
    </div>
  );
}

/**
 * Dezenter Hinweis in den Einstellungen für iPad und iPhone im Browser: Der
 * Lernstand von hier muss mit einer Sicherung in die App auf dem
 * Home-Bildschirm geholt werden.
 */
export function InstallStorageHint() {
  const iosGuide = useIosBrowserGuide();
  if (!iosGuide) return null;
  return (
    <p className="ui-tiny ui-muted" data-testid="install-storage-hint">
      Du lernst gerade im Browser. Die App auf dem Home-Bildschirm hat einen
      eigenen Speicher und zeigt diesen Lernstand nicht. Mach vorher eine
      Sicherung, dann kannst du sie in der App einspielen.
    </p>
  );
}
