import { afterEach, describe, expect, it, vi } from "vitest";
import { isPilotGateEnabled } from "./pilot-mode";

describe("pilot gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the pilot gate enabled by default in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LERNRAUM_PILOT_GATE", "");
    expect(isPilotGateEnabled()).toBe(true);
  });

  it("allows an explicit development preview opt-out", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LERNRAUM_PILOT_GATE", "0");
    expect(isPilotGateEnabled()).toBe(false);
  });

  it("can be enabled explicitly outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LERNRAUM_PILOT_GATE", "1");
    expect(isPilotGateEnabled()).toBe(true);
  });
});
