/**
 * Liest die Stimmen-Datei von KittenTTS (`voices.npz`, ein ZIP mit
 * NumPy-Arrays). Rein: Das Entpacken komprimierter Einträge übernimmt die
 * übergebene Funktion (im Browser `DecompressionStream("deflate-raw")`).
 */
export type VoiceTable = Record<
  string,
  { data: Float32Array; shape: number[] }
>;

export type Inflate = (compressed: Uint8Array) => Promise<Uint8Array>;

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL = 0x06054b50;
const STORED = 0;
const DEFLATE = 8;

function findEndOfCentralDirectory(view: DataView): number {
  const lowest = Math.max(0, view.byteLength - 0xffff - 22);
  for (let offset = view.byteLength - 22; offset >= lowest; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL) return offset;
  }
  throw new Error("Stimmen-Datei: kein ZIP-Verzeichnis gefunden");
}

/** Ein NumPy-Array (`.npy`) als Float32Array; nur `<f4` und `<f8`, C-Reihenfolge. */
export function parseNpy(bytes: Uint8Array): {
  data: Float32Array;
  shape: number[];
} {
  const magic = [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59];
  if (!magic.every((value, index) => bytes[index] === value)) {
    throw new Error("Stimmen-Datei: kein NumPy-Array");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const major = bytes[6] ?? 1;
  const headerLength =
    major >= 2 ? view.getUint32(8, true) : view.getUint16(8, true);
  const headerStart = major >= 2 ? 12 : 10;
  const header = new TextDecoder().decode(
    bytes.subarray(headerStart, headerStart + headerLength),
  );
  const descr = /'descr'\s*:\s*'([^']+)'/.exec(header)?.[1];
  const shapeText = /'shape'\s*:\s*\(([^)]*)\)/.exec(header)?.[1];
  if (!descr || shapeText === undefined) {
    throw new Error("Stimmen-Datei: Kopf nicht lesbar");
  }
  if (/'fortran_order'\s*:\s*True/.test(header)) {
    throw new Error(
      "Stimmen-Datei: Fortran-Reihenfolge wird nicht unterstützt",
    );
  }
  const shape = shapeText
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number);
  const start = headerStart + headerLength;
  const raw = bytes.slice(start).buffer;
  let data: Float32Array;
  if (descr === "<f4") {
    data = new Float32Array(raw);
  } else if (descr === "<f8") {
    data = Float32Array.from(new Float64Array(raw));
  } else {
    throw new Error(`Stimmen-Datei: Datentyp ${descr} wird nicht unterstützt`);
  }
  return { data, shape: shape.length > 0 ? shape : [data.length] };
}

/** Alle `.npy`-Einträge eines `.npz`, Schlüssel ohne Endung. */
export async function parseNpz(
  buffer: ArrayBuffer,
  inflate: Inflate,
): Promise<VoiceTable> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const end = findEndOfCentralDirectory(view);
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const table: VoiceTable = {};
  for (let entry = 0; entry < count; entry += 1) {
    if (view.getUint32(offset, true) !== CENTRAL_HEADER) {
      throw new Error("Stimmen-Datei: ZIP-Verzeichnis beschädigt");
    }
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    );
    offset += 46 + nameLength + extraLength + commentLength;
    if (!name.endsWith(".npy")) continue;

    if (view.getUint32(localOffset, true) !== LOCAL_HEADER) {
      throw new Error("Stimmen-Datei: Eintrag beschädigt");
    }
    const localName = view.getUint16(localOffset + 26, true);
    const localExtra = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localName + localExtra;
    const stored = bytes.subarray(dataStart, dataStart + compressedSize);
    let content: Uint8Array;
    if (method === STORED) content = stored;
    else if (method === DEFLATE) content = await inflate(stored);
    else throw new Error(`Stimmen-Datei: Packverfahren ${method} unbekannt`);
    table[name.slice(0, -4)] = parseNpy(content);
  }
  return table;
}
