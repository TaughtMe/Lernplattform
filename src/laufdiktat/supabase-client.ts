import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * True once NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * are set (see .env.example). Until then, room features degrade gracefully
 * instead of crashing the app — check this before calling anything in
 * room-api.ts.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

const supportsWebWorker = typeof window !== "undefined" && typeof window.Worker !== "undefined";

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabasePublishableKey || "placeholder-publishable-key",
  {
    realtime: {
      // Runs the realtime heartbeat in a Web Worker so backgrounded tabs
      // (screen off, tab switched) don't get throttled into a dropped
      // connection — ported from TaughtMe/Laufdiktat, hard-won from real
      // classroom reconnect issues.
      worker: supportsWebWorker,
      heartbeatIntervalMs: 15000,
    },
  },
);
