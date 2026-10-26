import "fake-indexeddb/auto";
import Dexie from "dexie";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createClassSealKeyPair,
  classSealFingerprint,
} from "../../src/domain/class-seal";
import {
  createGuestPass,
  createGuestPassLink,
} from "../../src/domain/guest-pass";
import { GUEST_MODE_KEY, readGuestMode } from "../../src/storage/guest-mode";
import { LOCAL_DATA_AREAS } from "../../src/storage/local-data-boundaries";
import { StudentClassesDatabase } from "../../src/storage/student-classes";
import { GuestEntry } from "./guest-entry";

const classId = "123e4567-e89b-42d3-a456-426614174001";
const now = new Date("2026-10-26T08:00:00.000Z");
const open = vi.fn();
const environment = { now: () => now, open };

async function linkFor(issuedAt: Date) {
  const seal = await createClassSealKeyPair();
  const pass = await createGuestPass(seal, classId, issuedAt);
  const url = new URL(createGuestPassLink("https://lernraum.example", pass));
  return { seal, hash: url.hash };
}

function visit(hash: string) {
  window.history.replaceState(null, "", `/gast${hash}`);
}

beforeEach(() => {
  localStorage.clear();
  open.mockReset();
});

afterEach(async () => {
  window.history.replaceState(null, "", "/");
  for (const name of [LOCAL_DATA_AREAS.personal, LOCAL_DATA_AREAS.classes]) {
    await Dexie.delete(name);
  }
});

describe("GuestEntry", () => {
  it("startet auf einem leeren Gerät sofort", async () => {
    const { hash } = await linkFor(now);
    visit(hash);
    render(<GuestEntry environment={environment} />);

    await waitFor(() => expect(open).toHaveBeenCalledWith("/lernen"));
    expect(readGuestMode()).toMatchObject({ v: 1, classId });
    expect(window.location.hash).toBe("");
  });

  it("fragt bei vorhandenem Lernstand nach und startet erst nach Bestätigung", async () => {
    const user = userEvent.setup();
    const classes = new StudentClassesDatabase();
    await classes.memberships.put({ membershipId: "kind" } as never);
    classes.close();
    const { hash } = await linkFor(now);
    visit(hash);
    render(<GuestEntry environment={environment} />);

    expect(
      await screen.findByText(
        "Auf diesem Gerät ist schon ein Lernstand gespeichert. Im Gastmodus wird er am Ende gelöscht.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Erst Sicherung erstellen" }),
    ).toHaveAttribute("href", "/lernen/einstellungen#backup-title");
    expect(screen.getByRole("link", { name: "Abbrechen" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(localStorage.getItem(GUEST_MODE_KEY)).toBeNull();
    expect(open).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Gastmodus starten" }));
    expect(readGuestMode()?.classId).toBe(classId);
    expect(open).toHaveBeenCalledWith("/lernen");
  });

  it("meldet einen abgelaufenen Code und tut sonst nichts", async () => {
    const { hash } = await linkFor(new Date(now.getTime() - 2 * 60 * 60_000));
    visit(hash);
    render(<GuestEntry environment={environment} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Der Gast-Code ist abgelaufen.",
    );
    expect(localStorage.getItem(GUEST_MODE_KEY)).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  it("lehnt einen Code für eine bekannte Klasse mit anderem Schlüssel ab", async () => {
    const known = await createClassSealKeyPair();
    const classes = new StudentClassesDatabase();
    await classes.memberships.put({
      membershipId: "kind",
      classId,
      sealPublicKey: known.publicKey,
    } as never);
    classes.close();
    expect(await classSealFingerprint(known.publicKey)).toHaveLength(43);
    const { hash } = await linkFor(now);
    visit(hash);
    render(<GuestEntry environment={environment} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "gehört nicht zur Klasse",
    );
    expect(localStorage.getItem(GUEST_MODE_KEY)).toBeNull();
  });

  it("meldet kaputte und fehlende Codes", async () => {
    visit("#code=g1.kaputt");
    const { unmount } = render(<GuestEntry environment={environment} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("unvollständig");
    unmount();

    visit("");
    render(<GuestEntry environment={environment} />);
    expect(await screen.findByText(/Hier fehlt der Gast-Code/)).toBeVisible();
    expect(localStorage.getItem(GUEST_MODE_KEY)).toBeNull();
  });

  it("weist auf einen laufenden Gastmodus hin", async () => {
    localStorage.setItem(
      GUEST_MODE_KEY,
      JSON.stringify({ v: 1, startedAt: now.toISOString(), classId }),
    );
    const { hash } = await linkFor(now);
    visit(hash);
    render(<GuestEntry environment={environment} />);

    expect(await screen.findByText(/schon im Gastmodus/)).toBeVisible();
    expect(open).not.toHaveBeenCalled();
  });
});
