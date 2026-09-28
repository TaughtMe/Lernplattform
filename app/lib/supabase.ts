import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase-Client für die Live-Räume (Laufdiktat). Konfiguration über
 * NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * (alternativ die VITE_-Namen aus dem Laufdiktat-Repo). Ohne Konfiguration
 * läuft der Lernraum weiter, nur die Live-Räume sind im Demo-Modus.
 *
 * Persönliche Lernstände werden NIE über Supabase übertragen (Entscheidungsprotokoll Nr. 2).
 */

function env(name: "URL" | "KEY"): string | undefined {
  try {
    if (name === "URL") {
      return (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined) ?? import.meta.env?.VITE_SUPABASE_URL;
    }
    return (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined)
      ?? import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env?.VITE_SUPABASE_ANON_KEY;
  } catch {
    return undefined;
  }
}

const url = env("URL");
const key = env("KEY");

export const isSupabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!isSupabaseConfigured) throw new Error("Supabase ist nicht konfiguriert.");
  if (!client) {
    client = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: {
        // Heartbeat im Web Worker: wird im Hintergrund-Tab nicht gedrosselt (siehe Laufdiktat LESSONS.md).
        worker: typeof window !== "undefined" && typeof window.Worker !== "undefined",
        heartbeatIntervalMs: 15000,
      },
    });
  }
  return client;
}
