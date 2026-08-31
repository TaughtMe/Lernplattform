import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260831120000_gate_pilot_room_creation.sql",
  ),
  "utf8",
);

describe("Laufdiktat pilot Supabase boundary", () => {
  it("fails closed and hashes a separately provisioned teacher token", () => {
    expect(migration).toContain("private.teacher_pilot_keys");
    expect(migration).toContain("p_teacher_token text default null");
    expect(migration).toContain("digest(p_teacher_token, 'sha256')");
    expect(migration).toContain("char_length(p_teacher_token) < 12");
    expect(migration).toContain(
      "grant execute on function public.open_room_secure(jsonb, text) to anon",
    );
    expect(migration).toContain(
      "drop function if exists public.open_room_secure(jsonb)",
    );
  });

  it("keeps the gate table private and rate-limits room creation", () => {
    expect(migration).toContain(
      "revoke all on private.teacher_pilot_keys from public, anon, authenticated",
    );
    expect(migration).toContain(
      "private.enforce_rate_limit('open_room', 12, interval '10 minutes')",
    );
    expect(migration).not.toMatch(
      /grant\s+(?:select|insert|update|delete|all).*teacher_pilot_keys.*anon/i,
    );
  });
});
