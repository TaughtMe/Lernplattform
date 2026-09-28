import type { CSSProperties } from "react";
import { animalName, animalSrc } from "@/src/domain/animals";

export function Animal({ id, size, className = "", style, label }: { id: string; size: number; className?: string; style?: CSSProperties; label?: string | false }) {
  return (
    <span
      className={`animal ${className}`}
      role={label === false ? undefined : "img"}
      aria-label={label === false ? undefined : label ?? animalName(id)}
      aria-hidden={label === false ? true : undefined}
      style={{ width: size, height: size, backgroundImage: `url('${animalSrc(id)}')`, ...style }}
    />
  );
}

/** Fortschrittsring um das Tier (Streak-Ring aus dem Schülerdashboard). */
export function ProgressRing({ size, stroke = 11, value, track = "var(--ring)", color = "var(--gold)" }: { size: number; stroke?: number; value: number; track?: string; color?: string }) {
  const r = size / 2 - stroke / 2 - 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg className="prog-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .6s" }} />
    </svg>
  );
}
