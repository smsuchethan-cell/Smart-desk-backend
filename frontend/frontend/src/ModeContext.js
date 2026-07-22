import React, { createContext, useContext, useState } from "react";

export const MODES = [
  { key: "Event",     label: "🎪 Event",     icon: "🎪" },
  { key: "School",    label: "🎓 School",    icon: "🎓" },
  { key: "Corporate", label: "🏢 Corporate", icon: "🏢" },
  { key: "Retail",    label: "🛍️ Retail",    icon: "🛍️" },
];

const STORAGE_KEY = "smartdesk_mode";

const ModeContext = createContext(null);

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "Event"
  );

  const setMode = (next) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used inside a ModeProvider");
  return ctx;
}
