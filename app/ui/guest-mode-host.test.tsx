import "fake-indexeddb/auto";
import Dexie from "dexie";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GUEST_MODE_KEY,
  GUEST_MODE_MAX_AGE_MS,
} from "../../src/storage/guest-mode";
import { LEARNER_PROFILE_KEY } from "../../src/storage/learner-profile";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import { PersonalLearningDatabase } from "../../src/storage/personal-learning-events";
import { GuestModeHost } from "./guest-mode-host";

const classId = "123e4567-e89b-42d3-a456-426614174001";
const started = new Date("2026-10-26T08:00:00.000Z");
const leave = vi.fn();

function startGuest(at = started) {
  localStorage.setItem(
    GUEST_MODE_KEY,
    JSON.stringify({ v: 1, startedAt: at.toISOString(), classId }),
  );
  localStorage.setItem(LEARNER_PROFILE_KEY, "{}");
}

beforeEach(() => {
  localStorage.clear();
  leave.mockReset();
});

afterEach(async () => {
  await Dexie.delete(LOCAL_DATA_AREAS.personal);
});

// jsdom lässt `HTMLDialogElement.showModal` fehlen; `Sheet` fällt darauf zurück.
describe("GuestModeHost", () => {
  it("zeigt ohne Gastmodus nichts", () => {
    render(<GuestModeHost now={() => started} leave={leave} />);
    expect(screen.queryByText("Gastmodus")).not.toBeInTheDocument();
  });

  it("zeigt im Gastmodus das Etikett und löscht erst nach Bestätigung", async () => {
    const user = userEvent.setup();
    startGuest();
    const personal = new PersonalLearningDatabase();
    await personal.learningEvents.put({ id: "e" } as never);
    render(
      <GuestModeHost
        now={() => new Date(started.getTime() + 60_000)}
        leave={leave}
      />,
    );

    expect(screen.getByRole("region", { name: "Gastmodus" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Gastmodus beenden" }));
    expect(
      await screen.findByText(/Alles, was auf diesem Gerät/),
    ).toBeVisible();
    expect(localStorage.getItem(GUEST_MODE_KEY)).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Ja, alles löschen" }));
    await waitFor(() => expect(leave).toHaveBeenCalledWith("start"));
    expect(localStorage.getItem(GUEST_MODE_KEY)).toBeNull();
    expect(localStorage.getItem(LEARNER_PROFILE_KEY)).toBeNull();
    expect(await Dexie.exists(LOCAL_DATA_AREAS.personal)).toBe(false);
  });

  it("Abbrechen lässt alles unverändert", async () => {
    const user = userEvent.setup();
    startGuest();
    render(<GuestModeHost now={() => started} leave={leave} />);
    await user.click(screen.getByRole("button", { name: "Gastmodus beenden" }));
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(leave).not.toHaveBeenCalled();
    expect(localStorage.getItem(GUEST_MODE_KEY)).not.toBeNull();
    expect(localStorage.getItem(LEARNER_PROFILE_KEY)).toBe("{}");
  });

  it("beendet und löscht einen Gastmodus nach mehr als 12 Stunden beim Start", async () => {
    startGuest();
    render(
      <GuestModeHost
        now={() => new Date(started.getTime() + GUEST_MODE_MAX_AGE_MS + 1)}
        leave={leave}
      />,
    );
    await waitFor(() => expect(leave).toHaveBeenCalledWith("reload"));
    expect(localStorage.getItem(GUEST_MODE_KEY)).toBeNull();
    expect(localStorage.getItem(LEARNER_PROFILE_KEY)).toBeNull();
  });

  it("lässt einen jungen Gastmodus beim Start in Ruhe", async () => {
    startGuest();
    render(
      <GuestModeHost
        now={() => new Date(started.getTime() + GUEST_MODE_MAX_AGE_MS)}
        leave={leave}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(leave).not.toHaveBeenCalled();
    expect(localStorage.getItem(GUEST_MODE_KEY)).not.toBeNull();
  });
});
