"use client";

import { DEFAULT_TYPING, defaultHouse, defaultProfile, KEYS, streakDays, type DayActivity, type Deck, type HouseState, type Profile, type TypingState, type WordEntry } from "@/src/storage/personal";
import { useSeed, useStored } from "./use-stored";

const EMPTY_DECKS: Deck[] = [];
const EMPTY_WORDS: WordEntry[] = [];
const EMPTY_ACTIVITY: Record<string, DayActivity> = {};
const FALLBACK_PROFILE = defaultProfile();
const FALLBACK_HOUSE = defaultHouse();

/** Alle persönlichen Daten des Geräts (Profil, Stapel, Wörter, Aktivität, Tastenwelt, Haus). */
export function usePersonal() {
  useSeed();
  const [profile, setProfile] = useStored<Profile>("personal", KEYS.profile, FALLBACK_PROFILE);
  const [decks, setDecks] = useStored<Deck[]>("personal", KEYS.decks, EMPTY_DECKS);
  const [words, setWords] = useStored<WordEntry[]>("personal", KEYS.words, EMPTY_WORDS);
  const [activity] = useStored<Record<string, DayActivity>>("personal", KEYS.activity, EMPTY_ACTIVITY);
  const [typing, setTyping] = useStored<TypingState>("personal", KEYS.typing, DEFAULT_TYPING);
  const [house, setHouse] = useStored<HouseState>("personal", KEYS.house, FALLBACK_HOUSE);
  return { profile, setProfile, decks, setDecks, words, setWords, activity, streak: streakDays(activity), typing, setTyping, house, setHouse };
}
