import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * Hilfen für den Glossar-Test (`child-glossary.test.ts`): sucht die Dateien der
 * Schüleransichten und holt aus ihnen nur Text, den Kinder sehen oder
 * vorgelesen bekommen. Bezeichner, Kommentare und Importpfade zählen nicht.
 */

export type VisibleText = { text: string; line: number };

/** Attribute, deren Werte Technik sind und nie auf dem Bildschirm stehen. */
const TECHNICAL_ATTRIBUTES = new Set([
  "className",
  "id",
  "href",
  "src",
  "htmlFor",
  "key",
  "style",
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
  "activePath",
  "icon",
]);

function isTechnicalAttribute(name: string) {
  return TECHNICAL_ATTRIBUTES.has(name) || name.startsWith("data-");
}

/** Liegt der Textknoten dort, wo Code statt Text steht? */
function isCodeOnly(node: ts.Node): boolean {
  const parent = node.parent;
  if (
    ts.isImportDeclaration(parent) ||
    ts.isExportDeclaration(parent) ||
    ts.isExternalModuleReference(parent) ||
    ts.isLiteralTypeNode(parent) ||
    ts.isCaseClause(parent)
  ) {
    return true;
  }
  // Schlüssel: `{ "name": … }`, `obj["key"]`.
  if (
    (ts.isPropertyAssignment(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isEnumMember(parent)) &&
    parent.name === node
  ) {
    return true;
  }
  if (
    ts.isElementAccessExpression(parent) &&
    parent.argumentExpression === node
  )
    return true;
  // Eigenschaften wie `className="…"` und `{"…"}` darin.
  const attribute = ts.isJsxExpression(parent) ? parent.parent : parent;
  if (ts.isJsxAttribute(attribute)) {
    return isTechnicalAttribute(attribute.name.getText());
  }
  // `import("…")` und `require("…")`.
  if (
    ts.isCallExpression(parent) &&
    (parent.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(parent.expression) &&
        parent.expression.text === "require"))
  ) {
    return true;
  }
  return false;
}

/** Alle sichtbaren Texte einer Quelldatei (JSX-Text, Zeichenketten, Schablonen). */
export function extractVisibleTexts(
  source: string,
  fileName: string,
): VisibleText[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: VisibleText[] = [];
  const visit = (node: ts.Node) => {
    let text: string | undefined;
    if (ts.isJsxText(node)) text = node.text;
    else if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      text = node.text;
    }
    if (text !== undefined && text.trim() !== "" && !isCodeOnly(node)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      found.push({ text: text.replace(/\s+/g, " ").trim(), line: line + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

/**
 * Ordner der Schüleransichten (alles unter `app/`, was ein Kind sieht).
 * Ausgenommen sind der Lehrerbereich, die Entwicklerseiten, Rechtstexte und
 * die Rückkehr der Cloud-Anmeldung (Erwachsene).
 */
const STUDENT_PREFIXES = [
  "app/views/",
  "app/components/",
  "app/lernen/",
  "app/frei/",
  "app/raum/",
  "app/lernbox/",
  "app/ueben/",
  "app/gast/",
  "app/klasse/",
  "app/haus/",
  "app/duell/",
  "app/demo/",
  "app/landing/",
  "app/ui/",
];

/** Unterordner und Dateien unter den Präfixen, die Lehrkräfte bedienen. */
const TEACHER_PATTERNS = [
  /^app\/views\/lehrer\//,
  /^app\/views\/laufdiktat\/teacher-dictation\//,
  /^app\/views\/laufdiktat\/teacher-dictation-/,
  /^app\/views\/laufdiktat\/(dictation-editor|math-editor|vocabulary-editor|vocabulary-picker)\./,
  /(^|\/)teacher-[^/]*$/,
  // Einführung und Vorlage zum Vokabelimport: Material für Lehrkräfte.
  /^app\/ui\/vocabulary-(import-guide|template-download)\./,
];

/** Quelltexte außerhalb von `app/`, die Kindern Sätze liefern. */
const STUDENT_SOURCE_FILES = [
  "src/storage/learning-recommendations.ts",
  "src/domain/mental-math-feedback.ts",
  "src/domain/live-game-feedback.ts",
];

/** Ist das eine Quelldatei einer Schüleransicht? Pfad mit `/`, ab Projektwurzel. */
export function isStudentViewFile(file: string): boolean {
  if (STUDENT_SOURCE_FILES.includes(file)) return true;
  if (!/\.tsx?$/.test(file) || /\.(test|d)\.tsx?$/.test(file)) return false;
  if (file === "app/page.tsx") return true;
  if (!STUDENT_PREFIXES.some((prefix) => file.startsWith(prefix))) return false;
  return !TEACHER_PATTERNS.some((pattern) => pattern.test(file));
}

function walk(directory: string, found: string[]) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else found.push(full.split(path.sep).join("/"));
  }
}

/** Alle Schülerdateien unter dem Projektstamm (relative Pfade, sortiert). */
export function listStudentViewFiles(root = "."): string[] {
  const files: string[] = [];
  walk(path.join(root, "app"), files);
  const relative = files.map((file) => path.posix.relative(root, file));
  return [...relative, ...STUDENT_SOURCE_FILES]
    .filter(isStudentViewFile)
    .sort();
}

export function readStudentViewTexts(file: string, root = "."): VisibleText[] {
  return extractVisibleTexts(readFileSync(path.join(root, file), "utf8"), file);
}
