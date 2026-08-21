"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { AppHeader } from "../app-header.tsx";
import { isSupabaseConfigured } from "../../../src/laufdiktat/supabase-client.ts";
import { createLernBoxService, type LernBoxService } from "../../../src/domain/lernbox-service.ts";
import { createIndexedDbRepositoryFactory } from "../../../src/storage/indexeddb-repository.ts";
import { buildDuellCandidates, applyDuellBoxAdvances } from "../../../src/duell/duell-vocab-bridge.ts";
import type { DuellArt, DuellWord } from "../../../src/duell/duell-content.ts";
import type { DuellRoundResult } from "../../../src/duell/duell-scoring.ts";
import type { VocabularyItemV1 } from "../../../src/domain/learning-bundle.ts";
import { DuellStart } from "./duell-start.tsx";
import { DuellLobby } from "./duell-lobby.tsx";
import { DuellPlay } from "./duell-play.tsx";
import { DuellResults } from "./duell-results.tsx";

const noopSubscribe = () => () => {};

/** Gleiches Muster wie überall sonst in der App: erst nach Hydration echten Client-Zustand (hier: IndexedDB) anfassen. */
function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export interface JoinedDuellIdentity {
  duellId: string;
  code: string;
  art: DuellArt;
  roundSize: number;
  alias: string;
  joinOrder: number;
  participantToken: string;
}

type View =
  | { stage: "start" }
  | { stage: "lobby"; identity: JoinedDuellIdentity }
  | { stage: "play"; identity: JoinedDuellIdentity; content: DuellWord[] }
  | { stage: "results"; identity: JoinedDuellIdentity; content: DuellWord[]; round: DuellRoundResult; ownItems: VocabularyItemV1[] };

export function DuellApp() {
  const isClient = useIsClient();
  const service = useMemo<LernBoxService | null>(
    () => (isClient ? createLernBoxService(createIndexedDbRepositoryFactory()) : null),
    [isClient],
  );
  const [view, setView] = useState<View>({ stage: "start" });

  if (!isSupabaseConfigured) {
    return (
      <main className="module-page">
        <AppHeader />
        <section className="module-hero">
          <p className="eyebrow">Gemeinsam üben</p>
          <h1>Duell</h1>
          <p>Duelle sind noch nicht eingerichtet. Die Lehrkraft muss zuerst ein Supabase-Projekt einrichten (siehe docs/architecture.md).</p>
        </section>
      </main>
    );
  }

  if (!isClient || !service) {
    return (
      <main className="module-page">
        <AppHeader />
        <section className="module-hero">
          <p>Lade …</p>
        </section>
      </main>
    );
  }

  async function handleRoundDone(identity: JoinedDuellIdentity, content: DuellWord[], round: DuellRoundResult) {
    const candidates = await buildDuellCandidates(service!);
    const ownItems = candidates.map((c) => c.item);
    await applyDuellBoxAdvances(service!, identity.duellId, content, round.wordResults, ownItems);
    setView({ stage: "results", identity, content, round, ownItems });
  }

  return (
    <main className="module-page">
      <AppHeader />
      <section className="module-hero module-hero--wide duell">
        <p className="eyebrow">Gemeinsam üben</p>
        <h1>Duell</h1>
        {view.stage === "start" && <DuellStart onJoined={(identity) => setView({ stage: "lobby", identity })} />}
        {view.stage === "lobby" && (
          <DuellLobby
            identity={view.identity}
            service={service}
            onLive={(content) => setView({ stage: "play", identity: view.identity, content })}
            onLeave={() => setView({ stage: "start" })}
          />
        )}
        {view.stage === "play" && (
          <DuellPlay
            identity={view.identity}
            content={view.content}
            onDone={(round) => void handleRoundDone(view.identity, view.content, round)}
          />
        )}
        {view.stage === "results" && (
          <DuellResults
            identity={view.identity}
            content={view.content}
            round={view.round}
            ownItems={view.ownItems}
            service={service}
            onLeave={() => setView({ stage: "start" })}
          />
        )}
      </section>
    </main>
  );
}
