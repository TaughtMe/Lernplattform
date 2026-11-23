import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseNpy, parseNpz, styleFor } from "./npz";

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
  it("liest die Test-Stimme aus e2e/speech-fixtures", async () => {
    const file = await readFile(
      join(process.cwd(), "e2e/speech-fixtures/voices.npz"),
    );
    const table = await parseNpz(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
      noInflate,
    );
    const voice = table["test-voice"];
    expect(voice?.shape).toEqual([3, 256]);
    expect(voice?.data[256]).toBeCloseTo(1 / 256);
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

  it("wählt die Stilzeile min(Tokenzahl, N − 1)", () => {
    const voice = { data: Float32Array.of(0, 0, 1, 1, 2, 2), shape: [3, 2] };
    expect(Array.from(styleFor(voice, 1))).toEqual([1, 1]);
    expect(Array.from(styleFor(voice, 40))).toEqual([2, 2]);
    expect(styleFor({ data: Float32Array.of(5, 6), shape: [2] }, 9)).toEqual(
      Float32Array.of(5, 6),
    );
  });
});
