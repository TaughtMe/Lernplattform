"use client";

import { useMemo, useRef, useState } from "react";
import {
  buildWordOrderLink,
  ORDER_TITLE_MAX,
  readOrderWords,
} from "../../../../src/domain/practice-bridge";
import {
  WordOrderScreen,
  type WordOrderView,
} from "../../../views/lehrer/word-order-screen";

/** Mehr Gruppen passen kaum auf eine Seite; zugleich begrenzt es den Druck. */
const MAX_ORDERS = 8;
const COPIES_OPTIONS = [1, 2, 4, 6] as const;

type OrderInput = { id: string; title: string; text: string };

/**
 * Wortauftrag (D4, Lehrerbereich → Freigabe an Schüler): Wörter aufschreiben,
 * QR-Code und Link erzeugen, Kärtchen drucken. Die Aufträge leben nur im
 * Arbeitsspeicher der Seite; es gibt keine Schülerdaten und keine Speicherung.
 */
export function TeacherWordOrder() {
  const nextId = useRef(2);
  const [inputs, setInputs] = useState<OrderInput[]>([
    { id: "auftrag-1", title: "", text: "" },
  ]);
  const [copy, setCopy] = useState<{
    id: string;
    result: "copied" | "failed";
  }>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copies, setCopies] = useState(1);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const orders = useMemo<WordOrderView[]>(
    () =>
      inputs.map((input) => {
        const reading = readOrderWords(input.text);
        const built = buildWordOrderLink(
          { title: input.title, text: input.text },
          origin,
        );
        const base = {
          id: input.id,
          titleInput: input.title,
          textInput: input.text,
          words: reading.words,
          ignored: reading.ignored,
        };
        if (built.ok) {
          return { ...base, link: built.url, title: built.title };
        }
        // Solange noch nichts im Wortfeld steht, ist das kein Fehler.
        return input.text.trim() ? { ...base, problem: built.message } : base;
      }),
    [inputs, origin],
  );

  function change(id: string, patch: Partial<OrderInput>) {
    setCopy(undefined);
    setInputs((current) =>
      current.map((input) =>
        input.id === id ? { ...input, ...patch } : input,
      ),
    );
  }

  async function copyLink(id: string) {
    const link = orders.find((order) => order.id === id)?.link;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopy({ id, result: "copied" });
    } catch {
      setCopy({ id, result: "failed" });
    }
  }

  return (
    <WordOrderScreen
      orders={orders}
      titleMax={ORDER_TITLE_MAX}
      maxOrders={MAX_ORDERS}
      copy={copy}
      sheetOpen={sheetOpen}
      copies={copies}
      copiesOptions={COPIES_OPTIONS}
      onTitle={(id, title) => change(id, { title })}
      onText={(id, text) => change(id, { text })}
      onAdd={() => {
        const id = `auftrag-${nextId.current}`;
        nextId.current += 1;
        setInputs((current) =>
          current.length >= MAX_ORDERS
            ? current
            : [...current, { id, title: "", text: "" }],
        );
      }}
      onRemove={(id) => {
        setCopy(undefined);
        setInputs((current) =>
          current.length > 1
            ? current.filter((input) => input.id !== id)
            : current,
        );
      }}
      onCopy={(id) => void copyLink(id)}
      onOpenSheet={() => setSheetOpen(true)}
      onCloseSheet={() => setSheetOpen(false)}
      onCopies={setCopies}
      onPrint={() => window.print()}
    />
  );
}
