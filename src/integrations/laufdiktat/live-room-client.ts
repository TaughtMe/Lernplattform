import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export type LiveRoomConfig = {
  url: string;
  publishableKey: string;
};

export function getLiveRoomClient(config: LiveRoomConfig): SupabaseClient {
  if (client) return client;

  client = createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    realtime: {
      heartbeatIntervalMs: 15_000,
      worker:
        typeof window !== "undefined" && typeof window.Worker !== "undefined",
    },
  });
  return client;
}
