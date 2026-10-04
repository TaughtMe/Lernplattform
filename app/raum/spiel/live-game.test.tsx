import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LiveSession } from "../../../src/integrations/laufdiktat/live-session";
import {
  classSealFingerprint,
  createClassSealKeyPair,
  signWritingReliefGrant,
} from "../../../src/domain/class-seal";
import { createStudentClassesRepository } from "../../../src/storage/student-classes";
import { revealWithTwoFingers } from "./hold-test-utils";
import { LiveRunningDictationGame } from "./live-game";

const { ingestBundle, putLearningEvent } = vi.hoisted(() => ({
  ingestBundle: vi.fn().mockResolvedValue({
    deckId: "deck-1",
    added: 1,
    reused: 0,
    practiceAgain: 0,
  }),
  putLearningEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../src/storage/personal-learning-events", () => ({
  createLearningBoxRepository: () => ({ ingestBundle }),
  createPersonalLearningEventRepository: () => ({ put: putLearningEvent }),
}));

const session: LiveSession = {
  sessionId: "session-1",
  words: [{ id: "word-1", kind: "text", targetWord: "Schulweg" }],
  gameMode: "UEBUNG",
  stationMode: false,
  stationCount: 1,
  isTtsEnabled: false,
  uebungMaxAttempts: 3,
  uebungAssistanceEnabled: false,
  repeatWrongAnswers: false,
  vocabularyTransfer: "none",
  showStars: true,
  shuffleWords: false,
  strictTypingMode: false,
  showTaskAfterErrors: false,
  stationShuffle: false,
  battleOptions: { ink: true, flicker: true },
};

describe("LiveRunningDictationGame", () => {
  it("keeps failed delivery visible after completion and offers retry", async () => {
    const onRetry = vi.fn();
    const props = {
      code: "4829",
      studentName: "Mia",
      session,
      connectionWarning: "Verbindung unterbrochen",
      initialProgress: {
        currentIndex: 0,
        peeks: 0,
        attempts: 1,
        errors: 0,
        finished: true,
      },
      onProgress: vi.fn(),
      onRetryProgress: onRetry,
    };
    const { rerender } = render(
      <LiveRunningDictationGame {...props} deliveryStatus="error" />,
    );
    expect(screen.getByText(/konnte nicht gesendet werden/)).toBeVisible();
    expect(screen.getByText("Verbindung unterbrochen")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Erneut senden" }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(<LiveRunningDictationGame {...props} deliveryStatus="saving" />);
    expect(screen.getByText(/wird an die Lehrkraft gesendet/)).toBeVisible();
    rerender(<LiveRunningDictationGame {...props} deliveryStatus="saved" />);
    expect(screen.getByText(/wurde an diese Unterrichtsrunde/)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Erneut senden" }),
    ).not.toBeInTheDocument();
  });

  it("preserves restored word errors when the round completes", async () => {
    const onProgress = vi.fn();
    render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={session}
        connectionWarning=""
        initialProgress={{
          currentIndex: 0,
          peeks: 1,
          attempts: 2,
          errors: 1,
          finished: false,
          durationMs: 5000,
          wordErrors: { old: 1 },
        }}
        onProgress={onProgress}
      />,
    );
    const user = userEvent.setup();
    revealWithTwoFingers(document.body);
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "Schulweg{Enter}",
    );
    await waitFor(() =>
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          currentIndex: 0,
          finished: true,
          errors: 1,
          wordErrors: { old: 1 },
        }),
      ),
    );
    expect(onProgress.mock.lastCall?.[0].durationMs).toBeGreaterThanOrEqual(
      5000,
    );
  });
  it("runs an authorized room task natively through to completion", async () => {
    const user = userEvent.setup();
    const onProgress = vi.fn();
    const { container } = render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={session}
        connectionWarning=""
        initialProgress={null}
        onProgress={onProgress}
      />,
    );

    revealWithTwoFingers(container);
    const answer = screen.getByRole("textbox", { name: "Deine Antwort" });
    await waitFor(() => expect(answer).toHaveFocus());
    await user.type(answer, "Schulweg{Enter}");

    expect(screen.getByText("Richtig")).toBeVisible();
    await waitFor(() =>
      expect(screen.getByText("Geschafft, Mia!")).toBeVisible(),
    );
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentIndex: 0, finished: true, errors: 0 }),
    );
    expect(putLearningEvent).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Zum persönlichen Lernraum" }),
    ).toHaveAttribute("href", "/lernen");
  });

  it("shows incorrect feedback as an error in classic Laufdiktat", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={{ ...session, gameMode: "LAUFDIKTAT" }}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );

    revealWithTwoFingers(container);
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "falsch{Enter}",
    );

    expect(
      screen.getByText("Noch nicht richtig. Versuche es erneut."),
    ).toBeVisible();
    expect(screen.queryByText("Geschafft, Mia!")).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "Schulweg{Enter}",
    );
    await waitFor(() =>
      expect(screen.getByText("Geschafft, Mia!")).toBeVisible(),
    );
  });

  it("keeps the copy template visible and preserves corrections", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={{
          ...session,
          uebungMaxAttempts: 1,
          uebungAssistanceEnabled: true,
        }}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );

    revealWithTwoFingers(container);
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "falsch{Enter}",
    );
    expect(screen.getByLabelText("Lösung: Schulweg")).toBeVisible();
    const input = screen.getByRole("textbox", { name: "Deine Antwort" });
    await user.type(input, "Schux{Enter}");
    expect(input).toHaveValue("Schux");
    expect(
      screen.getByLabelText("Lösung: Schulweg").querySelectorAll(".is-copied"),
    ).toHaveLength(4);
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "Deine Antwort" }),
      ).toHaveFocus(),
    );
  });

  it("transfers vocabulary with its tag when the teacher switched it on", async () => {
    const user = userEvent.setup();
    ingestBundle.mockClear();
    const { container } = render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={{
          ...session,
          words: [
            {
              id: "house",
              kind: "vocabulary",
              prompt: "house",
              targetWord: "Haus",
              tag: "Unit 3",
            },
          ],
          vocabularyTransfer: "all",
          vocabularyTag: "Buch Klasse 5",
        }}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );

    revealWithTwoFingers(container);
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "Haus{Enter}",
    );
    await waitFor(() =>
      expect(screen.getByText("Geschafft, Mia!")).toBeVisible(),
    );
    await waitFor(() => expect(ingestBundle).toHaveBeenCalledTimes(1));
    expect(
      ingestBundle.mock.calls[0]?.[0].bundle.vocabulary[0]?.tagIds,
    ).toEqual(["Unit 3"]);
  });

  it("keeps vocabulary out of the LernBox when the teacher switched it off", async () => {
    const user = userEvent.setup();
    ingestBundle.mockClear();
    const { container } = render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={{
          ...session,
          words: [
            {
              id: "house",
              kind: "vocabulary",
              prompt: "house",
              targetWord: "Haus",
            },
          ],
          vocabularyTransfer: "none",
        }}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );

    revealWithTwoFingers(container);
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "Haus{Enter}",
    );
    await waitFor(() =>
      expect(screen.getByText("Geschafft, Mia!")).toBeVisible(),
    );
    expect(ingestBundle).not.toHaveBeenCalled();
    expect(
      screen.queryByText("1 Vokabel wurde in deine LernBox übernommen."),
    ).not.toBeInTheDocument();
  });

  it("places a word as practice when only the letter hint was shown", async () => {
    window.sessionStorage.clear();
    const user = userEvent.setup();
    ingestBundle.mockClear();
    const { container } = render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={{
          ...session,
          sessionId: "session-hint",
          words: [
            {
              id: "house",
              kind: "vocabulary",
              prompt: "house",
              targetWord: "Haus",
            },
          ],
          vocabularyTransfer: "all",
        }}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );

    revealWithTwoFingers(container);
    const field = screen.getByRole("textbox", { name: "Deine Antwort" });
    await user.type(field, "Hous{Enter}");
    expect(await screen.findByLabelText("Buchstabenhilfe")).toBeVisible();
    await user.type(field, "Haus{Enter}");
    await waitFor(() => expect(ingestBundle).toHaveBeenCalledTimes(1));
    // Ein Tippfehler mit Buchstabenhilfe ist noch kein Grund für Box 1.
    expect(ingestBundle.mock.calls[0]?.[0].placements).toEqual({
      "live-session-hint-house": "practice",
    });
  });

  it("places a word as reset when the copy guide was shown", async () => {
    window.sessionStorage.clear();
    const user = userEvent.setup();
    ingestBundle.mockClear();
    const { container } = render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={{
          ...session,
          sessionId: "session-copy",
          uebungMaxAttempts: 2,
          words: [
            {
              id: "house",
              kind: "vocabulary",
              prompt: "house",
              targetWord: "Haus",
            },
          ],
          vocabularyTransfer: "all",
        }}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );

    revealWithTwoFingers(container);
    const field = screen.getByRole("textbox", { name: "Deine Antwort" });
    await user.type(field, "Hous{Enter}");
    await user.type(field, "Hau{Enter}");
    // Nach zwei Fehlversuchen zeigt die Abschreibvorlage die Lösung.
    expect(await screen.findByLabelText("Lösung: Haus")).toBeVisible();
    await user.clear(field);
    await user.type(field, "Haus{Enter}");
    await waitFor(() => expect(ingestBundle).toHaveBeenCalledTimes(1));
    expect(ingestBundle.mock.calls[0]?.[0].placements).toEqual({
      "live-session-copy-house": "reset",
    });
    // Hilfen bleiben auf dem Gerät: Schnappschuss nur im sessionStorage.
    expect(
      window.sessionStorage.getItem("lernraum:live-trace:session-copy"),
    ).toContain('"wordHelps":{"house → Haus":true}');
  });

  describe("Schreiberleichterung", () => {
    const classId = "123e4567-e89b-42d3-a456-426614174001";
    const membershipId = "123e4567-e89b-42d3-a456-426614174002";
    const houseWord = {
      id: "house",
      kind: "vocabulary" as const,
      prompt: "house",
      targetWord: "Haus",
    };

    /** Speichert eine Mitgliedschaft mit Freigabe, die der Schlüssel `signer` ausgestellt hat. */
    async function storeMembership(signer: {
      privateJwk: Awaited<
        ReturnType<typeof createClassSealKeyPair>
      >["privateJwk"];
      publicKey: string;
    }) {
      const grant = {
        v: 1 as const,
        classId,
        membershipId,
        writingRelief: true as const,
        issuedAt: "2026-10-02T08:00:00.000Z",
      };
      await createStudentClassesRepository().put({
        version: 1,
        classId,
        membershipId,
        className: "7b",
        teacherName: "Frau Test",
        schoolYear: "2026/27",
        displayName: "Alex",
        enrollmentToken: "0123456789abcdef0123456789abcdef",
        issuedAt: "2026-08-30T10:05:00.000Z",
        sealPublicKey: signer.publicKey,
        writingReliefGrant: grant,
        writingReliefSignature: await signWritingReliefGrant(
          signer.privateJwk,
          grant,
        ),
      });
    }

    function renderRound(id: string, extra: Partial<LiveSession> = {}) {
      ingestBundle.mockClear();
      const onProgress = vi.fn();
      const view = render(
        <LiveRunningDictationGame
          code="4829"
          studentName="Mia"
          session={{
            ...session,
            sessionId: id,
            words: [houseWord],
            vocabularyTransfer: "all",
            ...extra,
          }}
          connectionWarning=""
          initialProgress={null}
          onProgress={onProgress}
        />,
      );
      revealWithTwoFingers(view.container);
      return { ...view, onProgress };
    }

    afterEach(async () => {
      window.sessionStorage.clear();
      await createStudentClassesRepository().removeClass(classId);
    });

    it("nimmt mit Freigabe im passenden Raum einen Tippfehler an und zeigt die richtige Schreibweise", async () => {
      window.sessionStorage.clear();
      const seal = await createClassSealKeyPair();
      await storeMembership(seal);
      const user = userEvent.setup();
      const { onProgress } = renderRound("relief-ok", {
        classSeal: await classSealFingerprint(seal.publicKey),
      });
      await user.type(
        screen.getByRole("textbox", { name: "Deine Antwort" }),
        "Hous{Enter}",
      );
      expect(
        await screen.findByText("Richtig! So schreibt man es: Haus"),
      ).toBeVisible();
      await waitFor(() => expect(ingestBundle).toHaveBeenCalledTimes(1), {
        timeout: 4000,
      });
      // Für die Lehrkraft richtig: kein Fehlversuch, nichts über die Freigabe.
      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(onProgress.mock.calls[0]?.[0]).toMatchObject({
        errors: 0,
        finished: true,
      });
      expect(JSON.stringify(onProgress.mock.calls)).not.toMatch(
        /tolerat|relief|seal/i,
      );
      // In der LernBox aber „üben“, nicht „sicher gewusst“.
      expect(ingestBundle.mock.calls[0]?.[0].placements).toEqual({
        "live-relief-ok-house": "practice",
      });
    });

    it("nimmt denselben Tippfehler in einem Raum ohne Klasse nicht an", async () => {
      window.sessionStorage.clear();
      await storeMembership(await createClassSealKeyPair());
      const user = userEvent.setup();
      renderRound("relief-no-class");
      await user.type(
        screen.getByRole("textbox", { name: "Deine Antwort" }),
        "Hous{Enter}",
      );
      expect(
        await screen.findByText("Noch nicht richtig. Versuche es erneut."),
      ).toBeVisible();
      expect(screen.queryByText(/So schreibt man es/)).not.toBeInTheDocument();
    });

    it("Schummeltest: selbst ausgestellte Freigabe wirkt nicht im Raum der echten Klasse", async () => {
      window.sessionStorage.clear();
      const real = await createClassSealKeyPair();
      await storeMembership(await createClassSealKeyPair());
      const user = userEvent.setup();
      renderRound("relief-fake", {
        classSeal: await classSealFingerprint(real.publicKey),
      });
      await user.type(
        screen.getByRole("textbox", { name: "Deine Antwort" }),
        "Hous{Enter}",
      );
      expect(
        await screen.findByText("Noch nicht richtig. Versuche es erneut."),
      ).toBeVisible();
    });

    it("lässt bei Abstand 2 keine Toleranz zu", async () => {
      window.sessionStorage.clear();
      const seal = await createClassSealKeyPair();
      await storeMembership(seal);
      const user = userEvent.setup();
      renderRound("relief-strict", {
        classSeal: await classSealFingerprint(seal.publicKey),
      });
      await user.type(
        screen.getByRole("textbox", { name: "Deine Antwort" }),
        "Hxxs{Enter}",
      );
      expect(
        await screen.findByText("Noch nicht richtig. Versuche es erneut."),
      ).toBeVisible();
    });

    it.each([
      [4, "practice"],
      [5, "reset"],
    ])(
      "zählt nach %i Fehlversuchen als %s und die Abschreibvorlage zählt nicht als Hilfe",
      async (wrong, outcome) => {
        window.sessionStorage.clear();
        const seal = await createClassSealKeyPair();
        await storeMembership(seal);
        const user = userEvent.setup();
        renderRound(`relief-${wrong}`, {
          classSeal: await classSealFingerprint(seal.publicKey),
          uebungMaxAttempts: 2,
        });
        const field = screen.getByRole("textbox", { name: "Deine Antwort" });
        for (let attempt = 0; attempt < wrong; attempt += 1) {
          if (attempt === 2) {
            // Nach zwei Fehlversuchen steht die Abschreibvorlage da.
            expect(await screen.findByLabelText("Lösung: Haus")).toBeVisible();
            await user.clear(field);
          }
          await user.type(field, "Zzzz{Enter}");
        }
        await user.clear(field);
        await user.type(field, "Haus{Enter}");
        await waitFor(() => expect(ingestBundle).toHaveBeenCalledTimes(1));
        expect(ingestBundle.mock.calls[0]?.[0].placements).toEqual({
          [`live-relief-${wrong}-house`]: outcome,
        });
        expect(
          window.sessionStorage.getItem(`lernraum:live-trace:relief-${wrong}`),
        ).toContain('"wordHelps":{}');
      },
    );
  });

  it("places a clean answer as known and shows the child-friendly notice", async () => {
    window.sessionStorage.clear();
    const user = userEvent.setup();
    ingestBundle.mockClear();
    const { container } = render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={{
          ...session,
          sessionId: "session-known",
          words: [
            {
              id: "house",
              kind: "vocabulary",
              prompt: "house",
              targetWord: "Haus",
            },
          ],
          vocabularyTransfer: "all",
        }}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );
    revealWithTwoFingers(container);
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "Haus{Enter}",
    );
    await waitFor(() =>
      expect(
        screen.getByText("1 neue Vokabel ist jetzt in deiner LernBox."),
      ).toBeVisible(),
    );
    expect(ingestBundle.mock.calls[0]?.[0].placements).toEqual({
      "live-session-known-house": "known",
    });
  });
});

it("stores math errors locally and keeps extra practice out of lesson scoring", async () => {
  putLearningEvent.mockClear();
  const user = userEvent.setup();
  const onProgress = vi.fn();
  const { container } = render(
    <LiveRunningDictationGame
      code="4829"
      studentName="Mia"
      session={{
        ...session,
        words: [{ id: "m", kind: "math", prompt: "7 · 8", targetWord: "56" }],
      }}
      connectionWarning=""
      initialProgress={null}
      onProgress={onProgress}
      deliveryStatus="saved"
    />,
  );
  revealWithTwoFingers(container);
  const answer = screen.getByRole("textbox", { name: "Deine Antwort" });
  await user.type(answer, "54{Enter}");
  await waitFor(() => expect(putLearningEvent).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(answer).toBeEnabled());
  await user.type(answer, "56{Enter}");
  await screen.findByRole("heading", { name: "Geschafft, Mia!" });
  expect(putLearningEvent.mock.calls[0]![0]).toMatchObject({
    source: "running-dictation",
    math: { answer: "54", task: { answer: 56 } },
  });
  expect(putLearningEvent.mock.calls[1]![0].assessment.selfCorrected).toBe(
    true,
  );
  expect(
    screen.getByRole("link", { name: "Meine Fehler üben" }),
  ).toHaveAttribute("href", "/frei/mathematics?round=session-1&mode=errors");
  expect(
    screen.getByRole("link", { name: "Weitere Aufgaben üben" }),
  ).toBeVisible();
  expect(onProgress).toHaveBeenLastCalledWith(
    expect.objectContaining({ finished: true, errors: 1, attempts: 2 }),
  );
});

it("preserves a math answer after local storage failure", async () => {
  putLearningEvent.mockClear().mockRejectedValueOnce(new Error("disk"));
  const user = userEvent.setup();
  const onProgress = vi.fn();
  const { container } = render(
    <LiveRunningDictationGame
      code="4829"
      studentName="Mia"
      session={{
        ...session,
        words: [{ id: "m", kind: "math", prompt: "2 + 3", targetWord: "5" }],
      }}
      connectionWarning=""
      initialProgress={null}
      onProgress={onProgress}
    />,
  );
  revealWithTwoFingers(container);
  const answer = screen.getByRole("textbox", { name: "Deine Antwort" });
  await user.type(answer, "5{Enter}");
  await screen.findByRole("alert");
  expect(answer).toHaveValue("5");
  expect(onProgress).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Prüfen" }));
  await screen.findByRole("heading", { name: "Geschafft, Mia!" });
  expect(putLearningEvent.mock.calls[0]![0]).toEqual(
    putLearningEvent.mock.calls[1]![0],
  );
});
