"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "../ui/icons";
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
 * Hinweis der Lernen-Startseite zum Home-Bildschirm (Audit B-002, Regel S-4):
 * nur auf iPad und iPhone im Browser, auf einem Gerät ohne Lernstand, ohne
 * Blockade. `hasLearningState` ist `null`, solange unbekannt.
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
  if (!showInstall) return null;

  return (
    <div className={styles.notices} data-testid="storage-protection">
      {
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
      }
    </div>
  );
}

/** Wie lange die Sprechblase der Wolke nach dem Öffnen stehen bleibt. */
const BUBBLE_MS = 6000;

/**
 * „Sicherung einspielen“ als kleine Wolke im Seitenkopf (Regel S-5): nur auf
 * einem Gerät ohne Lernstand. Beim Öffnen gleitet kurz eine Sprechblase
 * herein; danach zeigt sie sich wieder bei Zeiger oder Fokus auf der Wolke.
 * Die Sprechblase gehört zum Link, sein Name steht im `aria-label`.
 */
export function RestoreBackupCloud({
  hasLearningState,
}: {
  hasLearningState: boolean | null;
}) {
  const [intro, setIntro] = useState(true);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (hasLearningState !== false) return;
    const timer = window.setTimeout(() => setIntro(false), BUBBLE_MS);
    return () => window.clearTimeout(timer);
  }, [hasLearningState]);

  if (hasLearningState !== false) return null;
  return (
    <Link
      href={RESTORE_BACKUP_HREF}
      aria-label="Ich habe schon gelernt – Sicherung einspielen"
      className={styles.cloud}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <Icon name="cloud" size={19} />
      {intro || hover ? (
        <span className={styles.bubble} aria-hidden="true">
          Schon mal gelernt? Hier holst du deine Sicherung zurück.
        </span>
      ) : null}
    </Link>
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
