"use client";

import { useState } from "react";
import { QrCodeScanner } from "../../../ui/qr-scanner";
import { groupCode } from "./format";
import { Modal } from "./modal";
import type { LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

export function CodeSheet(props: LernBoxScreenProps) {
  const [code, setCode] = useState("");
  const [tag, setTag] = useState("");
  const { transfer } = props;
  return (
    <Modal title="Code eingeben" onClose={props.onCloseSheet}>
      <form
        className={styles.sheetForm}
        onSubmit={(event) => {
          event.preventDefault();
          props.onTransferCode?.(code, tag.trim());
        }}
      >
        <p className={styles.sheetText}>
          Tippe den Code von der Tafel oder vom Arbeitsblatt ein, oder scanne
          den QR-Code mit der Kamera.
        </p>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Tag für diese Vokabeln</span>
          <input
            className={styles.input}
            placeholder="z. B. Unit 3 (leer = ohne Tag)"
            maxLength={40}
            autoComplete="off"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
          />
        </label>
        <div className={styles.codeBox}>
          <input
            className={styles.codeInput}
            aria-label="Code"
            aria-invalid={Boolean(transfer.error)}
            placeholder="····"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={groupCode(code)}
            onChange={(event) =>
              setCode(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 24),
              )
            }
          />
          <QrCodeScanner
            onResult={(value) => props.onTransferQr?.(value, tag.trim())}
            buttonClassName={styles.scanButton ?? ""}
            iconSize={24}
            iconStrokeWidth={2.2}
          />
        </div>
        {transfer.error ? (
          <p className={styles.codeError} role="alert">
            {transfer.error}
          </p>
        ) : null}
        {transfer.success ? (
          <div className={styles.found} role="status">
            <strong>{transfer.success.title}</strong>
            <span>
              {transfer.success.added} neu · {transfer.success.reused} schon
              vorhanden
            </span>
          </div>
        ) : null}
        <button
          type="submit"
          className={styles.cta}
          disabled={code.length !== 24 || transfer.busy}
        >
          {transfer.busy ? "Übernimmt …" : "Stapel hinzufügen"}
        </button>
      </form>
    </Modal>
  );
}
