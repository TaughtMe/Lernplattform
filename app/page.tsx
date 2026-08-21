import Link from "next/link";
import { AppHeader } from "./components/app-header";
import { RoomCodeForm } from "./components/room-code-form";

const demoGroups = [
  { code: "EN", className: "Klasse 7b", subject: "Englisch · 7. Jahrgang", topic: "Present Perfect", examples: ["to have been", "since / for", "irregular verbs"], color: "coral" },
  { code: "FR", className: "Klasse 9a", subject: "Französisch · 9. Jahrgang", topic: "Le subjonctif", examples: ["il faut que", "vouloir", "pouvoir"], color: "violet" },
  { code: "ES", className: "Klasse 8c", subject: "Spanisch · 8. Jahrgang", topic: "Ser vs. Estar", examples: ["estar cansado", "ser alto", "el clima"], color: "orange" },
  { code: "LA", className: "Klasse 10a", subject: "Latein · 10. Jahrgang", topic: "Ablativus", examples: ["cum + Abl.", "tempus", "modus"], color: "green" },
  { code: "DE", className: "Klasse 6b", subject: "Deutsch · 6. Jahrgang", topic: "Wortarten", examples: ["Adjektiv", "Adverb", "Präposition"], color: "magenta" },
  { code: "MA", className: "Klasse 8a", subject: "Mathematik · 8. Jahrgang", topic: "Lineare Funktionen", examples: ["Steigung m", "y = mx + b", "Nullstelle"], color: "teal" },
] as const;

export default function Home() {
  return (
    <main>
      <AppHeader />
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__content">
          <p className="eyebrow">Dein Lernraum, überall dabei</p>
          <h1 id="hero-title">Gemeinsam lernen, im Unterricht und zu Hause.</h1>
          <p className="hero__copy">
            Lernraum verbindet Unterricht und selbstständiges Wiederholen. Lehrkräfte
            erstellen Übungen, Schüler:innen bearbeiten sie gemeinsam und übernehmen
            die Inhalte anschließend in ihre persönliche LernBox.
          </p>
          <div className="hero__actions">
            <RoomCodeForm />
            <Link className="button button--primary" href="/lernbox">Meine LernBox öffnen</Link>
          </div>
          <p className="privacy-note">Ohne Schülerkonto · Lernstände bleiben auf diesem Gerät</p>
          <p className="module-hero__alt-link">
            Rechtschreibung üben? <Link href="/lernwoerter">Meine Lernwörter öffnen →</Link> · Zehnfingerschreiben lernen?{" "}
            <Link href="/tastschreiben">Tastschreiben öffnen →</Link>
          </p>
        </div>
      </section>

      <section className="demo-section" aria-labelledby="demo-title">
        <div className="section-heading">
          <div><p className="eyebrow">Ein Blick in Lernraum</p><h2 id="demo-title">Beispiel-Lerngruppen</h2></div>
          <p>Öffentliche Demo · echte Klassen nur per Raumcode</p>
        </div>
        <div className="group-grid">
          {demoGroups.map((group) => (
            <article className="group-card" key={group.code}>
              <div className="group-card__heading">
                <span className={`subject-badge subject-badge--${group.color}`}>{group.code}</span>
                <div><h3>{group.className}</h3><p>{group.subject}</p></div>
              </div>
              <p className="group-card__label">Aktuelles Thema</p>
              <p className="group-card__topic">{group.topic}</p>
              <ul className="tag-list" aria-label={`Beispiele zu ${group.topic}`}>
                {group.examples.map((example) => <li key={example}>{example}</li>)}
              </ul>
              <Link className="button button--quiet" href={`/demo/${group.code.toLowerCase()}`}>Vorschau ansehen</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="principles" aria-labelledby="principles-title">
        <div><p className="eyebrow">Ein gemeinsamer Kern</p><h2 id="principles-title">Lernen, das bei dir bleibt.</h2></div>
        <div className="principles__grid">
          <article><span aria-hidden="true">01</span><h3>Local-first</h3><p>Persönliche Lernstände bleiben standardmäßig auf deinem Gerät.</p></article>
          <article><span aria-hidden="true">02</span><h3>Ein Lernkreislauf</h3><p>Unterrichtsinhalte werden später ohne Dubletten weitergeübt.</p></article>
          <article><span aria-hidden="true">03</span><h3>Ruhig und fair</h3><p>Genauigkeit und Fortschritt zählen stärker als Geschwindigkeit.</p></article>
        </div>
      </section>

      <footer className="site-footer">
        <Link className="brand" href="/" aria-label="Lernraum Startseite"><span className="brand__mark" aria-hidden="true">L</span><span>Lernraum</span></Link>
        <p>Eine datensparsame Lernplattform für Unterricht und Zuhause.</p>
      </footer>
    </main>
  );
}
