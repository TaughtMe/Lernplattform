// Thin wrapper around the duell_* RPC functions in
// supabase/migrations/20260821090000_duells.sql — same shape and retry
// pattern as ../laufdiktat/room-api.ts, but for peer-to-peer Duelle instead
// of teacher-run Laufdiktat-Räume (see file header of the migration for the
// security model: hashed per-device participant tokens, RLS deny-by-default,
// everything routed through SECURITY DEFINER RPCs).

import { supabase } from "../laufdiktat/supabase-client.ts";
import type { DuellArt, DuellWord } from "./duell-content.ts";
import type { DuellRoundResult } from "./duell-scoring.ts";
import type { RemoteDuellCandidate } from "./duell-vocab-bridge.ts";

async function withRetry<T>(fn: () => Promise<T>, attempts = 2, delayMs = 400): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastErr;
}

export interface OpenedDuell {
  duellId: string;
  code: string;
  participantToken: string;
}

export async function openDuell(art: DuellArt, alias: string, roundSize?: number): Promise<OpenedDuell> {
  const { data, error } = await supabase.rpc("open_duell_secure", { p_art: art, p_alias: alias, p_round_size: roundSize ?? null });
  const row = data?.[0];
  if (error || !row) throw new Error(error?.message ?? "open_duell_secure() returned no data");
  return { duellId: row.duell_id, code: row.code, participantToken: row.participant_token };
}

export interface JoinedDuell {
  duellId: string;
  status: "lobby" | "live" | "ended";
  art: DuellArt;
  assignedAlias: string;
  joinOrder: number;
  participantToken: string;
}

export async function joinDuell(code: string, alias: string, existingParticipantToken?: string): Promise<JoinedDuell | null> {
  return withRetry(async () => {
    const { data, error } = await supabase.rpc("join_duell_secure", {
      p_code: code,
      p_alias: alias,
      p_participant_token: existingParticipantToken ?? null,
    });
    if (error) throw new Error(error.message);
    const row = data?.[0];
    if (!row) return null;
    return {
      duellId: row.duell_id,
      status: row.status,
      art: row.art,
      assignedAlias: row.assigned_alias,
      joinOrder: row.join_order,
      participantToken: row.participant_token,
    };
  });
}

export interface DuellState {
  status: "lobby" | "live" | "ended";
  art: DuellArt;
  roundSize: number;
  content: DuellWord[] | null;
}

export async function getDuellState(duellId: string, participantToken: string): Promise<DuellState | null> {
  const { data, error } = await supabase.rpc("get_duell_state_secure", { p_duell_id: duellId, p_participant_token: participantToken });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return { status: row.status, art: row.art, roundSize: row.round_size, content: row.content };
}

export interface DuellParticipantRow {
  alias: string;
  joinOrder: number;
}

export async function listDuellParticipants(duellId: string, participantToken: string): Promise<DuellParticipantRow[]> {
  const { data, error } = await supabase.rpc("list_duell_participants_secure", { p_duell_id: duellId, p_participant_token: participantToken });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({ alias: row.alias as string, joinOrder: row.join_order as number }));
}

/** Legt die eigene (kompakt zusammengefasste) Wortübersicht ab — Grundlage für die Inhalts-Zusammenstellung über den eigenen Wortschatz hinaus. */
export async function submitDuellCandidates(duellId: string, participantToken: string, candidates: RemoteDuellCandidate[]): Promise<void> {
  const { error } = await supabase.rpc("submit_duell_candidates_secure", { p_duell_id: duellId, p_participant_token: participantToken, p_candidates: candidates });
  if (error) throw new Error(error.message);
}

export interface DuellCandidatePoolRow {
  joinOrder: number;
  candidates: RemoteDuellCandidate[];
}

/** Alle bisher eingereichten Wortübersichten, geordnet nach Beitrittsreihenfolge — Grundlage für die Inhalts-Zusammenstellung durch die/den Ersteller:in. */
export async function listDuellCandidatePools(duellId: string, participantToken: string): Promise<DuellCandidatePoolRow[]> {
  const { data, error } = await supabase.rpc("list_duell_candidate_pools_secure", { p_duell_id: duellId, p_participant_token: participantToken });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({ joinOrder: row.join_order as number, candidates: row.candidates as RemoteDuellCandidate[] }));
}

/** Nur die/der Ersteller:in (join_order 0) darf das erfolgreich aufrufen — siehe Migration. */
export async function submitDuellContent(duellId: string, participantToken: string, content: DuellWord[]): Promise<void> {
  const { error } = await supabase.rpc("submit_duell_content_secure", { p_duell_id: duellId, p_participant_token: participantToken, p_content: content });
  if (error) throw new Error(error.message);
}

export async function submitDuellResult(duellId: string, participantToken: string, round: DuellRoundResult): Promise<void> {
  const { error } = await supabase.rpc("submit_duell_result_secure", {
    p_duell_id: duellId,
    p_participant_token: participantToken,
    p_word_results: round.wordResults,
    p_correct_count: round.correctCount,
    p_total_count: round.totalCount,
    p_accuracy: round.accuracy,
    p_total_time_ms: round.totalTimeMs,
  });
  if (error) throw new Error(error.message);
}

export interface DuellResultRow {
  alias: string;
  joinOrder: number;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  totalTimeMs: number;
  submittedAt: string;
}

/** Bereits nach Genauigkeit vor Zeit sortiert (siehe get_duell_results_secure) — lesbar, auch bevor alle abgegeben haben. */
export async function getDuellResults(duellId: string, participantToken: string): Promise<DuellResultRow[]> {
  const { data, error } = await supabase.rpc("get_duell_results_secure", { p_duell_id: duellId, p_participant_token: participantToken });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    alias: row.alias as string,
    joinOrder: row.join_order as number,
    correctCount: row.correct_count as number,
    totalCount: row.total_count as number,
    accuracy: row.accuracy as number,
    totalTimeMs: row.total_time_ms as number,
    submittedAt: row.submitted_at as string,
  }));
}
