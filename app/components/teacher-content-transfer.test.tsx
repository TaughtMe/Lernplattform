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

const { publishTransferPayload, libraryRepository } = vi.hoisted(() => ({
  publishTransferPayload: vi.fn(),
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

  it("lists only vocabulary packages and opens the newest one", async () => {
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
    expect(screen.getByLabelText("Titel des Pakets")).toHaveValue(
      "Altes Vokabelpaket",
    );
    expect(screen.getByLabelText("Englisch, Zeile 1")).toHaveValue("school");
    expect(screen.getByLabelText("Tag, Zeile 1")).toHaveValue("Unit 3");
    expect(screen.getByText("Lokal gespeichert")).toBeVisible();
  });

  it("saves a new package while typing, with a new row after the last", async () => {
    const user = userEvent.setup();
    render(<TeacherContentTransfer transferConfig={null} />);
    await user.click(
      screen.getByRole("button", { name: "Neues Vokabelpaket" }),
    );
    expect(screen.getByText("Noch nicht gespeichert")).toBeVisible();

    await user.type(screen.getByLabelText("Englisch, Zeile 1"), "go");
    // Wer in der leeren letzten Zeile tippt, bekommt eine neue darunter.
    expect(screen.getByLabelText("Englisch, Zeile 2")).toHaveValue("");
    await user.type(screen.getByLabelText("Deutsch, Zeile 1"), "gehen");

    await waitFor(() => expect(libraryRepository.put).toHaveBeenCalled());
    expect(libraryRepository.put).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: "Neues Vokabelpaket",
        source: "go;gehen",
        promptLocale: "en-GB",
        answerLocale: "de-DE",
      }),
    );
    expect(await screen.findByText("Lokal gespeichert")).toBeVisible();
  });

  it("splits a pasted list from Excel into rows and swaps languages", async () => {
    const user = userEvent.setup();
    render(<TeacherContentTransfer transferConfig={null} />);
    await user.click(screen.getByLabelText("Englisch, Zeile 1"));
    await user.paste("red\trot\nblue\tblau");
    expect(screen.getByLabelText("Englisch, Zeile 2")).toHaveValue("blue");
    expect(screen.getByLabelText("Deutsch, Zeile 2")).toHaveValue("blau");
    expect(screen.getByText("2 Paare")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Sprachen tauschen" }));
    expect(screen.getByLabelText("Deutsch, Zeile 1")).toHaveValue("rot");
    expect(screen.getByLabelText("Sprache 1")).toHaveValue("de-DE");

    await user.click(screen.getByRole("button", { name: "Zeile 1 entfernen" }));
    expect(screen.getByText("1 Paare")).toBeVisible();
  });

  it("imports vocabulary pairs from a text file into the table", async () => {
    const user = userEvent.setup();
    render(<TeacherContentTransfer transferConfig={null} />);

    const file = new File(["hello;Hallo\nworld\tWelt"], "words.tsv", {
      type: "text/tab-separated-values",
    });
    await user.upload(
      screen.getByLabelText("Datei mit Vokabelpaaren auswählen"),
      file,
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "2 Vokabelpaare",
    );
    expect(screen.getByLabelText("Englisch, Zeile 2")).toHaveValue("world");
  });

  it("encrypts, publishes and shows QR, code and the remaining time", async () => {
    const user = userEvent.setup();
    libraryRepository.list.mockResolvedValue([entry("v1", "Schule Unit 3")]);
    render(<TeacherContentTransfer transferConfig={CONFIG} />);
    await screen.findByDisplayValue("Schule Unit 3");

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
    await screen.findByDisplayValue("Schule Unit 3");
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
    await screen.findByDisplayValue("Schule Unit 3");
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
      await screen.findByDisplayValue("Schule Unit 3");
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
      await screen.findByDisplayValue("Schule Unit 3");
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
