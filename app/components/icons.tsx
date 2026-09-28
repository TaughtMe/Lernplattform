import type { SVGProps } from "react";

/** Icons aus dem Lernraum-Design (Strichstärke 1.9, runde Enden). */
const PATHS = {
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></>,
  qr: <><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" /><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2" /><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2" /><path d="M14 14h2.5v2.5M20.5 14v6.5H14v-3" /></>,
  learn: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M8 9h8M8 13h5" /></>,
  room: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><path d="M14 17h6M17 14v6" /></>,
  duel: <><path d="M4 4.5h3l10.5 10.5" /><path d="M20 4.5h-3L6.5 15" /><path d="M14.5 17.5 18 21l3-3-3.5-3.5" /><path d="M9.5 17.5 6 21l-3-3 3.5-3.5" /></>,
  house: <><path d="M4 10.5 12 4l8 6.5V20H4z" /><path d="M9.5 20v-5h5v5" /></>,
  beamer: <><rect x="3" y="4.5" width="18" height="12" rx="2" /><path d="M8 20h8M12 16.5V20" /></>,
  back: <path d="M14.5 6l-6 6 6 6" />,
  forward: <path d="M9.5 6l6 6-6 6" />,
  flame: <path d="M12 2.5c1 3.6 5.2 5.7 5.2 10.4a5.2 5.2 0 0 1-10.4 0c0-2.3 1.2-3.8 2.5-4.8.2 1.7 1 2.7 2.2 3.1 0-3.3-.6-5.8.5-8.7z" fill="currentColor" stroke="none" />,
  star: <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="currentColor" stroke="none" />,
  pointer: <path d="M5 3.5l13 7-5.6 1.6L10 17.8z" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  enterBig: <path d="M6 3.5h14v17h-10v-8H6z" />,
  enterSmall: <rect x="3" y="8.5" width="18" height="7" rx="1.5" />,
  hand: <path d="M9 11V5a1.5 1.5 0 0 1 3 0v5M12 9.5a1.5 1.5 0 0 1 3 0V11M15 10.5a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-.5a5 5 0 0 1-4-2l-2.3-3.2a1.5 1.5 0 0 1 2.3-1.9L9 15" />,
  speaker: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
  run: <><circle cx="13.5" cy="4.5" r="1.8" /><path d="M8 21l3-6 3 2v4M11 15l1.5-6.5L9 10l-2 3M12.5 8.5l3 3 3.5.5" /></>,
  ear: <><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3.5" y="14" width="4" height="6" rx="1.5" /><rect x="16.5" y="14" width="4" height="6" rx="1.5" /></>,
  pin: <><path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0c0 5 6.5 11 6.5 11z" /><circle cx="12" cy="10" r="2.4" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  panelClose: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M9 4.5v15M15.5 10l-2 2 2 2" /></>,
  panelOpen: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M9 4.5v15M13.5 10l2 2-2 2" /></>,
  list: <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />,
  trash: <path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7" />,
  profile: <><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" /></>,
  bolt: <path d="M13 2 5.5 13H11l-1.5 9L18.5 10H13z" fill="currentColor" stroke="none" />,
  arrow: <path d="M5 12h12M12.5 7l5 5-5 5" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  play: <path d="M8 5.5 18.5 12 8 18.5z" fill="currentColor" stroke="none" />,
  text: <path d="M5.5 6h13M5.5 11h13M5.5 16h8" />,
  math: <><path d="M4.5 8h6M7.5 5v6" /><path d="M13.5 8h6" /><path d="M4.5 17h6M13.5 15.5h6M13.5 18.5h6" /></>,
  cards: <><rect x="3.5" y="5.5" width="7.5" height="13" rx="1.5" /><rect x="13" y="5.5" width="7.5" height="13" rx="1.5" /></>,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  content: <><path d="M4.5 5.5h15v13h-15z" /><path d="M8 9.5h8M8 13.5h5" /></>,
  chart: <><path d="M4.5 19.5h15" /><path d="M7 19.5v-7M12 19.5V6M17 19.5v-4.5" /></>,
  camera: <><rect x="2.5" y="6.5" width="19" height="14" rx="3.5" /><circle cx="12" cy="13.5" r="4" /><path d="M8.5 6.5 10 3.5h4l1.5 3" /></>,
  trophy: <><path d="M5 4v6a7 7 0 0 0 14 0V4" /><path d="M12 17v3M8.5 20.5h7" /></>,
  badge: <><circle cx="12" cy="9" r="5" /><path d="M9 13.5 7.5 21l4.5-2.5L16.5 21 15 13.5" /></>,
  keyboard: <><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><path d="M6 10h1M9.5 10h1M13 10h1M16.5 10h1M7.5 14h9" /></>,
  download: <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, strokeWidth = 1.9, ...rest }: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {PATHS[name]}
    </svg>
  );
}

/** Battle-Symbole (farbig). */
export function InkIcon({ size = 30 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true"><rect x="17" y="5" width="14" height="8" rx="2.5" fill="#211f1b" /><rect x="19.5" y="12" width="9" height="5" rx="1.5" fill="#6b6252" /><rect x="9" y="17" width="30" height="26" rx="7" fill="#9db7e6" /><path d="M9 30h30v6a7 7 0 0 1-7 7H16a7 7 0 0 1-7-7z" fill="#3b6fd1" /></svg>;
}
export function BoltIcon({ size = 30 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true"><path d="M29 4 13 27h9l-5 17 18-23h-9z" fill="#e0a83a" stroke="#7a5a12" strokeWidth="2.5" strokeLinejoin="round" /></svg>;
}
export function ShieldIcon({ size = 30 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4l17 5v13c0 11-7.5 17.5-17 22C14.5 39.5 7 33 7 22V9z" fill="#7a5a12" /><path d="M24 8.5 11 12.3V22c0 9 6 14.5 13 18z" fill="#c7674a" /><path d="M24 8.5 37 12.3V22c0 9-6 14.5-13 18z" fill="#f6e9cf" /></svg>;
}
