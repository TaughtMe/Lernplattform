import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260901120000_remove_pilot_teacher_gate.sql",
  ),
  "utf8",
);

describe("Laufdiktat pilot Supabase boundary", () => {
  it("removes the separately provisioned teacher gate and its key table", () => {
    expect(migration).toContain(
      "drop function if exists public.open_room_secure(jsonb, text)",
    );
    expect(migration).toContain(
      "drop table if exists private.teacher_pilot_keys",
    );
    expect(migration).not.toContain("p_teacher_token");
  });

  it("keeps room creation rate-limited per caller", () => {
    expect(migration).toContain(
      "private.enforce_rate_limit('open_room', 12, interval '10 minutes')",
    );
    expect(migration).toContain(
      "grant execute on function public.open_room_secure(jsonb) to anon",
    );
  });
});
