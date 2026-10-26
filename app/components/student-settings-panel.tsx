"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import {
  learnerDisplayName,
  profileAvatar,
} from "../../src/domain/learner-profile";
import { backupFailureMessage } from "../../src/integrations/backup/backup-failure";
import {
  restorePersonalBackupFromFile,
  savePersonalBackupToDirectory,
} from "../../src/integrations/backup/personal-backup-storage";
import {
  backupReminder,
  readLastBackup,
  writeLastBackup,
} from "../../src/storage/backup-reminder";
import { learnerProfileRepository } from "../../src/storage/learner-profile";
import { exportPersonalLearningBackup } from "../../src/storage/personal-backup";
import { serializePersonalLearningBackup } from "../../src/domain/personal-backup";
import { PersonalLearningDatabase } from "../../src/storage/personal-learning-events";
import { countUnreadableRecords } from "../../src/storage/unreadable-records";
import { AnimalImage } from "../ui/animal";
import { CloudSyncPanel } from "./cloud-sync-panel";
import { InstallStorageHint } from "./storage-protection";
import { AnimalPicker } from "../ui/animal-picker";
import { Segmented, Toggle } from "../ui/primitives";
import { useLearnerProfile } from "../ui/use-learner-profile";
import { useMirrorReading } from "../ui/mirror-reading";
import { useAreaVisible } from "../release/release-context";
import { useThemePreference, type ThemePreference } from "../ui/theme";
import { useHydrated } from "../ui/use-hydrated";

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> =
  [
    { value: "system", label: "System" },
    { value: "light", label: "Hell" },
    { value: "dark", label: "Dunkel" },
  ];

/** Profil: Tier, Darstellung, Klasse und Datensicherung. */
export function StudentSettingsPanel() {
  const profile = useLearnerProfile();
  const hydrated = useHydrated();
  const { preference } = useThemePreference();
  const mirrorVisible = useAreaVisible("spiegelschrift");
  const mirror = useMirrorReading();

  useEffect(() => {
    if (hydrated && !profile) learnerProfileRepository.ensure();
  }, [hydrated, profile]);

  function chooseAnimal(animal: string) {
    const current = profile ?? learnerProfileRepository.ensure();
    // Ein Tier ersetzt eine gewählte Figur im selben Speichervorgang.
    learnerProfileRepository.save({ ...current, animal, figure: null });
  }

  function chooseFigure(figure: string) {
    const current = profile ?? learnerProfileRepository.ensure();
    learnerProfileRepository.save({ ...current, figure });
  }

  function unlockFigures() {
    const current = profile ?? learnerProfileRepository.ensure();
    learnerProfileRepository.save({ ...current, figuresUnlocked: true });
  }

  function setTheme(next: ThemePreference) {
    window.localStorage.setItem("theme-preference", next);
    window.dispatchEvent(new Event("lernraum-theme-change"));
  }

  return (
    <div className="ui-profile">
      <section
        className="ui-card ui-card--pad ui-stack ui-profile__animal"
        aria-labelledby="profile-title"
      >
        <div className="ui-row">
          <span className="ui-animal-disc ui-profile__disc">
            <AnimalImage animal={profileAvatar(profile)} size={84} />
          </span>
          <div>
            <p className="ui-eyebrow">
              {profile?.figure ? "Deine Figur" : "Dein Tier"}
            </p>
            <h2 id="profile-title" className="ui-h-fun">
              {profile ? learnerDisplayName(profile) : "…"}
            </h2>
            <p className="ui-small ui-muted">
              Dein Tier erscheint in Räumen und im Lernraum. Name und Lernstand
              bleiben auf diesem Gerät.
            </p>
          </div>
        </div>
        <AnimalPicker
          value={profile?.animal ?? null}
          onChange={chooseAnimal}
          figure={profile?.figure ?? null}
          figuresUnlocked={profile?.figuresUnlocked ?? false}
          onFigureChange={chooseFigure}
          onUnlock={unlockFigures}
        />
      </section>

      <div className="ui-stack">
        <section
          className="ui-card ui-card--pad ui-stack"
          aria-labelledby="appearance-title"
        >
          <h2 id="appearance-title" className="ui-h-section">
            Darstellung
          </h2>
          <Segmented
            label="Farbschema"
            value={hydrated ? preference : "system"}
            onChange={setTheme}
            options={THEME_OPTIONS}
          />
          <p className="ui-small ui-muted">
            Deine Wahl wird nur auf diesem Gerät gespeichert.
          </p>
          {mirrorVisible && hydrated ? (
            <div className="ui-stack">
              <Toggle
                label="Spiegelschrift im Lesetext"
                hint="Der Text zum Einprägen in der Textbox wird gespiegelt angezeigt. Schaltet sich nach 7 Tagen von selbst aus."
                checked={mirror.active}
                onChange={(on) => (on ? mirror.turnOn() : mirror.turnOff())}
              />
              {mirror.active && mirror.until ? (
                <p className="ui-small" role="status">
                  Aktiv bis{" "}
                  {new Date(mirror.until).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                  .{" "}
                  <button
                    type="button"
                    className="ui-btn ui-btn--link"
                    onClick={mirror.turnOff}
                  >
                    Ausschalten
                  </button>
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <BackupCard />

        <section
          className="ui-card ui-card--pad ui-stack"
          aria-labelledby="class-title"
        >
          <h2 id="class-title" className="ui-h-section">
            Klasse und Datenschutz
          </h2>
          <nav className="ui-stack" aria-label="Persönliche Lernbereiche">
            <Link
              className="ui-btn ui-btn--ghost ui-btn--sm"
              href="/lernen/klasse"
            >
              Klasse beitreten oder ansehen
            </Link>
            <Link
              className="ui-btn ui-btn--ghost ui-btn--sm"
              href="/lernen/fortschritt"
            >
              Mein Fortschritt
            </Link>
            <Link className="ui-btn ui-btn--link" href="/datenschutz">
              Mehr über Datenschutz
            </Link>
          </nav>
        </section>
        <CloudSyncPanel area="student" />
      </div>
    </div>
  );
}

type DirectoryPicker = () => Promise<FileSystemDirectoryHandle>;

/** Zahl gespeicherter Einträge, die diese App-Version nicht lesen kann (Regel S-1). */
function useUnreadableCount(hydrated: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    const database = new PersonalLearningDatabase();
    countUnreadableRecords(database)
      .then((value) => {
        if (active) setCount(value);
      })
      // Ohne lesbaren Speicher gibt es hier nichts zu melden.
      .catch(() => undefined)
      .finally(() => database.close());
    return () => {
      active = false;
    };
  }, [hydrated]);
  return count;
}

function BackupCard() {
  const hydrated = useHydrated();
  // Der Text dazu erscheint erst nach dem Laden (hydrated), daher kein Abgleichproblem.
  const [lastBackup, setLastBackup] = useState<Date | null>(() =>
    typeof window === "undefined" ? null : readLastBackup(),
  );
  const [message, setMessage] = useState<{
    tone: "good" | "bad";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const directoryPicker =
    hydrated &&
    typeof (window as Window & { showDirectoryPicker?: DirectoryPicker })
      .showDirectoryPicker === "function";

  const reminder = backupReminder(lastBackup, new Date());
  const unreadable = useUnreadableCount(hydrated);

  function remember() {
    const now = new Date();
    writeLastBackup(now);
    setLastBackup(now);
  }

  function recoveryNotice(count: number) {
    return count
      ? ` ${count} Originaleinträge sind separat aufbewahrt und werden weiter mitgesichert. Diese App kann ihre Daten noch nicht vollständig nutzen.`
      : "";
  }

  async function download() {
    setBusy(true);
    try {
      const backup = await exportPersonalLearningBackup();
      const text = serializePersonalLearningBackup(backup);
      const url = URL.createObjectURL(
        new Blob([text], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lernraum-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      remember();
      setMessage({
        tone: backup.recovery.length ? "bad" : "good",
        text: `Sicherungsdatei wurde erstellt.${recoveryNotice(backup.recovery.length)}`,
      });
    } catch (error) {
      setMessage({
        tone: "bad",
        text: backupFailureMessage(
          "Die Sicherung konnte nicht erstellt werden.",
          error,
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveToDirectory() {
    const picker = (
      window as Window & { showDirectoryPicker?: DirectoryPicker }
    ).showDirectoryPicker;
    if (!picker) return;
    setBusy(true);
    try {
      const result = await savePersonalBackupToDirectory(await picker());
      remember();
      setMessage({
        tone: result.backup.recovery.length ? "bad" : "good",
        text: `Gesichert als ${result.filename}.${recoveryNotice(result.backup.recovery.length)}`,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage({
        tone: "bad",
        text: backupFailureMessage(
          "Die Sicherung konnte nicht gespeichert werden.",
          error,
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const result = await restorePersonalBackupFromFile(file);
      const skipped = result.skipped.length;
      setMessage({
        tone:
          result.conflicts.length || skipped || result.recoveryRetained
            ? "bad"
            : "good",
        text: `Wiederhergestellt: ${result.added} neu, ${result.updated} aktualisiert, ${result.unchanged} unverändert${result.conflicts.length ? `, ${result.conflicts.length} Konflikte blieben unverändert` : ""}.${skipped ? ` ${skipped} ${skipped === 1 ? "Eintrag" : "Einträge"} in der Datei konnten nicht gelesen werden und wurden übersprungen.` : ""}${recoveryNotice(result.recoveryRetained)}`,
      });
    } catch (error) {
      setMessage({
        tone: "bad",
        text: backupFailureMessage(
          "Die Sicherung konnte nicht geladen werden.",
          error,
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="ui-card ui-card--pad ui-stack"
      aria-labelledby="backup-title"
    >
      <h2 id="backup-title" className="ui-h-section">
        Datensicherung
      </h2>
      <p
        className={`ui-notice${reminder.level === "ok" ? " ui-notice--good" : ""}`}
      >
        {!hydrated
          ? "Sicherungsstand wird geprüft …"
          : reminder.level === "never"
            ? "Noch nie gesichert. Wird das Gerät zurückgesetzt oder der Browser geleert, ist der Lernstand weg."
            : reminder.level === "old"
              ? `Letzte Sicherung vor ${reminder.days} Tagen. Zeit für eine neue.`
              : `Letzte Sicherung: ${lastBackup?.toLocaleDateString("de-DE")}.`}
      </p>
      {unreadable > 0 ? (
        <p className="ui-notice" role="status">
          {unreadable}{" "}
          {unreadable === 1
            ? "gespeicherter Eintrag konnte"
            : "gespeicherte Einträge konnten"}{" "}
          nicht gelesen werden. Deine übrigen Daten sind da. Eine Aktualisierung
          der App behebt das meist.
        </p>
      ) : null}
      <div className="ui-grid2">
        <button
          type="button"
          className="ui-btn ui-btn--primary ui-btn--sm"
          disabled={!hydrated || busy}
          onClick={() => void download()}
        >
          Lernstand sichern
        </button>
        <label className="ui-btn ui-btn--ghost ui-btn--sm ui-file">
          Sicherung laden
          <input
            type="file"
            accept="application/json"
            disabled={!hydrated || busy}
            onChange={(event) => void restore(event)}
          />
        </label>
      </div>
      {directoryPicker ? (
        <button
          type="button"
          className="ui-btn ui-btn--link"
          disabled={busy}
          onClick={() => void saveToDirectory()}
        >
          In einem Ordner sichern
        </button>
      ) : null}
      {message ? (
        <p className={`ui-notice ui-notice--${message.tone}`} role="status">
          {message.text}
        </p>
      ) : null}
      <InstallStorageHint />
      <p className="ui-tiny ui-muted">
        Die Datei enthält LernBox, Lernwörter, Tipptraining und Lernverlauf.
        Beim Laden werden vorhandene Daten ergänzt, nicht gelöscht.
      </p>
    </section>
  );
}
