"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VocabularyPickerProps } from "../../../views/laufdiktat/vocabulary-picker";
import {
  DEFAULT_VOCABULARY_LOCALES,
  pickerLocale,
  type VocabularyLocales,
  type VocabularyPair,
} from "../../../../src/domain/running-dictation";
import type { TeacherContentPackage } from "../../../../src/domain/teacher-content-library";
import {
  contentKindOf,
  filterByClass,
  UNASSIGNED,
} from "../../../../src/domain/teacher-content-summary";
import {
  buildVocabularyCatalog,
  describeMerge,
  filterVocabularyCatalog,
  mergeIntoHeft,
  selectedPairs,
  selectedSourceTitles,
  suggestQuizTitle,
} from "../../../../src/domain/vocabulary-catalog";
import { createTeacherContentLibraryRepository } from "../../../../src/storage/teacher-class-settings";

type Args = {
  activeClass: string;
  liveClasses: ReadonlyArray<{ id: string; name: string }>;
  vocabularyPairs: readonly VocabularyPair[];
  vocabularyLocales: VocabularyLocales;
  applyVocabularyPairs: (pairs: VocabularyPair[]) => void;
  setVocabularyLocales: (locales: VocabularyLocales) => void;
  contentId: string | null;
  setContentId: (id: string | null) => void;
  title: string;
  setTitle: (title: string) => void;
  setNotice: (text: string) => void;
  clock: () => number;
};

/**
 * Zustand des Auswahldialogs „Aus meinen Vokabeln wählen“. Die Auswahl gilt
 * nur, solange der Dialog offen ist; übernommen wird sie als neue Abfrage
 * (`contentId` wird gelöst, damit kein geladenes Paket überschrieben wird).
 */
export function useVocabularyPicker(args: Args) {
  const [open, setOpen] = useState(false);
  const [library, setLibrary] = useState<TeacherContentPackage[]>([]);
  const [query, setQueryState] = useState("");
  const [allClasses, setAllClasses] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  // Von Hand auf- oder zugeklappt; sonst entscheiden Suche und Paketzahl.
  const [folded, setFolded] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [quizFromLibrary, setQuizFromLibrary] = useState(false);
  const lastSuggestion = useRef("");

  const reload = useCallback(async () => {
    try {
      setLibrary(await createTeacherContentLibraryRepository().list());
    } catch {
      setLibrary([]);
    }
  }, []);

  // Beim Start (für den Knopf) und bei jeder Änderung auf „Inhalte“.
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (active) void reload();
    };
    refresh();
    window.addEventListener("teacher-data-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("teacher-data-changed", refresh);
    };
  }, [reload]);

  // Vollständiger Katalog: darauf beziehen sich Auswahl und Übernahme.
  const fullCatalog = useMemo(() => buildVocabularyCatalog(library), [library]);
  const hasPackages = fullCatalog.length > 0;

  const classCatalog = useMemo(() => {
    if (allClasses) return fullCatalog;
    const ids = new Set(args.liveClasses.map(({ id }) => id));
    const inClass = new Set(
      filterByClass(
        library.filter((entry) => contentKindOf(entry) === "vocabulary"),
        args.activeClass || UNASSIGNED,
        ids,
      ).map(({ id }) => id),
    );
    return fullCatalog.filter(({ id }) => inClass.has(id));
  }, [allClasses, args.activeClass, args.liveClasses, fullCatalog, library]);

  const heftIsEmpty = !args.vocabularyPairs.some(
    (pair) => pair.left.primary.trim() && pair.right.primary.trim(),
  );
  // Leeres Heft: das Sprachpaar des ersten angehakten Pakets legt es fest.
  const firstPickedId = [...selected][0]?.split(":")[0];
  const firstPicked = fullCatalog.find(({ id }) => id === firstPickedId);
  const firstPickedLocales = firstPicked?.promptLocale;
  const firstPickedAnswer = firstPicked?.answerLocale;
  const heftLocales = args.vocabularyLocales;
  const locales = useMemo<VocabularyLocales | null>(() => {
    if (!heftIsEmpty) return heftLocales;
    return firstPickedLocales && firstPickedAnswer
      ? { left: firstPickedLocales, right: firstPickedAnswer }
      : null;
  }, [heftIsEmpty, heftLocales, firstPickedLocales, firstPickedAnswer]);

  const { visible, hiddenByLanguage } = useMemo(
    () => filterVocabularyCatalog(classCatalog, { query, locales }),
    [classCatalog, query, locales],
  );

  const expanded = new Set(
    visible
      .filter(
        ({ id }) =>
          folded.get(id) ?? (query.trim() !== "" || visible.length === 1),
      )
      .map(({ id }) => id),
  );

  function openPicker() {
    setSelected(new Set());
    setFolded(new Map());
    setQueryState("");
    setAllClasses(false);
    setOpen(true);
    void reload();
  }

  function toggle(keys: readonly string[], checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const key of keys) {
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  function confirm() {
    const picked = selectedPairs(fullCatalog, selected).map((pair) => ({
      ...pair,
      id: crypto.randomUUID(),
    }));
    if (picked.length === 0) return;
    const result = mergeIntoHeft(args.vocabularyPairs, picked);
    setOpen(false);
    args.setNotice(describeMerge(result));
    // Nichts Neues im Heft: Inhalt, Titel und Ablage bleiben, wie sie sind.
    if (result.added === 0) return;
    args.applyVocabularyPairs(result.pairs);
    if (result.replaced && firstPicked) {
      args.setVocabularyLocales({
        left: pickerLocale(
          firstPicked.promptLocale,
          DEFAULT_VOCABULARY_LOCALES.left,
        ),
        right: pickerLocale(
          firstPicked.answerLocale,
          DEFAULT_VOCABULARY_LOCALES.right,
        ),
      });
    }
    // Das Heft ist jetzt eine neue Abfrage: kein Paket der Ablage überschreiben.
    const loadedTitle = library.find(({ id }) => id === args.contentId)?.title;
    args.setContentId(null);
    setQuizFromLibrary(true);
    const current = args.title.trim();
    if (
      !current ||
      current === loadedTitle ||
      current === lastSuggestion.current
    ) {
      lastSuggestion.current = suggestQuizTitle(
        selectedSourceTitles(fullCatalog, selected),
        new Date(args.clock()),
      );
      args.setTitle(lastSuggestion.current);
    }
  }

  const picker: VocabularyPickerProps = {
    open,
    packages: visible,
    hiddenByLanguage,
    query,
    allClasses,
    className: args.liveClasses.find(({ id }) => id === args.activeClass)?.name,
    selected,
    expanded,
    onQuery: (value) => {
      setQueryState(value);
      setFolded(new Map());
    },
    onAllClasses: setAllClasses,
    onToggle: toggle,
    onExpand: (id, next) =>
      setFolded((current) => new Map(current).set(id, next)),
    onClear: () => setSelected(new Set()),
    onConfirm: confirm,
    onClose: () => setOpen(false),
  };

  return {
    picker,
    onPickFromLibrary: openPicker,
    pickFromLibraryDisabled: !hasPackages,
    /** Gilt nur, solange das Heft noch nicht als neues Paket abgelegt ist. */
    quizFromLibrary: quizFromLibrary && args.contentId === null,
    resetQuizFromLibrary: () => setQuizFromLibrary(false),
  };
}
