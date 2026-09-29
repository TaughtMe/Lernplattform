"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { learnerDisplayName } from "../../src/domain/learner-profile";
import {
  readPersonalBackupFile,
  savePersonalBackupToDirectory,
} from "../../src/integrations/backup/personal-backup-storage";
import {
  backupReminder,
  readLastBackup,
  writeLastBackup,
} from "../../src/storage/backup-reminder";
import { learnerProfileRepository } from "../../src/storage/learner-profile";
import {
  restorePersonalLearningBackup,
  serializePersonalLearningBackupFromDatabase,
} from "../../src/storage/personal-backup";
import { AnimalImage } from "../ui/animal";
import { AnimalPicker } from "../ui/animal-picker";
import { Segmented } from "../ui/primitives";
import { useLearnerProfile } from "../ui/use-learner-profile";
import { useThemePreference, type ThemePreference } from "./theme-toggle";
import { useHydrated } from "./use-hydrated";

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

  useEffect(() => {
    if (hydrated && !profile) learnerProfileRepository.ensure();
  }, [hydrated, profile]);

  function chooseAnimal(animal: string) {
    const current = profile ?? learnerProfileRepository.ensure();
    learnerProfileRepository.save({ ...current, animal });
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
            <AnimalImage animal={profile?.animal ?? null} size={84} />
          </span>
          <div>
            <p className="ui-eyebrow">Dein Tier</p>
            <h2 id="profile-title" className="ui-h-fun">
              {profile ? learnerDisplayName(profile) : "…"}
            </h2>
            <p className="ui-small ui-muted">
              Dein Tier erscheint in Räumen und im Lernraum. Name und Lernstand
              bleiben auf diesem Gerät.
            </p>
          </div>
        </div>
        <AnimalPicker value={profile?.animal ?? null} onChange={chooseAnimal} />
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
      </div>
    </div>
  );
}

type DirectoryPicker = () => Promise<FileSystemDirectoryHandle>;

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

  function remember() {
    const now = new Date();
    writeLastBackup(now);
    setLastBackup(now);
  }

  async function download() {
    setBusy(true);
    try {
      const text = await serializePersonalLearningBackupFromDatabase();
      const url = URL.createObjectURL(
        new Blob([text], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lernraum-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      remember();
      setMessage({ tone: "good", text: "Sicherungsdatei wurde erstellt." });
    } catch {
      setMessage({
        tone: "bad",
        text: "Die Sicherung konnte nicht erstellt werden.",
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
        tone: "good",
        text: `Gesichert als ${result.filename}.`,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage({
        tone: "bad",
        text:
          error instanceof Error
            ? error.message
            : "Die Sicherung konnte nicht gespeichert werden.",
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
      const backup = await readPersonalBackupFile(file);
      const result = await restorePersonalLearningBackup(backup);
      setMessage({
        tone: result.conflicts.length ? "bad" : "good",
        text: `Wiederhergestellt: ${result.added} neu, ${result.updated} aktualisiert, ${result.unchanged} unverändert${result.conflicts.length ? `, ${result.conflicts.length} Konflikte blieben unverändert` : ""}.`,
      });
    } catch (error) {
      setMessage({
        tone: "bad",
        text:
          error instanceof Error
            ? error.message
            : "Diese Datei ist keine gültige Lernraum-Sicherung.",
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
      <p className="ui-tiny ui-muted">
        Die Datei enthält LernBox, Lernwörter, Tipptraining und Lernverlauf.
        Beim Laden werden vorhandene Daten ergänzt, nicht gelöscht.
      </p>
    </section>
  );
}
