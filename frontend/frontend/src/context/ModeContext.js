import React, { createContext, useContext, useState, useEffect } from "react";
import schoolTheme    from "../themes/school";
import corporateTheme from "../themes/corporate";
import eventTheme     from "../themes/event";
import retailTheme    from "../themes/retail";

export const MODES = [
  {
    key: "School",
    label: "School",
    icon: "🎓",
    tagline: "Fresh, friendly, trustworthy",
    description: "Face-recognition attendance, class analytics, holidays & leave.",
    features: ["Face attendance via Pi Camera", "Class-wise attendance breakdown", "Holiday & leave management", "Annual report export"],
    theme: schoolTheme,
  },
  {
    key: "Corporate",
    label: "Corporate",
    icon: "🏢",
    tagline: "Dark, premium, executive",
    description: "Employee check-ins, visitor management, meeting rooms.",
    features: ["Employee check-in timeline", "Visitor badge preview", "Meeting room status", "Department analytics"],
    theme: corporateTheme,
  },
  {
    key: "Event",
    label: "Event",
    icon: "🎪",
    tagline: "Vibrant, energetic, exciting",
    description: "Gate check-in, badge printing, live attendee counters.",
    features: ["Live attendee ticker", "Gate QR check-in", "Badge printing", "Real-time analytics"],
    theme: eventTheme,
  },
  {
    key: "Retail",
    label: "Retail",
    icon: "🛍️",
    tagline: "Warm, commercial, conversion-focused",
    description: "Product scans, footfall tracking, lead capture.",
    features: ["Footfall heatmap", "Lead capture counter", "Product scan leaderboard", "Sales reports"],
    theme: retailTheme,
  },
];

const STORAGE_KEY = "smartdesk_mode";

const ModeContext = createContext(null);

function applyTheme(themeTokens) {
  const root = document.documentElement;
  Object.entries(themeTokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(() => localStorage.getItem(STORAGE_KEY) || null);

  useEffect(() => {
    const current = MODES.find((m) => m.key === mode);
    if (current) applyTheme(current.theme);
  }, [mode]);

  const setMode = (next) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const clearMode = () => {
    setModeState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ModeContext.Provider value={{ mode, setMode, clearMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used inside a ModeProvider");
  return ctx;
}
