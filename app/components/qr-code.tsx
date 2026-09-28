"use client";

import qrcode from "qrcode-generator";
import { useMemo } from "react";

/** QR-Code als SVG, vollständig im Browser erzeugt (keine externen Dienste). */
export function QrCode({ value, size = 200, label }: { value: string; size?: number; label: string }) {
  const { cells, n } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    const list: [number, number][] = [];
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) list.push([c, r]);
    return { cells: list, n: count };
  }, [value]);
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox={`-2 -2 ${n + 4} ${n + 4}`} shapeRendering="crispEdges" style={{ background: "#fff", borderRadius: 12 }}>
      <path d={cells.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join("")} fill="#211f1b" />
    </svg>
  );
}
