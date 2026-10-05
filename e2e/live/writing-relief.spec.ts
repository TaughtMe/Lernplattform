import { expect, test, type Page } from "@playwright/test";
import {
  createEnrollmentCode,
  createEnrollmentLink,
  type ClassMember,
  type TeacherClass,
} from "../../src/domain/class-enrollment";
import {
  classSealFingerprint,
  createClassSealKeyPair,
  signWritingReliefGrant,
} from "../../src/domain/class-seal";
import { revealAndRelease } from "./hold";

const sessionId = "66666666-6666-4666-8666-666666666666";
const classId = "123e4567-e89b-42d3-a456-426614174001";
const membershipId = "123e4567-e89b-42d3-a456-426614174002";

/** Raumdienst mit einer Vokabel; `classSeal` ist der Stempelabdruck der Klasse. */
async function mockRoom(page: Page, classSeal?: string) {
  await page.route("**/rest/v1/rpc/*", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    let body: unknown = null;
    if (name === "join_room_secure")
      body = [
        {
          room_id: "11111111-1111-4111-8111-111111111111",
          station_mode: false,
          status: "live",
          assigned_student_key: "Mia",
          participant_token: "a".repeat(48),
        },
      ];
    if (name === "get_room_state_secure")
      body = [
        {
          status: "live",
          session_id: sessionId,
          config: {
            words: [
              {
                id: "voc-1",
                kind: "vocabulary",
                prompt: "house",
                targetWord: "Haus",
                promptLang: "en-GB",
                answerLang: "de-DE",
              },
            ],
            gameMode: "UEBUNG",
            vocabularyTransfer: "all",
            ...(classSeal ? { classSeal } : {}),
          },
        },
      ];
    if (name === "get_my_progress_secure") body = [];
    await route.fulfill({ json: body });
  });
}

/** Das Kind scannt den QR-Code; `signer` stellt die Freigabe aus. */
async function enroll(
  page: Page,
  signer: Awaited<ReturnType<typeof createClassSealKeyPair>>,
) {
  const issuedAt = "2026-10-02T08:00:00.000Z";
  const course: TeacherClass = {
    id: classId,
    name: "Klasse 7b",
    teacherName: "Frau Test",
    schoolYear: "2026/27",
    enabledModules: ["vocabulary"],
    seal: signer,
    createdAt: issuedAt,
    updatedAt: issuedAt,
  };
  const member: ClassMember = {
    id: membershipId,
    classId,
    displayName: "Alex",
    enrollmentToken: "0123456789abcdef0123456789abcdef",
    writingRelief: true,
    writingReliefIssuedAt: issuedAt,
    writingReliefSignature: await signWritingReliefGrant(signer.privateJwk, {
      v: 1,
      classId,
      membershipId,
      writingRelief: true,
      issuedAt,
    }),
    createdAt: issuedAt,
  };
  const link = createEnrollmentLink(
    "http://localhost:3001",
    createEnrollmentCode(course, member),
  );
  const url = new URL(link);
  await page.goto(`${url.pathname}${url.hash}`);
  await page.getByRole("button", { name: "Ja, ich bin Alex" }).click();
  await expect(page.getByText("Klasse 7b wurde deinem Lernraum")).toBeVisible();
}

async function typeWrong(page: Page, answer: string) {
  await revealAndRelease(page);
  const field = page.getByRole("textbox", { name: "Deine Antwort" });
  await field.fill(answer);
  await field.press("Enter");
}

test("a child with writing relief gets a typo accepted in a room for the same class", async ({
  page,
}) => {
  const seal = await createClassSealKeyPair();
  await enroll(page, seal);
  await mockRoom(page, await classSealFingerprint(seal.publicKey));
  await page.goto("/raum?code=4829");
  await typeWrong(page, "Hous");
  await expect(
    page.getByText("Richtig! So schreibt man es: Haus"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Geschafft, Mia!" }),
  ).toBeVisible({
    timeout: 10_000,
  });
});

test("the same child gets no relief in a room without a class", async ({
  page,
}) => {
  await enroll(page, await createClassSealKeyPair());
  await mockRoom(page);
  await page.goto("/raum?code=4829");
  await typeWrong(page, "Hous");
  await expect(page.getByText(/Noch nicht richtig/)).toBeVisible();
  await expect(page.getByText(/So schreibt man es/)).toHaveCount(0);
});

test("a self-issued grant of a made-up class does not work in the room of the real class", async ({
  page,
}) => {
  const real = await createClassSealKeyPair();
  const fake = await createClassSealKeyPair();
  await enroll(page, fake);
  await mockRoom(page, await classSealFingerprint(real.publicKey));
  await page.goto("/raum?code=4829");
  await typeWrong(page, "Hous");
  await expect(page.getByText(/Noch nicht richtig/)).toBeVisible();
  await expect(page.getByText(/So schreibt man es/)).toHaveCount(0);
});
