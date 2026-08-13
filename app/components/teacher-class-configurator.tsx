"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CLASS_MODULE_LABELS,
  type ClassModule,
} from "../../src/domain/class-workspace";
import { demoClass } from "../../src/domain/demo-class";
import {
  createTeacherClassSettingsRepository,
  toggleClassModule,
} from "../../src/storage/teacher-class-settings";

const moduleDescriptions: Record<ClassModule, string> = {
  vocabulary: "Vokabelpakete, Fälligkeiten und Wiederholungen",
  german: "Rechtschreibung, Lernwörter und Deutschmodule",
  mathematics: "Aufgabenfamilien und gezielte Wiederholungen",
  typing: "Tipptraining mit Genauigkeit vor Geschwindigkeit",
  "running-dictation": "Laufdiktate und Unterrichtsräume",
};

const buildModules: ClassModule[] = [
  "vocabulary",
  "german",
  "mathematics",
  "typing",
];

export function TeacherClassConfigurator() {
  const repository = useMemo(() => createTeacherClassSettingsRepository(), []);
  const [enabledModules, setEnabledModules] = useState<ClassModule[]>([
    ...demoClass.enabledModules,
  ]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    repository
      .get(demoClass.id)
      .then((settings) => {
        if (active && settings) setEnabledModules(settings.enabledModules);
      })
      .catch(() => {
        if (active)
          setMessage(
            "Die lokale Klassenkonfiguration konnte nicht geladen werden.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repository]);

  function changeModule(module: ClassModule) {
    setEnabledModules((current) => toggleClassModule(current, module));
    setSaved(false);
    setMessage("");
  }

  async function save() {
    setMessage("");
    try {
      await repository.put({
        id: demoClass.id,
        enabledModules,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
    } catch {
      setMessage(
        "Die Einstellung konnte auf diesem Gerät nicht gespeichert werden.",
      );
    }
  }

  return (
    <section className="teacher-workspace" aria-labelledby="teacher-title">
      <div className="teacher-heading">
        <div>
          <p className="eyebrow">Klassenverwaltung</p>
          <h1 id="teacher-title">{demoClass.name}</h1>
          <p>Lege fest, welche Lernbereiche in dieser Klasse verfügbar sind.</p>
        </div>
        <span className="teacher-local-note">Lokal auf diesem Lehrergerät</span>
      </div>

      <div className="teacher-layout">
        <section
          className="teacher-panel"
          aria-labelledby="module-settings-title"
        >
          <div className="teacher-panel__heading">
            <div>
              <p className="eyebrow">Sichtbarkeit</p>
              <h2 id="module-settings-title">Aktive Module</h2>
            </div>
            <span>{enabledModules.length} aktiv</span>
          </div>
          <div className="module-settings">
            {buildModules.map((module) => {
              const enabled = enabledModules.includes(module);
              const inputId = `class-module-${module}`;
              return (
                <div className="module-setting" key={module}>
                  <label htmlFor={inputId}>
                    <strong>{CLASS_MODULE_LABELS[module]}</strong>
                    <small>{moduleDescriptions[module]}</small>
                  </label>
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={enabled}
                    onChange={() => changeModule(module)}
                    disabled={
                      loading || (enabled && enabledModules.length === 1)
                    }
                  />
                </div>
              );
            })}
          </div>
          {message && (
            <p className="learning-message learning-message--error">
              {message}
            </p>
          )}
          <button
            className="button button--primary"
            onClick={save}
            disabled={loading}
          >
            {saved ? "Gespeichert" : "Einstellungen speichern"}
          </button>
        </section>

        <aside
          className="teacher-preview"
          aria-labelledby="student-preview-title"
        >
          <span className="entry-card__label">Schülervorschau</span>
          <h2 id="student-preview-title">In {demoClass.name} sichtbar</h2>
          <div className="preview-module-list">
            {buildModules.map((module) => (
              <div
                className={
                  enabledModules.includes(module) ? "is-enabled" : "is-disabled"
                }
                key={module}
              >
                <strong>{CLASS_MODULE_LABELS[module]}</strong>
                <span>
                  {enabledModules.includes(module) ? "Aktiv" : "Ausgeblendet"}
                </span>
              </div>
            ))}
          </div>
          <p>
            Die Veröffentlichung auf Schülergeräte wird im nächsten Schritt an
            Klassenpakete und Codes angebunden.
          </p>
        </aside>
      </div>

      <section
        className="teacher-impulse-builder"
        aria-labelledby="impulse-title"
      >
        <div className="teacher-panel__heading">
          <div>
            <p className="eyebrow">Lernimpulse statt Aufgabenplaner</p>
            <h2 id="impulse-title">Was soll die Klasse gezielt üben?</h2>
          </div>
          <span>Klassenpaket · Entwurf</span>
        </div>
        <div className="teacher-impulse-options">
          <article>
            <span>Deutsch</span>
            <h3>Lernwörter auswählen</h3>
            <p>Zum Beispiel Dehnungs-h mit 5, 10 oder 20 Wörtern.</p>
            {/* The client-component test runner does not provide next/link. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="button button--quiet" href="/frei/german/lernwoerter">
              Lernwörter ansehen
            </a>
          </article>
          <article>
            <span>Vokabeln</span>
            <h3>Unit oder Stapel freigeben</h3>
            <p>
              Vokabeln können anschließend in Laufdiktat und LernBox wirken.
            </p>
            <a className="button button--quiet" href="/lernbox">
              LernBox ansehen
            </a>
          </article>
          <article>
            <span>Kopfrechnen</span>
            <h3>Grundfertigkeit anstoßen</h3>
            <p>
              Eine Aufgabenfamilie wird geübt, nicht eine einzelne
              Fehleraufgabe.
            </p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="button button--quiet" href="/frei/mathematics">
              Kopfrechnen ansehen
            </a>
          </article>
        </div>
        <div className="teacher-publish-preview">
          <div>
            <strong>Klasse veröffentlichen</strong>
            <p>
              Aktive Module und Lernimpulse werden später als versioniertes
              Paket per QR-Code oder kurzlebigem Raumcode übertragen.
            </p>
          </div>
          <span>Keine Lernhistorie wird synchronisiert</span>
        </div>
      </section>
    </section>
  );
}
