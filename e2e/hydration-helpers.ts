import { expect, type Locator } from "@playwright/test";

/**
 * Wartet, bis React ein Element hydriert hat, und gibt es zurück. Eingaben und
 * Klicks davor gehen verloren: Ein Klick auf einen Knopf bleibt wirkungslos,
 * ein gefülltes Feld setzt die Hydration auf den Anfangswert zurück. Der Test
 * würde dann nur das serverseitig gerenderte HTML bedienen. React hängt seine
 * Eigenschaften (`__reactProps$…`) erst bei der Hydration an den Knoten.
 */
export async function hydrated(element: Locator) {
  await expect(element).toBeVisible();
  await expect
    .poll(() =>
      element.evaluate((node) =>
        Object.keys(node).some((key) => key.startsWith("__reactProps$")),
      ),
    )
    .toBe(true);
  return element;
}
