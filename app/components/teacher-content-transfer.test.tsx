import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeacherContentTransfer } from "./teacher-content-transfer";

const { publishLearningBundle, libraryRepository } = vi.hoisted(() => ({
  publishLearningBundle: vi.fn(),
  libraryRepository: {
    get: vi.fn(),
    list: vi.fn(),
    put: vi.fn(),
    putMany: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock(
  "../../src/integrations/content-transfer/content-transfer-client",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../src/integrations/content-transfer/content-transfer-client")
    >()),
    publishLearningBundle,
  }),
);

vi.mock("../../src/integrations/laufdiktat/live-room-client", () => ({
  getLiveRoomClient: () => ({}),
}));

vi.mock("../../src/storage/teacher-class-settings", () => ({
  createTeacherContentLibraryRepository: () => libraryRepository,
}));

describe("TeacherContentTransfer", () => {
  beforeEach(() => {
    libraryRepository.get.mockReset().mockResolvedValue(undefined);
    libraryRepository.list.mockReset().mockResolvedValue([]);
    libraryRepository.put.mockReset().mockResolvedValue(undefined);
    libraryRepository.putMany.mockReset().mockResolvedValue(undefined);
    libraryRepository.remove.mockReset().mockResolvedValue(undefined);
    publishLearningBundle.mockReset().mockResolvedValue({
      qrPayload: {
        version: 1,
        transferId: "transfer-1",
        retrievalToken: "retrieval-token",
      },
      manualTransferCode: "23456789ABCDEFGHJKLMNPQR",
      expiresAt: "2026-08-26T12:00:00.000Z",
    });
  });

  it("stores a prepared package in the local teacher library", async () => {
    const user = userEvent.setup();
    render(<TeacherContentTransfer transferConfig={null} />);

    await user.click(screen.getByRole("button", { name: "Lokal speichern" }));

    expect(libraryRepository.put).toHaveBeenCalledWith(
      expect.objectContaining({
        revision: 0,
        title: "Englisch · Unterrichtspaket",
        source: expect.stringContaining("school;Schule"),
      }),
    );
    expect(await screen.findByText(/wurde lokal gespeichert/)).toBeVisible();
  });

  it("encrypts and publishes the prepared vocabulary package", async () => {
    const user = userEvent.setup();
    render(
      <TeacherContentTransfer
        transferConfig={{
          url: "https://example.supabase.co",
          publishableKey: "key",
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Paket verschlüsselt freigeben" }),
    );

    expect(publishLearningBundle).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        schemaVersion: "1.0.0",
        source: { kind: "teacher" },
        vocabulary: expect.arrayContaining([
          expect.objectContaining({
            prompt: expect.objectContaining({ text: "school" }),
            answer: expect.objectContaining({ text: "Schule" }),
          }),
        ]),
      }),
    );
    expect(await screen.findByText(/2345 6789 ABCD/)).toBeVisible();
    expect(
      screen.getByLabelText("QR-Code für das verschlüsselte Vokabelpaket"),
    ).toBeVisible();
  });

  it("publishes the same package as a new revision when released again", async () => {
    const user = userEvent.setup();
    render(
      <TeacherContentTransfer
        transferConfig={{
          url: "https://example.supabase.co",
          publishableKey: "key",
        }}
      />,
    );

    const publishButton = screen.getByRole("button", {
      name: "Paket verschlüsselt freigeben",
    });
    await user.click(publishButton);
    await user.click(publishButton);

    expect(publishLearningBundle).toHaveBeenCalledTimes(2);
    const firstBundle = publishLearningBundle.mock.calls[0]?.[1];
    const secondBundle = publishLearningBundle.mock.calls[1]?.[1];
    expect(secondBundle.id).toBe(firstBundle.id);
    expect(firstBundle.revision).toBe(1);
    expect(secondBundle.revision).toBe(2);
  });
});
