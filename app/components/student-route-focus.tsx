"use client";

import { useEffect } from "react";

export function StudentRouteFocus({ activePath }: { activePath: string }) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>(
        ".student-dashboard h1",
      );
      if (!heading) return;
      if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activePath]);

  return null;
}
