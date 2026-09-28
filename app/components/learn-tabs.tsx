import Link from "next/link";

export function LearnTabs({ active }: { active: "vokabeln" | "wortspeicher" }) {
  return (
    <nav className="seg" aria-label="Lernbereich" style={{ minWidth: 0 }}>
      <Link href="/lernen" aria-current={active === "vokabeln" ? "page" : undefined}>Vokabeln</Link>
      <Link href="/lernen/wortspeicher" aria-current={active === "wortspeicher" ? "page" : undefined}>Wortspeicher</Link>
    </nav>
  );
}
