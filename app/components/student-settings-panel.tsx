"use client";

import Link from "next/link";
import { useState } from "react";

type ThemePreference = "system" | "light" | "dark";

const THEME_OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
];

function readPreference(): ThemePreference {
  const value = window.localStorage.getItem("theme-preference");
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

export function StudentSettingsPanel() {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    typeof window === "undefined" ? "system" : readPreference(),
  );

  function updatePreference(next: ThemePreference) {
    setPreference(next);
    window.localStorage.setItem("theme-preference", next);
    window.dispatchEvent(new Event("lernraum-theme-change"));
  }

  return (
    <div className="student-settings-grid">
      <section
        className="student-settings-panel"
        aria-labelledby="appearance-title"
      >
        <div className="student-settings-panel__heading">
          <div>
            <p className="eyebrow">Darstellung</p>
            <h2 id="appearance-title">So fühlt sich dein Lernraum an.</h2>
          </div>
          <span className="student-settings-panel__mark" aria-hidden="true">
            Aa
          </span>
        </div>
        <fieldset className="student-settings-options">
          <legend>Farbschema</legend>
          {THEME_OPTIONS.map((option) => (
            <label key={option.value}>
              <input
                checked={preference === option.value}
                name="theme-preference"
                onChange={() => updatePreference(option.value)}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
        <p className="student-settings-panel__hint">
          Deine Wahl wird nur auf diesem Gerät gespeichert.
        </p>
      </section>

      <section
        className="student-settings-panel student-settings-panel--quiet"
        aria-labelledby="profile-title"
      >
        <p className="eyebrow">Dein Profil</p>
        <h2 id="profile-title">Mach den Einstieg zu deinem.</h2>
        <p>
          Wähle dein Profil-Tier für gemeinsame Runden. Name und Lernstand
          bleiben lokal auf diesem Gerät.
        </p>
        <button
          className="button button--secondary"
          onClick={() =>
            window.dispatchEvent(new Event("lernraum-open-profile"))
          }
          type="button"
        >
          Profil-Tier auswählen
        </button>
      </section>

      <section
        className="student-settings-links"
        aria-labelledby="privacy-title"
      >
        <div>
          <p className="eyebrow">Lokaler Lernstand</p>
          <h2 id="privacy-title">Du behältst den Überblick.</h2>
          <p>
            Fälligkeiten, Fehler und Fortschritt werden auf deinem Gerät
            verarbeitet.
          </p>
        </div>
        <nav aria-label="Persönliche Lernbereiche">
          <Link href="/lernen/material">Meine Inhalte</Link>
          <Link href="/lernen/fortschritt">Mein Fortschritt</Link>
          <Link href="/datenschutz">Mehr über Datenschutz</Link>
        </nav>
      </section>
    </div>
  );
}
