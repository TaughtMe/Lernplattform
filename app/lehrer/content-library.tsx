"use client";

import { ClassAssignDialog } from "../views/lehrer/class-assign-dialog";
import { ContentLibraryScreen } from "../views/lehrer/content-library-screen";
import { StartSheet } from "../views/lehrer/start-sheet";
import { useContentLibrary } from "./use-content-library";

/** Seite „Inhalte“ (Design 3c/3d): Ablage der gewählten Klasse. */
export function ContentLibrary() {
  const { screen, assign, start } = useContentLibrary();
  return (
    <>
      <ContentLibraryScreen {...screen} />
      <StartSheet {...start} />
      <ClassAssignDialog {...assign} />
    </>
  );
}
