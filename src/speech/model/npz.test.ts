import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseNpy, parseNpz } from "./npz";

const noInflate = () => Promise.reject(new Error("nicht erwartet"));

function npy(header: string, values: Float32Array) {
  const padded = header.padEnd(118, " ") + "\n";
  const bytes = new Uint8Array(10 + padded.length + values.byteLength);
  bytes.set([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 1, 0], 0);
  new DataView(bytes.buffer).setUint16(8, padded.length, true);
  bytes.set(new TextEncoder().encode(padded), 10);
  bytes.set(new Uint8Array(values.buffer), 10 + padded.length);
  return bytes;
}

describe("Stimmen-Datei (voices.npz)", () => {
  it("liest die mitgelieferte deutsche Stimmen-Datei", async () => {
    const file = await readFile(
      join(process.cwd(), "public/speech/kitten2/de/voices.npz"),
    );
    const table = await parseNpz(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
      noInflate,
    );
    expect(Object.keys(table)).toEqual(["anna", "mia", "lukas", "paul"]);
    expect(table["anna"]?.shape).toEqual([510, 256]);
    expect(table["anna"]?.data).toHaveLength(510 * 256);
  });

  it("liest ein Float32-Array mit Form", () => {
    const parsed = parseNpy(
      npy(
        "{'descr': '<f4', 'fortran_order': False, 'shape': (2, 2), }",
        Float32Array.of(1, 2, 3, 4),
      ),
    );
    expect(parsed.shape).toEqual([2, 2]);
    expect(Array.from(parsed.data)).toEqual([1, 2, 3, 4]);
  });

  it("lehnt fremde Datentypen und Fortran-Reihenfolge ab", () => {
    expect(() =>
      parseNpy(
        npy(
          "{'descr': '<i4', 'fortran_order': False, 'shape': (1,), }",
          Float32Array.of(1),
        ),
      ),
    ).toThrow(/Datentyp/);
    expect(() =>
      parseNpy(
        npy(
          "{'descr': '<f4', 'fortran_order': True, 'shape': (1,), }",
          Float32Array.of(1),
        ),
      ),
    ).toThrow(/Fortran/);
  });
});
