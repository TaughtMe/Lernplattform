import { expect, test, type Page } from "@playwright/test";
import { analyzeAccessibility } from "../accessibility-helpers";
import { hydrated } from "../hydration-helpers";

const MANUAL_CODE = "23456789ABCDEFGHJKLMNPQR";
const SHOWN_CODE = "2345 6789 ABCD EFGH JKLM NPQR";
const TITLE = "Wörter mit ie";

/**
 * Bildet die Übertragungsfunktionen der Datenbank nach: Reservieren, Hochladen
 * und Abrufen. Die App verschlüsselt echt im Browser; hier liegt nur der
 * Chiffretext, genau wie auf dem Server.
 */
async function mockTransferServer(page: Page) {
  const uploads: Array<Record<string, unknown>> = [];
  let stored: Record<string, unknown> | null = null;
  let schemaVersion = "";
  await page.route("**/rest/v1/rpc/*", async (route) => {
    const request = route.request();
    const name = new URL(request.url()).pathname.split("/").pop();
    const args = (request.postDataJSON() ?? {}) as Record<string, unknown>;
    if (name === "reserve_content_transfer") {
      schemaVersion = String(args["p_schema_version"]);
      return route.fulfill({
        json: [
          {
            transfer_id: "11111111-1111-4111-8111-111111111111",
            upload_token: "upload-token",
            retrieval_token: "retrieval-token-with-enough-entropy",
            manual_transfer_code: MANUAL_CODE,
            expires_at: new Date(Date.now() + 24 * 3_600_000).toISOString(),
          },
        ],
      });
    }
    if (name === "upload_content_transfer") {
      uploads.push(args);
      stored = {
        package_id: "paket",
        schema_version: schemaVersion,
        content_version: 1,
        ciphertext: args["p_ciphertext"],
        nonce: args["p_nonce"],
        wrapped_key: args["p_wrapped_key_manual"],
        crypto_metadata: args["p_crypto_metadata"],
        expires_at: new Date(Date.now() + 24 * 3_600_000).toISOString(),
      };
      return route.fulfill({ json: true });
    }
    if (name === "retrieve_content_transfer_by_code") {
      return route.fulfill({ json: stored ? [stored] : [] });
    }
    return route.fulfill({ json: null });
  });
  return { uploads, schemaVersion: () => schemaVersion };
}

async function shareList(page: Page) {
  await page.goto("/lehrer/material");
  await (
    await hydrated(page.getByRole("button", { name: "Lernwortlisten" }))
  ).click();
  await page.getByLabel("Titel der Liste").fill(TITLE);
  await page
    .getByLabel("Wörter", { exact: true })
    .fill("Brief, Sieb\nTiger\nbrief");
  await expect(page.getByText("3 von 200 Wörtern")).toBeVisible();
  await expect(page.getByText("Lokal gespeichert")).toBeVisible();
  await page.getByRole("button", { name: "Für Schüler freigeben" }).click();
  await expect(page.getByText(SHOWN_CODE)).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "QR-Code für die verschlüsselte Lernwortliste",
    }),
  ).toBeVisible();
  const results = await analyzeAccessibility(page);
  expect(results.violations).toEqual([]);
}

async function receiveList(page: Page) {
  await page.goto("/lernen/material");
  const field = await hydrated(
    page.getByRole("textbox", { name: "Transfercode" }),
  );
  await field.fill(MANUAL_CODE);
  await page.getByRole("button", { name: "Übernehmen" }).click();
  const list = page.getByRole("group", { name: "Lernwörter" });
  await expect(list).toContainText(TITLE);
  await expect(list).toContainText("3 Wörter von deiner Lehrkraft");
  return list;
}

test("Lehrkraft gibt eine Lernwortliste frei, das Kind übernimmt sie als Wortbox", async ({
  page,
}) => {
  const server = await mockTransferServer(page);
  await shareList(page);

  // Auf dem Server liegt nur Chiffretext in der neuen Paketversion.
  expect(server.schemaVersion()).toBe("1.1.0");
  expect(JSON.stringify(server.uploads)).not.toMatch(/Brief|Tiger|ie/);

  await receiveList(page);
  // Bis zur Bestätigung ist nichts gespeichert.
  await page.goto("/frei/german/lernwoerter");
  await expect(page.getByText(TITLE)).toHaveCount(0);

  await receiveList(page);
  await page.getByRole("button", { name: "In eine Wortbox speichern" }).click();
  await expect(page.getByText(`Die Wortbox ${TITLE} ist da.`)).toBeVisible();
  await page.getByRole("link", { name: /Im Wortspeicher öffnen/ }).click();
  await expect(
    page.getByRole("button", { name: new RegExp(`^${TITLE}`) }),
  ).toBeVisible();
});

test("dieselbe Liste zweimal übernehmen legt keine zweite Wortbox an", async ({
  page,
}) => {
  await mockTransferServer(page);
  await shareList(page);

  for (const expected of [
    `Die Wortbox ${TITLE} ist da.`,
    "Diese Wörter hast du schon.",
  ]) {
    await receiveList(page);
    await page
      .getByRole("button", { name: "In eine Wortbox speichern" })
      .click();
    await expect(page.getByText(expected)).toBeVisible();
  }

  await page.goto("/frei/german/lernwoerter");
  await expect(
    page.getByRole("button", { name: new RegExp(`^${TITLE}`) }),
  ).toHaveCount(1);
});

test("der Link aus dem QR-Code füllt den Code in der Lernwerkstatt vor", async ({
  page,
}) => {
  await page.goto(`/lernen/material#code=${MANUAL_CODE}`);
  await expect(page.getByRole("textbox", { name: "Transfercode" })).toHaveValue(
    SHOWN_CODE,
  );
  // Der Code steht danach nicht mehr in der Adresse.
  await expect.poll(() => new URL(page.url()).hash).toBe("");
});
