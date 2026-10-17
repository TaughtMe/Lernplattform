"use client";

import { useState } from "react";
import { Icon } from "../../../ui/icons";
import { plural } from "./format";
import type { LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

/** Stapel, Ordner und Sicherung: bleiben erreichbar, auch wenn der Entwurf sie nicht zeigt. */
export function Manage(props: LernBoxScreenProps) {
  const [folderTitle, setFolderTitle] = useState("");
  return (
    <details className={styles.manage}>
      <summary>Stapel, Ordner und Sicherung</summary>
      <div className={styles.manageBody}>
        <ul className={styles.manageList}>
          {props.decks.map((deck) => (
            <li key={deck.id} className={styles.manageItem}>
              <span className={styles.manageName}>
                <strong>{deck.title}</strong>
                <span className={styles.muted}>
                  {plural(deck.total, "Vokabel", "Vokabeln")}
                </span>
              </span>
              {props.folders.length ? (
                <select
                  className={styles.select}
                  aria-label={`Ordner für ${deck.title}`}
                  value={deck.folderId ?? ""}
                  onChange={(event) =>
                    props.onMoveDeck?.(deck.id, event.target.value || null)
                  }
                >
                  <option value="">Ohne Ordner</option>
                  {props.folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.title}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                className={styles.ghostButton}
                aria-label={`${deck.title} löschen`}
                onClick={() => props.onDeleteDeck?.(deck.id)}
              >
                <Icon name="trash" size={15} /> Löschen
              </button>
            </li>
          ))}
        </ul>

        <ul className={styles.manageList}>
          {props.folders.map((folder) => (
            <li key={folder.id} className={styles.manageItem}>
              <span className={styles.manageName}>
                <strong>{folder.title}</strong>
                <span className={styles.muted}>Ordner</span>
              </span>
              <button
                type="button"
                className={styles.ghostButton}
                aria-label={`Ordner ${folder.title} löschen`}
                title="Ordner löschen (Stapel bleiben)"
                onClick={() => props.onDeleteFolder?.(folder.id)}
              >
                <Icon name="trash" size={15} /> Löschen
              </button>
            </li>
          ))}
        </ul>
        <form
          className={styles.inlineForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (!folderTitle.trim()) return;
            props.onCreateFolder?.(folderTitle.trim());
            setFolderTitle("");
          }}
        >
          <input
            className={styles.input}
            aria-label="Name des neuen Ordners"
            placeholder="z. B. Buch Klasse 5"
            maxLength={80}
            value={folderTitle}
            onChange={(event) => setFolderTitle(event.target.value)}
          />
          <button type="submit" className={styles.ghostButton}>
            Ordner anlegen
          </button>
        </form>

        <div className={styles.inlineForm}>
          <button
            type="button"
            className={styles.ghostButton}
            disabled={props.decks.length === 0}
            onClick={props.onExport}
          >
            <Icon name="download" size={15} /> Sicherung speichern
          </button>
          <label className={styles.fileButton}>
            <Icon name="upload" size={15} /> Sicherung laden
            <input
              type="file"
              accept="application/json"
              className={styles.fileInput}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) props.onImportBackup?.(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </details>
  );
}
