import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACTIVE_TRANSFERS_KEY } from "../lehrer/material/active-transfers";
import { TeacherContentTransfer } from "./teacher-content-transfer";

const { publishTransferPayload, libraryRepository, push } = vi.hoisted(() => ({
  publishTransferPayload: vi.fn(),
  push: vi.fn(),
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
    publishTransferPayload,
  }),
);

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("../../src/integrations/laufdiktat/live-room-client", () => ({
  getLiveRoomClient: () => ({}),
}));

vi.mock("../../src/storage/teacher-class-settings", () => ({
  createTeacherContentLibraryRepository: () => libraryRepository,
}));

const CONFIG = { url: "https://example.supabase.co", publishableKey: "key" };

const entry = (
  id: string,
  title: string,
  source = "school;Schule;Unit 3\nclassroom;Klassenzimmer",
  kind?: "text" | "math" | "wordlist",
) => ({
  id,
  revision: 1,
  title,
  source,
  promptLocale: "en",
  answerLocale: "de",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
  ...(kind ? { kind } : {}),
});

describe("TeacherContentTransfer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    push.mockReset();
    libraryRepository.get.mockReset().mockResolvedValue(undefined);
    libraryRepository.list.mockReset().mockResolvedValue([]);
    libraryRepository.put.mockReset().mockResolvedValue(undefined);
    libraryRepository.putMany.mockReset().mockResolvedValue(undefined);
    libraryRepository.remove.mockReset().mockResolvedValue(undefined);
    publishTransferPayload.mockReset().mockResolvedValue({
      qrPayload: {
        version: 1,
        transferId: "transfer-1",
        retrievalToken: "retrieval-token",
      },
      manualTransferCode: "23456789ABCDEFGHJKLMNPQR",
      expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
    });
  });

  it("lists only vocabulary packages and previews the newest one", async () => {
    libraryRepository.list.mockResolvedValue([
      entry("v-alt", "Altes Vokabelpaket"),
      entry("t", "Ein Text", "Der Hund.", "text"),
      entry("m", "Eine Aufgabenreihe", "1+1", "math"),
    ]);
    render(<TeacherContentTransfer transferConfig={null} />);

    const list = await screen.findByRole("region", { name: "Vokabelpakete" });
    await within(list).findByText("Altes Vokabelpaket");
    expect(within(list).queryByText("Ein Text")).toBeNull();
    expect(within(list).getByText("2 Paare · geändert 02.09.")).toBeVisible();
    const preview = screen.getByRole("region", { name: "Vokabelpaket" });
    expect(
      within(preview).getByRole("heading", { name: "Altes Vokabelpaket" }),
    ).toBeVisible();
    expect(within(preview).getByText("2 Paare")).toBeVisible();
    expect(within(preview).getByText("school")).toBeVisible();
    expect(within(preview).getByText("Klassenzimmer")).toBeVisible();
    // Entscheidung 87: hier wird nicht mehr bearbeitet.
    expect(screen.queryByLabelText("Titel des Pakets")).toBeNull();
    expect(screen.queryByLabelText("Englisch, Zeile 1")).toBeNull();
    expect(libraryRepository.put).not.toHaveBeenCalled();
  });

  it("verweist mit „Bearbeiten“ in den Live-Raum-Editor, ohne fremde Klasse", async () => {
    libraryRepository.list.mockResolvedValue([entry("v 1", "Schule Unit 3")]);
    const { unmount } = render(
      <TeacherContentTransfer transferConfig={null} />,
    );
    await screen.findByRole("heading", { name: "Schule Unit 3" });
    // Ohne Klasse: „ohne“, damit der Editor keine zuletzt genutzte Klasse ergänzt.
    expect(screen.getByRole("link", { name: "Bearbeiten" })).toHaveAttribute(
      "href",
      "/lehrer/live?inhalt=v%201&schritt=inhalt&klasse=ohne",
    );
    unmount();
    const classId = "123e4567-e89b-42d3-a456-426614174001";
    libraryRepository.list.mockResolvedValue([
      { ...entry("v 1", "Schule Unit 3"), classIds: [classId] },
    ]);
    render(<TeacherContentTransfer transferConfig={null} />);
    await screen.findByRole("heading", { name: "Schule Unit 3" });
    expect(screen.getByRole("link", { name: "Bearbeiten" })).toHaveAttribute(
      "href",
      `/lehrer/live?inhalt=v%201&schritt=inhalt&klasse=${classId}`,
    );
  });

  it("öffnet mit „Neues Vokabelpaket“ den Live-Raum-Editor", async () => {
    const user = userEvent.setup();
    render(<TeacherContentTransfer transferConfig={null} />);
    await user.click(
      screen.getByRole("button", { name: "Neues Vokabelpaket" }),
    );
    expect(push).toHaveBeenCalledWith("/lehrer/live?neu=vocabulary");
  });

  it("zeigt unter „Übungskarten“ die Kartenauswahl", async () => {
    const user = userEvent.setup();
    render(<TeacherContentTransfer transferConfig={null} />);
    await user.click(screen.getByRole("button", { name: "Übungskarten" }));
    expect(
      screen.getByRole("button", { name: "Übungskarten" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Auf dem Bogen")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Neues Vokabelpaket" }),
    ).toBeNull();
  });

  it("öffnet das Paket aus „An die Kinder geben“ (?paket=)", async () => {
    window.history.replaceState(null, "", "/lehrer/material?paket=v-alt");
    libraryRepository.list.mockResolvedValue([
      {
        ...entry("v-neu", "Neues Paket"),
        updatedAt: "2026-09-05T10:00:00.000Z",
      },
      entry("v-alt", "Altes Vokabelpaket"),
    ]);
    render(<TeacherContentTransfer transferConfig={null} />);
    expect(
      await screen.findByRole("heading", { name: "Altes Vokabelpaket" }),
    ).toBeVisible();
    window.history.replaceState(null, "", "/");
  });

  it("öffnet bei ?paket= mit einer Lernwortliste den Reiter „Lernwortlisten“", async () => {
    window.history.replaceState(null, "", "/lehrer/material?paket=w-alt");
    libraryRepository.list.mockResolvedValue([
      {
        ...entry("w-neu", "Neue Liste", "Brief", "wordlist"),
        updatedAt: "2026-09-05T10:00:00.000Z",
      },
      entry("w-alt", "Alte Liste", "Sieb", "wordlist"),
    ]);
    render(<TeacherContentTransfer transferConfig={null} />);
    expect(await screen.findByDisplayValue("Alte Liste")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Lernwortlisten" }),
    ).toHaveAttribute("aria-pressed", "true");
    window.history.replaceState(null, "", "/");
  });

  it("encrypts, publishes and shows QR, code and the remaining time", async () => {
    const user = userEvent.setup();
    libraryRepository.list.mockResolvedValue([entry("v1", "Schule Unit 3")]);
    render(<TeacherContentTransfer transferConfig={CONFIG} />);
    await screen.findByRole("heading", { name: "Schule Unit 3" });

    await user.click(
      screen.getByRole("button", { name: "Für Schüler freigeben" }),
    );

    expect(publishTransferPayload).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        id: "v1",
        revision: 2,
        source: { kind: "teacher" },
        vocabulary: expect.arrayContaining([
          expect.objectContaining({
            prompt: expect.objectContaining({
              text: "school",
              locale: "en-GB",
            }),
            answer: expect.objectContaining({ text: "Schule" }),
          }),
        ]),
      }),
    );
    expect(
      await screen.findByText("2345 6789 ABCD EFGH JKLM NPQR"),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "QR-Code für das verschlüsselte Vokabelpaket",
      }),
    ).toBeVisible();
    const live = screen.getByRole("region", { name: "Läuft gerade" });
    expect(within(live).getByText("Schule Unit 3")).toBeVisible();
    expect(within(live).getByText(/noch 24 h/)).toBeVisible();
    // Die Freigabe bleibt nach dem Neuladen auf diesem Gerät sichtbar.
    expect(window.localStorage.getItem(ACTIVE_TRANSFERS_KEY)).toContain(
      "23456789ABCDEFGHJKLMNPQR",
    );
    // Ein zweites Mal freigeben erzeugt eine neue Fassung.
    await user.click(screen.getByRole("button", { name: "Neu freigeben" }));
    await waitFor(() =>
      expect(publishTransferPayload).toHaveBeenCalledTimes(2),
    );
    expect(publishTransferPayload.mock.calls[1]?.[1].revision).toBe(3);
  });

  it("explains a missing transfer configuration", async () => {
    const user = userEvent.setup();
    libraryRepository.list.mockResolvedValue([entry("v1", "Schule Unit 3")]);
    render(<TeacherContentTransfer transferConfig={null} />);
    await screen.findByRole("heading", { name: "Schule Unit 3" });
    await user.click(
      screen.getByRole("button", { name: "Für Schüler freigeben" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "noch nicht konfiguriert",
    );
    expect(publishTransferPayload).not.toHaveBeenCalled();
  });

  it("deletes a package only after confirming", async () => {
    const user = userEvent.setup();
    libraryRepository.list.mockResolvedValue([entry("v1", "Schule Unit 3")]);
    render(<TeacherContentTransfer transferConfig={null} />);
    await screen.findByRole("heading", { name: "Schule Unit 3" });
    await user.click(screen.getByRole("button", { name: "Paket löschen" }));
    expect(libraryRepository.remove).not.toHaveBeenCalled();
    libraryRepository.list.mockResolvedValue([]);
    await user.click(screen.getByRole("button", { name: "Löschen" }));
    expect(libraryRepository.remove).toHaveBeenCalledWith("v1");
    expect(
      await screen.findByText(/wurde aus der lokalen Bibliothek gelöscht/),
    ).toBeVisible();
  });

  describe("Lernwortlisten", () => {
    const list = (id: string, title: string, source = "Brief\nSieb") => ({
      ...entry(id, title, source, "wordlist"),
      promptLocale: "de-DE",
      answerLocale: "de-DE",
    });

    async function openWordLists(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: "Lernwortlisten" }));
    }

    it("zeigt nur Lernwortlisten und wechselt mit dem Schalter", async () => {
      const user = userEvent.setup();
      libraryRepository.list.mockResolvedValue([
        entry("v1", "Schule Unit 3"),
        list("w1", "Wörter mit ie"),
      ]);
      render(<TeacherContentTransfer transferConfig={CONFIG} />);
      await screen.findByRole("heading", { name: "Schule Unit 3" });
      expect(
        screen.getByRole("button", { name: "Vokabelpakete" }),
      ).toHaveAttribute("aria-pressed", "true");

      await openWordLists(user);
      const region = await screen.findByRole("region", {
        name: "Lernwortlisten",
      });
      expect(within(region).getByText("Wörter mit ie")).toBeVisible();
      expect(within(region).queryByText("Schule Unit 3")).toBeNull();
      expect(within(region).getByText(/2 Wörter · geändert/)).toBeVisible();
      expect(screen.getByLabelText("Titel der Liste")).toHaveValue(
        "Wörter mit ie",
      );
      expect(screen.getByLabelText("Wörter")).toHaveValue("Brief\nSieb");
    });

    it("legt eine neue Liste an und speichert sie beim Tippen als Art wordlist", async () => {
      const user = userEvent.setup();
      render(<TeacherContentTransfer transferConfig={CONFIG} />);
      await openWordLists(user);
      expect(screen.getByText("Noch nicht gespeichert")).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Für Schüler freigeben" }),
      ).toBeDisabled();

      await user.clear(screen.getByLabelText("Titel der Liste"));
      await user.type(screen.getByLabelText("Titel der Liste"), "ie-Wörter");
      await user.type(
        screen.getByLabelText("Wörter"),
        "Brief, Sieb{Enter}brief",
      );
      expect(screen.getByText("2 von 200 Wörtern")).toBeVisible();
      expect(
        screen.getByText(/1 Einträge werden nicht mitgegeben/),
      ).toBeVisible();

      await waitFor(() => expect(libraryRepository.put).toHaveBeenCalled());
      expect(libraryRepository.put).toHaveBeenLastCalledWith(
        expect.objectContaining({
          title: "ie-Wörter",
          kind: "wordlist",
          source: "Brief\nSieb",
        }),
      );
      expect(await screen.findByText("Lokal gespeichert")).toBeVisible();
    });

    it("sperrt die Freigabe bei zu vielen Wörtern und sagt warum", async () => {
      const user = userEvent.setup();
      libraryRepository.list.mockResolvedValue([list("w1", "Liste")]);
      render(<TeacherContentTransfer transferConfig={CONFIG} />);
      await openWordLists(user);
      await screen.findByDisplayValue("Liste");
      const many = Array.from({ length: 201 }, (_, i) => `wort${i}`).join(",");
      fireEvent.change(screen.getByLabelText("Wörter"), {
        target: { value: many },
      });
      expect(screen.getByText(/zu viele Wörter/)).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Für Schüler freigeben" }),
      ).toBeDisabled();
    });

    it("gibt die Liste verschlüsselt frei und zeigt QR zur Lernwerkstatt", async () => {
      const user = userEvent.setup();
      libraryRepository.list.mockResolvedValue([list("w1", "Wörter mit ie")]);
      render(<TeacherContentTransfer transferConfig={CONFIG} />);
      await openWordLists(user);
      await screen.findByDisplayValue("Wörter mit ie");

      await user.click(
        screen.getByRole("button", { name: "Für Schüler freigeben" }),
      );

      expect(publishTransferPayload).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          schemaVersion: "1.1.0",
          kind: "word-list",
          id: "w1",
          revision: 2,
          title: "Wörter mit ie",
          words: ["Brief", "Sieb"],
        }),
      );
      expect(
        await screen.findByText("2345 6789 ABCD EFGH JKLM NPQR"),
      ).toBeVisible();
      expect(
        screen.getByRole("img", {
          name: "QR-Code für die verschlüsselte Lernwortliste",
        }),
      ).toBeVisible();
      expect(screen.getByText(/Lernwerkstatt/)).toBeVisible();
      const live = screen.getByRole("region", { name: "Läuft gerade" });
      expect(within(live).getByText(/2 Wörter · Code 2345/)).toBeVisible();
      const stored = JSON.parse(
        window.localStorage.getItem(ACTIVE_TRANSFERS_KEY) ?? "[]",
      );
      expect(stored[0]).toMatchObject({ packageId: "w1", kind: "wordlist" });
      expect(libraryRepository.put).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: "wordlist", revision: 2 }),
      );
    });

    it("trennt die Freigaben beider Arten in „Läuft gerade“", async () => {
      const user = userEvent.setup();
      libraryRepository.list.mockResolvedValue([
        entry("v1", "Schule Unit 3"),
        list("w1", "Wörter mit ie"),
      ]);
      render(<TeacherContentTransfer transferConfig={CONFIG} />);
      await screen.findByRole("heading", { name: "Schule Unit 3" });
      await user.click(
        screen.getByRole("button", { name: "Für Schüler freigeben" }),
      );
      await screen.findByText("2345 6789 ABCD EFGH JKLM NPQR");

      await openWordLists(user);
      await screen.findByDisplayValue("Wörter mit ie");
      const live = screen.getByRole("region", { name: "Läuft gerade" });
      expect(within(live).queryByText("Schule Unit 3")).toBeNull();
      expect(
        screen.queryByRole("img", { name: /QR-Code für das verschlüsselte/ }),
      ).toBeNull();
    });

    it("erklärt eine fehlende Übertragungskonfiguration", async () => {
      const user = userEvent.setup();
      libraryRepository.list.mockResolvedValue([list("w1", "Liste")]);
      render(<TeacherContentTransfer transferConfig={null} />);
      await openWordLists(user);
      await screen.findByDisplayValue("Liste");
      await user.click(
        screen.getByRole("button", { name: "Für Schüler freigeben" }),
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "noch nicht konfiguriert",
      );
      expect(publishTransferPayload).not.toHaveBeenCalled();
    });

    it("löscht eine Liste erst nach Bestätigung", async () => {
      const user = userEvent.setup();
      libraryRepository.list.mockResolvedValue([list("w1", "Liste")]);
      render(<TeacherContentTransfer transferConfig={null} />);
      await openWordLists(user);
      await screen.findByDisplayValue("Liste");
      await user.click(screen.getByRole("button", { name: "Liste löschen" }));
      expect(libraryRepository.remove).not.toHaveBeenCalled();
      libraryRepository.list.mockResolvedValue([]);
      await user.click(screen.getByRole("button", { name: "Löschen" }));
      expect(libraryRepository.remove).toHaveBeenCalledWith("w1");
    });
  });
});
