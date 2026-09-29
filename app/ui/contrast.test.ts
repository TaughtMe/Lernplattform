// @vitest-environment node
/**
 * Prüft die Farb-Tokens aus lernraum-ui.css gegen WCAG 2.1 AA:
 * Text 4,5 : 1, große Schrift und Bedienelemente 3 : 1.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./lernraum-ui.css", import.meta.url), "utf8");

function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Block ${selector} fehlt`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [
      m[1]!,
      m[2]!,
    ]),
  );
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const light = block(":root");
const dark = { ...light, ...block(':root[data-theme="dark"]') };
const onDark = { ...light, ...block(".ui-on-dark") };

const TEXT_PAIRS: Array<[string, string]> = [
  ["ink", "bg"],
  ["ink", "surface"],
  ["ink", "surface2"],
  ["ink2", "bg"],
  ["ink2", "surface"],
  ["ink3", "bg"],
  ["ink3", "surface"],
  ["accent", "surface"],
  ["accent", "bg"],
  ["accent", "accent-bg"],
  ["accent-ink", "accent"],
  ["green-ink", "green"],
  ["bad", "bad-bg"],
  ["good", "good-bg"],
  ["nav-ink", "nav"],
  ["nav-ink2", "nav"],
  ["nav-accent", "nav-active"],
];

describe.each([
  ["hell", light],
  ["dunkel", dark],
])("Tokens %s", (_, tokens) => {
  it.each(TEXT_PAIRS)("%s auf %s erreicht 4,5 : 1", (fg, bg) => {
    expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("dunkle Flächen (.ui-on-dark)", () => {
  it.each([
    ["ink", "bg"],
    ["ink2", "bg"],
    ["ink3", "bg"],
    ["ink2", "surface"],
    ["accent", "bg"],
    ["accent-ink", "accent"],
  ])("%s auf %s erreicht 4,5 : 1", (fg, bg) => {
    expect(contrast(onDark[fg]!, onDark[bg]!)).toBeGreaterThanOrEqual(4.5);
  });
});

it("berechnet Kontraste wie WCAG", () => {
  expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
  expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
});
