import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LearningBundleV1 } from "../../src/domain/learning-bundle";
import type { WordListPackageV1 } from "../../src/domain/word-list-package";
import { StudentContentTransfer } from "./student-content-transfer";

const { ingestBundle, importWordList, retrieveTransferByCode } = vi.hoisted(
  () => ({
    ingestBundle: vi.fn(),
    importWordList: vi.fn(),
    retrieveTransferByCode: vi.fn(),
  }),
);

vi.mock("../../src/storage/personal-learning-events", () => ({
  createLearningBoxRepository: () => ({ ingestBundle }),
  createWordBoxRepository: () => ({ importWordList }),
}));

vi.mock(
  "../../src/integrations/content-transfer/content-transfer-client",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../src/integrations/content-transfer/content-transfer-client")
    >()),
    retrieveTransferByCode,
  }),
);

vi.mock("../../src/integrations/laufdiktat/live-room-client", () => ({
  getLiveRoomClient: () => ({}),
}));

const bundle: LearningBundleV1 = {
  schemaVersion: "1.0.0",
  id: "teacher-package-1",
  revision: 1,
  createdAt: "2026-08-25T12:00:00.000Z",
  source: { kind: "teacher" },
  vocabulary: [
    {
      kind: "vocabulary",
      id: "word-1",
      prompt: { text: "school", locale: "en" },
      answer: { text: "Schule", locale: "de" },
      tagIds: [],
      createdAt: "2026-08-25T12:00:00.000Z",
      updatedAt: "2026-08-25T12:00:00.000Z",
    },
  ],
  stacks: [{ id: "stack-1", title: "Unit 1", itemIds: ["word-1"], tagIds: [] }],
};

const wordList: WordListPackageV1 = {
  schemaVersion: "1.1.0",
  kind: "word-list",
  id: "teacher-package-wl",
  revision: 1,
  createdAt: "2026-10-30T10:00:00.000Z",
  title: "Wörter mit ie",
  words: ["Brief", "Sieb"],
};

const config = { url: "https://example.supabase.co", publishableKey: "key" };

describe("StudentContentTransfer", () => {
  beforeEach(() => {
    importWordList.mockReset().mockResolvedValue({
      box: { title: "Wörter mit ie" },
      existed: false,
      added: 2,
      skipped: 0,
    });
    retrieveTransferByCode.mockReset().mockResolvedValue(bundle);
    ingestBundle
      .mockReset()
      .mockResolvedValue({ deckId: "deck-1", added: 1, reused: 0 });
  });

  it("retrieves and idempotently ingests a teacher package", async () => {
    const user = userEvent.setup();
    render(
      <StudentContentTransfer
        transferConfig={{
          url: "https://example.supabase.co",
          publishableKey: "key",
        }}
      />,
    );

    await user.type(
      screen.getByRole("textbox", { name: "Transfercode" }),
      "23456789ABCDEFGHJKLMNPQR",
    );
    await user.click(screen.getByRole("button", { name: "Übernehmen" }));

    await waitFor(() =>
      expect(ingestBundle).toHaveBeenCalledWith({
        bundle,
        title: "Unit 1",
        source: { kind: "teacher", sourceId: "teacher-package-1" },
      }),
    );
    expect(screen.getByText("Unit 1 wurde übernommen.")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /LernBox öffnen/ }),
    ).toHaveAttribute("href", "/lernbox");
  });

  it("rejects incomplete manual transfer codes before a request", async () => {
    const user = userEvent.setup();
    render(
      <StudentContentTransfer
        transferConfig={{
          url: "https://example.supabase.co",
          publishableKey: "key",
        }}
      />,
    );
    await user.type(
      screen.getByRole("textbox", { name: "Transfercode" }),
      "ABCD",
    );
    await user.click(screen.getByRole("button", { name: "Übernehmen" }));
    expect(screen.getByRole("alert")).toHaveTextContent("24-stelligen");
    expect(retrieveTransferByCode).not.toHaveBeenCalled();
  });

  it("keeps the LernBox unchanged when retrieval fails", async () => {
    const user = userEvent.setup();
    retrieveTransferByCode.mockRejectedValueOnce(
      new Error("Der Code ist ungültig, gesperrt oder abgelaufen."),
    );
    render(
      <StudentContentTransfer
        transferConfig={{
          url: "https://example.supabase.co",
          publishableKey: "key",
        }}
      />,
    );
    await user.type(
      screen.getByRole("textbox", { name: "Transfercode" }),
      "23456789ABCDEFGHJKLMNPQR",
    );
    await user.click(screen.getByRole("button", { name: "Übernehmen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("abgelaufen");
    expect(ingestBundle).not.toHaveBeenCalled();
  });

  async function receiveWordList(user: ReturnType<typeof userEvent.setup>) {
    retrieveTransferByCode.mockResolvedValue(wordList);
    render(<StudentContentTransfer transferConfig={config} />);
    await user.type(
      screen.getByRole("textbox", { name: "Transfercode" }),
      "23456789ABCDEFGHJKLMNPQR",
    );
    await user.click(screen.getByRole("button", { name: "Übernehmen" }));
  }

  it("zeigt eine Lernwortliste erst an und speichert nach Bestätigung eine Wortbox", async () => {
    const user = userEvent.setup();
    await receiveWordList(user);

    const group = await screen.findByRole("group", { name: "Lernwörter" });
    expect(group).toHaveTextContent("Wörter mit ie");
    expect(group).toHaveTextContent("2 Wörter von deiner Lehrkraft");
    expect(group).toHaveTextContent("Brief, Sieb");
    // Bis zur Bestätigung ist nichts gespeichert, und die LernBox bleibt unberührt.
    expect(importWordList).not.toHaveBeenCalled();
    expect(ingestBundle).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "In eine Wortbox speichern" }),
    );
    await waitFor(() =>
      expect(importWordList).toHaveBeenCalledWith({
        packageId: "teacher-package-wl",
        title: "Wörter mit ie",
        words: ["Brief", "Sieb"],
      }),
    );
    expect(
      await screen.findByText("Die Wortbox Wörter mit ie ist da."),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Im Wortspeicher öffnen/ }),
    ).toHaveAttribute("href", "/frei/german/lernwoerter");
    expect(ingestBundle).not.toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: "Lernwörter" })).toBeNull();
  });

  it("sagt bei einer schon übernommenen Liste, dass nichts doppelt angelegt wurde", async () => {
    const user = userEvent.setup();
    importWordList.mockResolvedValue({
      box: { title: "Wörter mit ie" },
      existed: true,
      added: 0,
      skipped: 0,
    });
    await receiveWordList(user);
    await user.click(
      await screen.findByRole("button", { name: "In eine Wortbox speichern" }),
    );
    expect(
      await screen.findByText("Diese Wörter hast du schon."),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("nichts doppelt");
  });

  it("meldet neue Wörter, wenn die Wortbox schon da war", async () => {
    const user = userEvent.setup();
    importWordList.mockResolvedValue({
      box: { title: "Wörter mit ie" },
      existed: true,
      added: 1,
      skipped: 0,
    });
    await receiveWordList(user);
    await user.click(
      await screen.findByRole("button", { name: "In eine Wortbox speichern" }),
    );
    expect(
      await screen.findByText("1 neues Wort ist dazugekommen."),
    ).toBeVisible();
  });

  it("speichert nichts, wenn das Kind die Liste verwirft", async () => {
    const user = userEvent.setup();
    await receiveWordList(user);
    await user.click(
      await screen.findByRole("button", { name: "Nicht speichern" }),
    );
    expect(screen.queryByRole("group", { name: "Lernwörter" })).toBeNull();
    expect(importWordList).not.toHaveBeenCalled();
  });

  it("lässt die Liste stehen und zeigt den Fehler, wenn das Speichern scheitert", async () => {
    const user = userEvent.setup();
    importWordList.mockRejectedValue(
      new Error("Du kannst höchstens 50 eigene Wortboxen anlegen."),
    );
    await receiveWordList(user);
    await user.click(
      await screen.findByRole("button", { name: "In eine Wortbox speichern" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("höchstens 50");
    expect(screen.getByRole("group", { name: "Lernwörter" })).toBeVisible();
  });

  it("zeigt eine unbekannte Paketversion verständlich und übernimmt nichts", async () => {
    const user = userEvent.setup();
    retrieveTransferByCode.mockRejectedValue(
      new Error(
        "Dieses Paket ist neuer als deine App. Lade die Seite neu oder aktualisiere die App.",
      ),
    );
    render(<StudentContentTransfer transferConfig={config} />);
    await user.type(
      screen.getByRole("textbox", { name: "Transfercode" }),
      "23456789ABCDEFGHJKLMNPQR",
    );
    await user.click(screen.getByRole("button", { name: "Übernehmen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "neuer als deine App",
    );
    expect(importWordList).not.toHaveBeenCalled();
    expect(ingestBundle).not.toHaveBeenCalled();
  });

  it("füllt das Feld aus dem Link der Lehrkraft (#code=) vor und räumt die Adresse auf", async () => {
    window.history.replaceState(
      null,
      "",
      "/lernen/material#code=23456789ABCDEFGHJKLMNPQR",
    );
    render(<StudentContentTransfer transferConfig={config} />);
    expect(
      await screen.findByDisplayValue("2345 6789 ABCD EFGH JKLM NPQR"),
    ).toBeVisible();
    expect(window.location.hash).toBe("");
  });
});
