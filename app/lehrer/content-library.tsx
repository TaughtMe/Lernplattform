"use client";

import { ClassAssignDialog } from "../views/lehrer/class-assign-dialog";
import { ContentLibraryScreen } from "../views/lehrer/content-library-screen";
import { useContentLibrary } from "./use-content-library";

/** Seite „Inhalte“ (Design 3c/3d): Ablage der gewählten Klasse. */
export function ContentLibrary() {
  const { screen, assign } = useContentLibrary();
  return (
    <>
      <ContentLibraryScreen {...screen} />
      <ClassAssignDialog {...assign} />
    </>
  );
}
