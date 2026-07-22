import React from "react";
import { MODES, useMode } from "../context/ModeContext";

export default function ModeLanding() {
  const { setMode } = useMode();

  return (
    <div className="mode-landing fade-in">
      <div className="mode-landing-title">Smart<span style={{ color: "#8c85ff" }}>Desk</span> 2.0</div>
      <div className="mode-landing-subtitle">Choose a mode to get started</div>

      <div className="mode-landing-grid">
        {MODES.map((m) => (
          <div
            key={m.key}
            className="mode-card"
            style={{ "--mode-card-color": m.theme["--accent"] }}
            onClick={() => setMode(m.key)}
          >
            <div className="mode-card-icon">{m.icon}</div>
            <div className="mode-card-name">{m.label}</div>
            <div className="mode-card-tagline">{m.tagline}</div>
            <p className="mode-card-desc">{m.description}</p>
            <ul className="mode-card-features">
              {m.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <button className="mode-card-select" onClick={(e) => { e.stopPropagation(); setMode(m.key); }}>
              Select {m.label} Mode →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
