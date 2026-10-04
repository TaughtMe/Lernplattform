"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { Icon } from "../../ui/icons";
import { Animal } from "../parts/parts";
import styles from "./landing-screen.module.css";

export type LandingScreenProps = {
  /** Tier aus dem Profil; vor dem Laden null. */
  animal: string | null;
  /** Raumcode aus bis zu vier Zeichen. */
  code: string;
  teacherHref: string;
  /** Ziel beim Tippen auf das Tier (eigener Lernraum). */
  enterHref: string;
  onCodeChange?: (code: string) => void;
  /** Kamera-Knopf; erhält die Klasse aus dem Entwurf. Ohne Angabe ein schlichter Knopf. */
  renderScan?: (className: string) => ReactNode;
  /** Knopf „Als App installieren“ unter dem Code; erhält die Klasse aus dem Entwurf. */
  renderInstall?: (className: string) => ReactNode;
  /** Zusätzliche Hinweise unter dem Code, z. B. Verbindungsstatus. */
  notice?: ReactNode;
  /** Rechtliche Links unter dem Hinweis (nur auf der echten Startseite). */
  showLegal?: boolean;
};

const CODE_LENGTH = 4;

/** Startseite nach Design 2a: ein Tier, ein Code, sonst nichts. */
export function LandingScreen({
  animal,
  code,
  teacherHref,
  enterHref,
  onCodeChange,
  renderScan,
  renderInstall,
  notice,
  showLegal = false,
}: LandingScreenProps) {
  const fields = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from(
    { length: CODE_LENGTH },
    (_, index) => code[index] ?? "",
  );

  function type(index: number, raw: string) {
    const char = raw
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(-1);
    const next = [...chars];
    next[index] = char;
    onCodeChange?.(next.join(""));
    if (char) fields.current[index + 1]?.focus();
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <span className={styles.brand}>Lernraum</span>
        <Link href={teacherHref} className={styles.teacher}>
          Lehrer-Login
        </Link>
      </header>

      <section className={styles.stage} aria-labelledby="landing-greeting">
        <Link
          href={enterHref}
          className={styles.disc}
          aria-labelledby="landing-greeting"
        >
          {animal ? (
            <Animal
              animal={animal}
              size={224}
              fluid
              className={styles.animal}
            />
          ) : null}
        </Link>
        <div className={styles.greeting}>
          <h1 id="landing-greeting" className={styles.greetingTitle}>
            {animal ? `Weiter als ${animal}` : "Dein Lernraum"}
          </h1>
          <p className={styles.greetingHint}>Tippen öffnet deinen Lernraum</p>
        </div>
      </section>

      <div className={styles.code} role="group" aria-labelledby="landing-code">
        <div className={styles.codeHead}>
          <span id="landing-code" className={styles.codeLabel}>
            Raumcode
          </span>
          <span className={styles.codeSource}>von der Tafel oder per QR</span>
        </div>
        <div className={styles.codeFields}>
          {chars.map((char, index) => (
            <input
              key={index}
              ref={(element) => {
                fields.current[index] = element;
              }}
              className={styles.codeField}
              value={char}
              onChange={(event) => type(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !char && index > 0) {
                  fields.current[index - 1]?.focus();
                }
              }}
              maxLength={2}
              autoComplete="off"
              autoCapitalize="characters"
              aria-label={`Raumcode Zeichen ${index + 1}`}
            />
          ))}
          {renderScan ? (
            renderScan(styles.scan)
          ) : (
            <button
              type="button"
              className={styles.scan}
              aria-label="Code mit Kamera scannen"
            >
              <Icon
                name="camera"
                size={30}
                strokeWidth={1.8}
                strokeLinejoin="miter"
              />
            </button>
          )}
        </div>
        {notice}
        {renderInstall?.(styles.install)}
        <p className={styles.note}>
          Ohne Konto · Tier änderst du später im Profil
        </p>
        {showLegal ? (
          <nav className={styles.legal} aria-label="Rechtliches">
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
          </nav>
        ) : null}
      </div>
    </main>
  );
}
