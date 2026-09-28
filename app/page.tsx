import { LandingClient } from "./landing-client";

export default function Home() {
  return (
    <main className="landing">
      <h1 className="sr-only">Lernraum – gemeinsam lernen, im Unterricht und zu Hause.</h1>
      <LandingClient />
    </main>
  );
}
