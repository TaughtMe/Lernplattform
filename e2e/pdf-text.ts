import { inflateSync } from "node:zlib";

/**
 * Liest den Text aus einem PDF, das Chromium mit `page.pdf()` schreibt, ohne
 * zusätzliche Abhängigkeit: Objekte lesen, Flate-Ströme entpacken, die
 * `ToUnicode`-Tabellen der Schriften anwenden. Gedacht für kurze Textläufe wie
 * Namen auf einem Bogen, nicht als allgemeiner PDF-Leser (keine
 * Objektströme, keine verschlüsselten oder fremd erzeugten Dateien).
 */

type PdfObject = { dictionary: string; stream: Buffer | undefined };
type CMap = { width: number; map: Map<number, string> };

function readObjects(pdf: Buffer) {
  // latin1 bildet jedes Byte auf ein Zeichen ab: Indizes gelten für beide.
  const text = pdf.toString("latin1");
  const objects = new Map<number, PdfObject>();
  const pattern = /(\d+) 0 obj\s*([\s\S]*?)endobj/g;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const body = match[2] ?? "";
    const bodyStart =
      match.index + match[0].length - "endobj".length - body.length;
    const opening = />>\s*stream\r?\n/.exec(body);
    if (!opening) {
      objects.set(Number(match[1]), { dictionary: body, stream: undefined });
      continue;
    }
    const from = bodyStart + opening.index + opening[0].length;
    let to = bodyStart + body.lastIndexOf("endstream");
    // Der Zeilenumbruch vor `endstream` gehört nicht zum Strom.
    if (text[to - 1] === "\n") to -= 1;
    if (text[to - 1] === "\r") to -= 1;
    const dictionary = body.slice(0, opening.index + 2);
    const raw = pdf.subarray(from, to);
    objects.set(Number(match[1]), {
      dictionary,
      stream: /\/FlateDecode/.test(dictionary) ? inflateSync(raw) : raw,
    });
  }
  return objects;
}

const hexNumber = (hex: string) => Number.parseInt(hex, 16);
const utf16 = (hex: string) => {
  let text = "";
  for (let at = 0; at < hex.length; at += 4) {
    text += String.fromCharCode(hexNumber(hex.slice(at, at + 4)));
  }
  return text;
};

function parseCMap(source: string): CMap {
  const map = new Map<number, string>();
  const width =
    /begincodespacerange\s*<([0-9A-Fa-f]+)>/.exec(source)?.[1]?.length ?? 2;
  for (const block of source.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of (block[1] ?? "").matchAll(
      /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g,
    )) {
      map.set(hexNumber(pair[1] ?? ""), utf16(pair[2] ?? ""));
    }
  }
  for (const block of source.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const range of (block[1] ?? "").matchAll(
      /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g,
    )) {
      const first = hexNumber(range[1] ?? "");
      const last = hexNumber(range[2] ?? "");
      const target = range[3] ?? "";
      const base = hexNumber(target.slice(-4));
      for (let code = first; code <= last; code += 1) {
        map.set(
          code,
          utf16(target.slice(0, -4)) + String.fromCharCode(base + code - first),
        );
      }
    }
  }
  return { width: width / 2, map };
}

function decode(hex: string, font: CMap | undefined) {
  if (!font) return "";
  let text = "";
  const step = font.width * 2;
  for (let at = 0; at + step <= hex.length; at += step) {
    text += font.map.get(hexNumber(hex.slice(at, at + step))) ?? "";
  }
  return text;
}

/** Zusammenhängende Textläufe je Seite (ein `BT … ET`-Block = ein Eintrag). */
export function extractPdfTextRuns(pdf: Buffer): string[][] {
  const objects = readObjects(pdf);
  const cmaps = new Map<number, CMap>();
  const cmapOf = (id: number) => {
    const cached = cmaps.get(id);
    if (cached) return cached;
    const toUnicode = /\/ToUnicode (\d+) 0 R/.exec(
      objects.get(id)?.dictionary ?? "",
    )?.[1];
    const stream = toUnicode ? objects.get(Number(toUnicode))?.stream : null;
    if (!stream) return undefined;
    const parsed = parseCMap(stream.toString("latin1"));
    cmaps.set(id, parsed);
    return parsed;
  };

  const pages: string[][] = [];
  for (const object of objects.values()) {
    if (!/\/Type\s*\/Page\b(?!s)/.test(object.dictionary)) continue;
    const fonts = new Map<string, number>();
    const resources = /\/Font\s*<<([\s\S]*?)>>/.exec(object.dictionary)?.[1];
    for (const entry of (resources ?? "").matchAll(/\/(\w+) (\d+) 0 R/g)) {
      fonts.set(entry[1] ?? "", Number(entry[2]));
    }
    const contents = [
      ...(
        /\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/.exec(object.dictionary)?.[1] ?? ""
      ).matchAll(/(\d+) 0 R/g),
    ].map((entry) => objects.get(Number(entry[1]))?.stream?.toString("latin1"));

    const runs: string[] = [];
    let current: CMap | undefined;
    for (const source of contents) {
      for (const block of (source ?? "").matchAll(/BT([\s\S]*?)ET/g)) {
        let run = "";
        const operations =
          /\/(\w+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]*)>\s*Tj|\[([^\]]*)\]\s*TJ/g;
        for (const op of (block[1] ?? "").matchAll(operations)) {
          if (op[1]) {
            const font = fonts.get(op[1]);
            current = font === undefined ? undefined : cmapOf(font);
          } else if (op[2] !== undefined) {
            run += decode(op[2], current);
          } else if (op[3] !== undefined) {
            for (const part of op[3].matchAll(/<([0-9A-Fa-f]*)>/g)) {
              run += decode(part[1] ?? "", current);
            }
          }
        }
        if (run) runs.push(run);
      }
    }
    pages.push(runs);
  }
  return pages;
}
