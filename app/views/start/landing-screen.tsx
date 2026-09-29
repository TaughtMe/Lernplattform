"use client";

import Link from "next/link";
import { useRef } from "react";
import { Icon } from "../../ui/icons";
import { Animal } from "../parts/parts";
import styles from "./landing-screen.module.css";

export type LandingScreenProps = {
  animal: string;
  /** Raumcode aus bis zu vier Zeichen. */
  code: string;
  teacherHref: string;
  onEnter?: () => void;
  onCodeChange?: (code: string) => void;
  onScan?: () => void;
};

const CODE_LENGTH = 4;

/** Startseite nach Design 2a: ein Tier, ein Code, sonst nichts. */
export function LandingScreen({
  animal,
  code,
  teacherHref,
  onEnter,
  onCodeChange,
  onScan,
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
        <button
          type="button"
          className={styles.disc}
          onClick={onEnter}
          aria-labelledby="landing-greeting"
        >
          <Animal
            animal={animal}
            size={224}
            label="Dein Tier"
            className={styles.animal}
          />
        </button>
        <div className={styles.greeting}>
          <h1 id="landing-greeting" className={styles.greetingTitle}>
            Weiter als {animal}
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
          <button
            type="button"
            className={styles.scan}
            aria-label="Code mit Kamera scannen"
            onClick={onScan}
          >
            <Icon
              name="camera"
              size={30}
              strokeWidth={1.8}
              strokeLinejoin="miter"
            />
          </button>
        </div>
        <p className={styles.note}>
          Ohne Konto · Tier änderst du später im Profil
        </p>
      </div>
    </main>
  );
}
