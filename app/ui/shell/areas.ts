/** Bereiche mit eigener Navigation, erkannt an der Adresse. */
const STUDENT_PREFIXES = [
  "/lernen",
  "/ueben",
  "/lernbox",
  "/frei",
  "/klasse",
  "/raum",
  "/haus",
  "/duell",
  "/demo",
];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function areaOf(pathname: string): "student" | "teacher" | null {
  if (matches(pathname, "/lehrer")) return "teacher";
  if (STUDENT_PREFIXES.some((prefix) => matches(pathname, prefix)))
    return "student";
  return null;
}
