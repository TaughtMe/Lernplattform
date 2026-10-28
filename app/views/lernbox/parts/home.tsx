"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../../ui/icons";
import { cx } from "../../parts/parts";
import { BoxChart } from "./box-chart";
import { DeckGrid } from "./deck-grid";
import { plural } from "./format";
import type { LbSheet, LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

export function Home(props: LernBoxScreenProps) {
  const { decks } = props;
  const total = decks.reduce((sum, deck) => sum + deck.total, 0);
  const longUnpracticed = decks.reduce(
    (sum, deck) => sum + deck.longUnpracticed,
    0,
  );
  const dueDecks =
    props.todayDecks ?? decks.filter((deck) => deck.state !== "done").length;
  const loose = decks.filter((deck) => !deck.folderId);
  const start = (scope: string) =>
    props.onOpenSheet?.({ kind: "start", scope });
  return (
    <div className={styles.home}>
      <header className={styles.homeHead}>
        <h1 className={styles.homeTitle}>LernBox</h1>
        <span className={styles.spacer} />
        <EditButton onClick={props.onEdit} />
        <PlusMenu {...props} />
      </header>

      {props.notice ? (
        <p className={styles.notice} role="status">
          {props.notice}
        </p>
      ) : null}

      {props.resumeOffer}

      <div className={styles.overview}>
        <section className={styles.hero} aria-label="Heute dran">
          <span className={styles.heroLabel}>Heute dran</span>
          <span className={styles.heroCount}>
            <strong>{props.dueTotal}</strong>
            <span>
              {props.dueTotal === 0
                ? "Heute ist alles geschafft"
                : `${props.dueTotal === 1 ? "Vokabel" : "Vokabeln"} aus ${plural(dueDecks, "Stapel", "Stapeln")}`}
            </span>
          </span>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.heroStart}
              disabled={props.dueTotal === 0}
              onClick={() => start("heute")}
            >
              Jetzt üben
            </button>
            <button
              type="button"
              className={cx(styles.heroErrors, styles.wideOnly)}
              disabled={props.errorCount === 0}
              onClick={() => start("errors")}
            >
              Meine Fehler
              <span className={styles.errorPill}>{props.errorCount}</span>
            </button>
          </div>
        </section>
        <section className={styles.chart} aria-label="Verteilung auf die Boxen">
          <span className={styles.chartHead}>
            <strong>Wo liegen meine Vokabeln?</strong>
            <span className={styles.muted}>{total} insgesamt</span>
          </span>
          <BoxChart decks={decks} onPick={(box) => start(`box:${box}`)} />
          {longUnpracticed > 0 ? (
            <p className={styles.muted}>
              {longUnpracticed} lange nicht geübt (seit 14 Tagen oder mehr)
            </p>
          ) : null}
          <p className={styles.muted}>
            Tippe auf eine Box, um nur ihre Vokabeln zu üben. Sie wandern dabei
            nicht weiter.
          </p>
        </section>
      </div>

      <section className={styles.stacks} aria-labelledby="lb-stacks">
        <span className={styles.stacksHead}>
          <h2 id="lb-stacks" className={styles.stacksTitle}>
            Meine Stapel
          </h2>
          <span className={cx(styles.muted, styles.narrowOnly)}>
            {plural(total, "Vokabel", "Vokabeln")}
          </span>
        </span>
        {props.loading ? (
          <p className={styles.muted}>LernBox wird geladen …</p>
        ) : (
          <>
            {decks.length === 0 ? (
              <p className={styles.empty}>
                Noch keine Stapel. Lege mit „Neuer Stapel“ deinen ersten an.
              </p>
            ) : null}
            <DeckGrid
              decks={loose}
              onStart={start}
              onNew={() => props.onOpenSheet?.({ kind: "deck" })}
            />
            {props.folders.map((folder) => {
              const inside = decks.filter(
                (deck) => deck.folderId === folder.id,
              );
              return inside.length ? (
                <div key={folder.id} className={styles.folder}>
                  <h3 className={styles.folderTitle}>{folder.title}</h3>
                  <DeckGrid decks={inside} onStart={start} />
                </div>
              ) : null;
            })}
          </>
        )}
      </section>

      <button
        type="button"
        className={cx(styles.errorRow, styles.narrowOnly)}
        disabled={props.errorCount === 0}
        onClick={() => start("errors")}
      >
        <span>Meine Fehler üben</span>
        <span className={styles.errorPill}>{props.errorCount}</span>
      </button>
    </div>
  );
}

function EditButton({ onClick }: { onClick: (() => void) | undefined }) {
  return (
    <button
      type="button"
      className={styles.editButton}
      aria-label="Bearbeiten"
      onClick={onClick}
    >
      <Icon name="pencil" size={18} strokeWidth={2.2} />
      <span className={styles.wideOnly}>Bearbeiten</span>
    </button>
  );
}

export function PlusMenu(props: LernBoxScreenProps) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const items: ReadonlyArray<{
    sheet: LbSheet;
    title: string;
    text: string;
    icon: ReactNode;
  }> = [
    {
      sheet: { kind: "manual" },
      title: "Selbst eintragen",
      text: "Wort und Übersetzung tippen",
      icon: <Icon name="pencil" size={20} strokeWidth={2.2} />,
    },
    {
      sheet: { kind: "import" },
      title: "Viele einfügen",
      text: "Liste einfügen oder Datei wählen",
      icon: <Icon name="upload" size={20} strokeWidth={2.2} />,
    },
    {
      sheet: { kind: "code" },
      title: "Code eingeben",
      text: "Stapel von deiner Lehrkraft holen",
      icon: <CodeIcon />,
    },
  ];
  return (
    <div className={styles.plusWrap} ref={box}>
      <button
        type="button"
        className={styles.plus}
        aria-label="Vokabeln hinzufügen"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Hinzufügen"
        onClick={() => setOpen(!open)}
      >
        <Icon name="plus" size={24} strokeWidth={2.4} />
      </button>
      {open ? (
        <div className={styles.menu} role="menu" aria-label="Hinzufügen">
          {items.map((item) => (
            <button
              key={item.sheet.kind}
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                setOpen(false);
                props.onOpenSheet?.(item.sheet);
              }}
            >
              <span className={styles.menuIcon}>{item.icon}</span>
              <span className={styles.menuText}>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CodeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="M7.5 12h.01M12 12h.01M16.5 12h.01" />
    </svg>
  );
}
