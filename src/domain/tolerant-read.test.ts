import * as z from "zod";
import { describe, expect, it } from "vitest";
import {
  lenientReadSchema,
  readOneTolerant,
  readTolerant,
} from "./tolerant-read";

const strict = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["a", "b"]),
    inner: z.object({ n: z.number() }).strict(),
    list: z.array(z.object({ x: z.number() }).strict()),
    maybe: z.object({ y: z.number() }).strict().optional(),
    either: z.union([
      z.object({ t: z.literal("one") }).strict(),
      z.object({ t: z.literal("two"), v: z.number() }).strict(),
    ]),
  })
  .strict()
  .refine((value) => value.id !== "verboten", "verboten");

const valid = {
  id: "1",
  kind: "a",
  inner: { n: 1 },
  list: [{ x: 1 }],
  either: { t: "one" },
};

describe("tolerantes Lesen", () => {
  it("entfernt unbekannte Zusatzfelder auf jeder Ebene", () => {
    expect(strict.safeParse({ ...valid, extra: 1 }).success).toBe(false);
    const read = readOneTolerant(strict, {
      ...valid,
      extra: 1,
      inner: { n: 1, more: true },
      list: [{ x: 1, more: true }],
      maybe: { y: 2, more: true },
      either: { t: "two", v: 3, more: true },
    });
    expect(read).toEqual({
      ...valid,
      maybe: { y: 2 },
      either: { t: "two", v: 3 },
    });
  });

  it("lehnt unbekannte Enum-Werte, fehlende Pflichtfelder und Prüfungen weiter ab", () => {
    expect(readOneTolerant(strict, { ...valid, kind: "c" })).toBeUndefined();
    expect(readOneTolerant(strict, { ...valid, inner: {} })).toBeUndefined();
    expect(
      readOneTolerant(strict, { ...valid, id: "verboten" }),
    ).toBeUndefined();
    expect(
      readOneTolerant(strict, { ...valid, either: { t: "x" } }),
    ).toBeUndefined();
  });

  it("zählt unlesbare Datensätze mit Schlüssel statt sie zu verwerfen oder zu werfen", () => {
    const result = readTolerant(
      strict,
      [
        valid,
        { ...valid, id: "2", extra: 1 },
        { ...valid, id: "3", kind: "z" },
        null,
      ],
      "tabelle",
    );
    expect(result.items.map((item) => item.id)).toEqual(["1", "2"]);
    expect(result.quarantined).toEqual([
      { table: "tabelle", id: "3" },
      { table: "tabelle", id: "#3" },
    ]);
  });

  it("verändert das strenge Schema nicht und merkt sich die Lese-Variante", () => {
    lenientReadSchema(strict);
    expect(strict.safeParse({ ...valid, extra: 1 }).success).toBe(false);
    expect(lenientReadSchema(strict)).toBe(lenientReadSchema(strict));
  });
});
