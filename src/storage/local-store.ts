import { LOCAL_DATA_AREAS, type LocalDataArea } from "./local-data-boundaries";

/**
 * Synchroner JSON-Speicher auf localStorage, strikt je Datenbereich getrennt
 * (persönlich / Klasse / Lehrer). Liest nie bereichsübergreifend.
 * Fehlt localStorage (SSR, privater Modus, blockiert), bleibt alles im Speicher.
 */

type Listener = () => void;

const memory = new Map<string, string>();
const listeners = new Map<string, Set<Listener>>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function storageKey(area: LocalDataArea, key: string): string {
  return `${LOCAL_DATA_AREAS[area]}:${key}`;
}

function readRaw(full: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage.getItem(full);
  } catch {
    /* Speicher blockiert: auf Arbeitsspeicher ausweichen */
  }
  return memory.get(full) ?? null;
}

function writeRaw(full: string, raw: string | null): void {
  if (raw === null) memory.delete(full); else memory.set(full, raw);
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      if (raw === null) window.localStorage.removeItem(full); else window.localStorage.setItem(full, raw);
    }
  } catch {
    /* ignorieren: Wert bleibt im Arbeitsspeicher */
  }
}

export function readValue<T>(area: LocalDataArea, key: string, fallback: T): T {
  const full = storageKey(area, key);
  const raw = readRaw(full);
  const hit = cache.get(full);
  if (hit && hit.raw === raw) return (raw === null ? fallback : hit.value) as T;
  let value: unknown = fallback;
  if (raw !== null) {
    try { value = JSON.parse(raw); } catch { value = fallback; }
  }
  cache.set(full, { raw, value });
  return (raw === null ? fallback : value) as T;
}

export function writeValue<T>(area: LocalDataArea, key: string, value: T | ((prev: T) => T), fallback?: T): void {
  const full = storageKey(area, key);
  const next = typeof value === "function" ? (value as (p: T) => T)(readValue(area, key, fallback as T)) : value;
  const raw = next === undefined ? null : JSON.stringify(next);
  writeRaw(full, raw);
  cache.set(full, { raw, value: next });
  listeners.get(full)?.forEach((l) => l());
}

export function removeValue(area: LocalDataArea, key: string): void {
  writeValue(area, key, undefined as unknown);
}

export function subscribe(area: LocalDataArea, key: string, listener: Listener): () => void {
  const full = storageKey(area, key);
  if (!listeners.has(full)) listeners.set(full, new Set());
  listeners.get(full)!.add(listener);
  const onStorage = (e: StorageEvent) => { if (e.key === full) listener(); };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.get(full)?.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/** Vollständiger Export eines Bereichs (Konzept 14: Datei-Export und Wiederherstellung). */
export function exportArea(area: LocalDataArea): Record<string, unknown> {
  const prefix = `${LOCAL_DATA_AREAS[area]}:`;
  const out: Record<string, unknown> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(prefix)) out[k.slice(prefix.length)] = JSON.parse(window.localStorage.getItem(k) ?? "null");
    }
  } catch {
    memory.forEach((raw, k) => { if (k.startsWith(prefix)) out[k.slice(prefix.length)] = JSON.parse(raw); });
  }
  return out;
}

export function importArea(area: LocalDataArea, data: Record<string, unknown>): void {
  Object.entries(data).forEach(([k, v]) => writeValue(area, k, v));
}
