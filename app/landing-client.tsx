"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { animalName } from "@/src/domain/animals";
import { KEYS, type Profile } from "@/src/storage/personal";
import { Animal } from "./components/animal";
import { RoomCodeInput } from "./components/code-input";
import { useSeed, useStored } from "./hooks/use-stored";

/** Landingpage (Design 2a): ein Tier, ein Code, sonst nichts. */
export function LandingClient() {
  const router = useRouter();
  useSeed();
  const [profile] = useStored<Profile | null>("personal", KEYS.profile, null);
  const animal = profile?.animal ?? "fuchs";

  return (
    <div className="landing-inner">
      <header className="between">
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}>Lernraum</span>
        <Link href="/lehrer" className="landing-pill">Lehrer-Login</Link>
      </header>

      <div className="stack" style={{ alignItems: "center", ["--gap" as string]: "20px", margin: "auto 0" }}>
        <Link href="/start" className="landing-disc" aria-label={`Weiter als ${animalName(animal)}`}>
          <Animal id={animal} size={224} label={false} style={{ filter: "drop-shadow(0 10px 22px rgba(0,0,0,.45))" }} />
        </Link>
        <div className="stack center" style={{ alignItems: "center", ["--gap" as string]: "8px" }}>
          <p style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-.025em" }} suppressHydrationWarning>Weiter als {animalName(animal)}</p>
          <p style={{ color: "#a89e8c", fontSize: 13.5 }}>Tippen öffnet deinen Lernraum</p>
        </div>
      </div>

      <div className="stack" style={{ ["--gap" as string]: "11px", marginTop: 26 }}>
        <div className="between baseline">
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#a89e8c" }}>Raumcode</span>
          <span style={{ fontSize: 12.5, color: "#8d8677" }}>von der Tafel oder per QR</span>
        </div>
        <RoomCodeInput dark onComplete={(code) => router.push(`/raum?code=${code}`)} />
        <p style={{ marginTop: 6, color: "#8d8677", fontSize: 12.5, textAlign: "center" }}>Ohne Konto · Tier änderst du später im Profil</p>
      </div>
    </div>
  );
}
