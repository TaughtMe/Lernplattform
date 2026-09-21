"use client";

import { useState, useSyncExternalStore } from "react";

const subscribeToHydration = () => () => {};

export function StudentSidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  return (
    <button
      type="button"
      className="student-sidebar-toggle"
      aria-label={
        collapsed ? "Seitenleiste ausklappen" : "Seitenleiste einklappen"
      }
      aria-controls="student-sidebar"
      aria-expanded={!collapsed}
      aria-pressed={collapsed}
      disabled={!hydrated}
      title={collapsed ? "Seitenleiste ausklappen" : "Seitenleiste einklappen"}
      onClick={() => setCollapsed((value) => !value)}
    >
      <span aria-hidden="true">{collapsed ? "→" : "←"}</span>
    </button>
  );
}
