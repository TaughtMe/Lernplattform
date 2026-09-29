import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DESIGN_SCREENS } from "./manifest";
import styles from "./frame.module.css";

export const metadata: Metadata = {
  title: "Design-Screens",
  robots: { index: false, follow: false },
};

/** Übersicht aller Referenzzustände; nur in der Entwicklung erreichbar. */
export default function DesignScreensPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className={styles.index}>
      <h1>Design-Screens</h1>
      <p>
        Jede Ansicht mit Beispieldaten in der Größe der Vorlage. Referenzbilder
        liegen unter docs/design/referenz.
      </p>
      <ul>
        {DESIGN_SCREENS.map((screen) => (
          <li key={screen.id}>
            {screen.implemented ? (
              <Link href={`/entwicklung/screens/${screen.id}`}>
                {screen.id}
              </Link>
            ) : (
              screen.id
            )}{" "}
            · {screen.width}×{screen.height}
            {screen.implemented ? "" : " · offen"}
          </li>
        ))}
      </ul>
    </main>
  );
}
