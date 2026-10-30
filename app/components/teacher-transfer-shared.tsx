"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState, type ReactNode } from "react";
import {
  readActiveTransfers,
  transferTimeLeft,
  type ActiveTransfer,
} from "../lehrer/material/active-transfers";
import { TransferBig, TransferResult } from "../views/lehrer/transfer-screen";

/** Gemeinsame Bausteine der Freigabe: Uhr der laufenden Freigaben und QR-Anzeige. */

export function formatTransferCode(value: string) {
  return value.match(/.{1,4}/g)?.join(" ") ?? value;
}

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });

/** Laufende Freigaben und ihre Restzeit; die Uhr läuft halbminütlich. */
export function useTransferClock() {
  const [transfers, setTransfers] = useState<ActiveTransfer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => {
      const time = Date.now();
      setNow(time);
      setTransfers(readActiveTransfers(time));
    };
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return { transfers, setTransfers, now, setNow };
}

export type TransferClock = ReturnType<typeof useTransferClock>;

/** QR-Kasten mit Code und „Groß zeigen“ für eine laufende Freigabe. */
export function LiveTransferQr({
  live,
  now,
  link,
  qrLabel,
  hint,
  big,
  onBig,
}: {
  live: ActiveTransfer;
  now: number;
  /** Adresse im QR-Code. */
  link: string;
  qrLabel: string;
  hint?: string;
  big: boolean;
  onBig: (open: boolean) => void;
}): ReactNode {
  const time = transferTimeLeft(live, now);
  return (
    <>
      <TransferResult
        qr={
          <QRCodeSVG
            value={link}
            size={184}
            level="M"
            marginSize={0}
            role="img"
            aria-label={qrLabel}
          />
        }
        status={`${time.short} · ${time.until}`}
        code={formatTransferCode(live.code)}
        {...(hint ? { hint } : {})}
        onBig={() => onBig(true)}
      />
      <TransferBig
        open={big}
        title={live.title}
        code={formatTransferCode(live.code)}
        qr={
          <QRCodeSVG
            value={link}
            size={460}
            level="M"
            marginSize={0}
            role="img"
            aria-label={`QR-Code für ${live.title}, groß`}
          />
        }
        onClose={() => onBig(false)}
      />
    </>
  );
}
