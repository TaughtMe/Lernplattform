import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LearningBundleV1 } from "../../src/domain/learning-bundle";
import { StudentContentTransfer } from "./student-content-transfer";

const { ingestBundle, retrieveLearningBundleByCode } = vi.hoisted(() => ({
  ingestBundle: vi.fn(),
  retrieveLearningBundleByCode: vi.fn(),
}));

vi.mock("../../src/storage/personal-learning-events", () => ({
  createLearningBoxRepository: () => ({ ingestBundle }),
}));

vi.mock(
  "../../src/integrations/content-transfer/content-transfer-client",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../src/integrations/content-transfer/content-transfer-client")
    >()),
    retrieveLearningBundleByCode,
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

describe("StudentContentTransfer", () => {
  beforeEach(() => {
    retrieveLearningBundleByCode.mockReset().mockResolvedValue(bundle);
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
    expect(retrieveLearningBundleByCode).not.toHaveBeenCalled();
  });

  it("keeps the LernBox unchanged when retrieval fails", async () => {
    const user = userEvent.setup();
    retrieveLearningBundleByCode.mockRejectedValueOnce(
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
});
