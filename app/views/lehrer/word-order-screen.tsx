"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useId } from "react";
import { Button, Card, Notice } from "../../ui/primitives";
import { cx } from "../parts/parts";
import { ManagePage, manageStyles as m } from "./manage-parts";

/**
 * Wortauftrag (D4): Die Lehrkraft schreibt Wörter auf, bekommt einen QR-Code
 * und druckt Kärtchen. Reine Darstellung: Texte, Prüfergebnisse und Aktionen
 * kommen als Props. Im Code stehen nur Titel und Wörter.
 */

/** Fehlerkorrektur „M“: Die Längengrenze in `practice-bridge.ts` rechnet damit. */
const QR_LEVEL = "M";
const QR_SIZE = { screen: 200, card: 170 } as const;

export type WordOrderView = {
  id: string;
  /** Eingabe im Titelfeld (kann leer sein). */
  titleInput: string;
  /** Eingabe im Wortfeld. */
  textInput: string;
  /** Erkannte Wörter für die Vorschau. */
  words: readonly string[];
  /** Doppelte oder unbrauchbare Einträge. */
  ignored: number;
  /** Gültiger Link; fehlt, solange der Auftrag nicht stimmt. */
  link?: string | undefined;
  /** Titel, wie er im Link steht. */
  title?: string | undefined;
  /** Hinweis, warum noch kein Code entsteht. */
  problem?: string | undefined;
};

const wordCount = (count: number) =>
  count === 1 ? "1 Wort" : `${count} Wörter`;

function OrderCard({
  order,
  index,
  titleMax,
  canRemove,
  copy,
  onTitle,
  onText,
  onCopy,
  onRemove,
}: {
  order: WordOrderView;
  index: number;
  titleMax: number;
  canRemove: boolean;
  copy: "copied" | "failed" | undefined;
  onTitle: (value: string) => void;
  onText: (value: string) => void;
  onCopy: () => void;
  onRemove: () => void;
}) {
  const id = useId();
  const heading = `Auftrag ${index + 1}`;
  return (
    <Card aria-labelledby={`${id}-heading`} className="ui-stack">
      <div className="ui-between ui-wrap">
        <h2 className="ui-h-section" id={`${id}-heading`}>
          {heading}
        </h2>
        {canRemove ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${heading} entfernen`}
            onClick={onRemove}
          >
            Entfernen
          </Button>
        ) : null}
      </div>
      <label className="ui-labeled">
        Titel (darf leer bleiben)
        <input
          className="ui-input"
          value={order.titleInput}
          maxLength={titleMax}
          placeholder="z. B. Gruppe A"
          autoComplete="off"
          onChange={(event) => onTitle(event.target.value)}
        />
      </label>
      <label className="ui-labeled">
        Wörter
        <textarea
          className="ui-textarea"
          rows={5}
          value={order.textInput}
          aria-describedby={`${id}-hint`}
          onChange={(event) => onText(event.target.value)}
        />
      </label>
      <p className="ui-small ui-muted" id={`${id}-hint`}>
        Ein Wort pro Zeile oder mit Komma getrennt.
      </p>

      <div className="ui-stack" style={{ ["--gap" as string]: "6px" }}>
        <p className="ui-label">
          Erkannte Wörter: {wordCount(order.words.length)}
        </p>
        {order.words.length > 0 ? (
          <ul
            className="ui-row ui-wrap"
            style={{
              ["--gap" as string]: "6px",
              listStyle: "none",
              padding: 0,
            }}
            aria-label={`Erkannte Wörter, ${heading}`}
          >
            {order.words.map((word) => (
              <li key={word} className="ui-chip">
                {word}
              </li>
            ))}
          </ul>
        ) : null}
        {order.ignored > 0 ? (
          <p className="ui-small ui-muted">
            {order.ignored === 1
              ? "1 Eintrag wurde ausgelassen (doppelt oder nicht erlaubt)."
              : `${order.ignored} Einträge wurden ausgelassen (doppelt oder nicht erlaubt).`}
          </p>
        ) : null}
      </div>

      <div role="status">
        {order.problem ? <Notice tone="bad">{order.problem}</Notice> : null}
      </div>

      {order.link ? (
        <div className="ui-stack">
          <QRCodeSVG
            value={order.link}
            size={QR_SIZE.screen}
            level={QR_LEVEL}
            role="img"
            aria-label={`QR-Code für ${order.title ?? heading}`}
          />
          <label className="ui-labeled">
            Link
            <input
              className="ui-input"
              readOnly
              value={order.link}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <div className="ui-row ui-wrap">
            <Button variant="soft" onClick={onCopy}>
              Link kopieren
            </Button>
          </div>
          <div role="status">
            {copy === "copied" ? (
              <Notice tone="good">Der Link ist kopiert.</Notice>
            ) : null}
            {copy === "failed" ? (
              <Notice tone="bad">
                Kopieren hat nicht geklappt. Markiere den Link und kopiere ihn
                von Hand.
              </Notice>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function WordOrderScreen({
  orders,
  titleMax,
  maxOrders,
  copy,
  sheetOpen,
  copies,
  copiesOptions,
  onTitle,
  onText,
  onAdd,
  onRemove,
  onCopy,
  onOpenSheet,
  onCloseSheet,
  onCopies,
  onPrint,
}: {
  orders: readonly WordOrderView[];
  titleMax: number;
  maxOrders: number;
  /** Ergebnis des letzten Kopierens, je Auftrag. */
  copy: { id: string; result: "copied" | "failed" } | undefined;
  /** Druckansicht statt Eingabe. */
  sheetOpen: boolean;
  /** Kärtchen je Auftrag in der Druckansicht. */
  copies: number;
  copiesOptions: readonly number[];
  onTitle: (id: string, value: string) => void;
  onText: (id: string, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onCopy: (id: string) => void;
  onOpenSheet: () => void;
  onCloseSheet: () => void;
  onCopies: (value: number) => void;
  onPrint: () => void;
}) {
  const ready = orders.filter((order) => order.link);

  if (sheetOpen) {
    return (
      <div className={cx(m.page, "ui")}>
        <section
          className="ui-stack ui-qr-sheet"
          aria-labelledby="word-order-sheet-title"
        >
          <div className="ui-between ui-wrap ui-print-hidden">
            <div className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
              <p className="ui-eyebrow">Wortauftrag</p>
              <h1 id="word-order-sheet-title" className="ui-h-page">
                Kärtchen drucken
              </h1>
              <p className="ui-small ui-muted">
                {ready.length === 1 ? "1 Auftrag" : `${ready.length} Aufträge`},{" "}
                {copies === 1 ? "1 Kärtchen" : `${copies} Kärtchen`} je Auftrag
              </p>
            </div>
            <div className="ui-row ui-wrap">
              <label className="ui-row" style={{ ["--gap" as string]: "6px" }}>
                <span className="ui-small">Kärtchen je Auftrag</span>
                <select
                  className="ui-input"
                  style={{ width: "auto" }}
                  value={copies}
                  onChange={(event) => onCopies(Number(event.target.value))}
                >
                  {copiesOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <Button variant="ghost" onClick={onCloseSheet}>
                Zurück zu den Aufträgen
              </Button>
              <Button onClick={onPrint}>Drucken oder als PDF speichern</Button>
            </div>
          </div>
          <div className="ui-qr-sheet__grid">
            {ready.flatMap((order) =>
              Array.from({ length: copies }, (_, copyIndex) => (
                <figure
                  key={`${order.id}-${copyIndex}`}
                  className="ui-qr-sheet__card"
                >
                  <strong>{order.title}</strong>
                  <QRCodeSVG
                    value={order.link ?? ""}
                    size={QR_SIZE.card}
                    level={QR_LEVEL}
                    role="img"
                    aria-label={`QR-Code für ${order.title}`}
                  />
                  <figcaption>
                    {wordCount(order.words.length)}. Scanne den Code.
                  </figcaption>
                </figure>
              )),
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <ManagePage
      title="Wortauftrag"
      lead="Schreibe Wörter auf. Die Kinder scannen den Code und holen sich die Wörter in ihren Wortspeicher."
      action={
        <Link href="/lehrer/material" className={m.soft}>
          Zurück zur Freigabe
        </Link>
      }
    >
      <div className="ui">
        <div className="ui-stack">
          <p className="ui-small ui-muted">
            Im Code stehen nur der Titel und die Wörter, keine Namen. Die Kinder
            bestätigen selbst, bevor etwas gespeichert wird. Die Aufträge
            bleiben nicht erhalten, wenn du die Seite schließt.
          </p>
          {orders.map((order, index) => (
            <OrderCard
              key={order.id}
              order={order}
              index={index}
              titleMax={titleMax}
              canRemove={orders.length > 1}
              copy={copy?.id === order.id ? copy.result : undefined}
              onTitle={(value) => onTitle(order.id, value)}
              onText={(value) => onText(order.id, value)}
              onCopy={() => onCopy(order.id)}
              onRemove={() => onRemove(order.id)}
            />
          ))}
          <div className="ui-row ui-wrap">
            <Button
              variant="soft"
              disabled={orders.length >= maxOrders}
              onClick={onAdd}
            >
              Weiteren Auftrag hinzufügen
            </Button>
            <Button disabled={ready.length === 0} onClick={onOpenSheet}>
              Kärtchen drucken
            </Button>
          </div>
        </div>
      </div>
    </ManagePage>
  );
}
