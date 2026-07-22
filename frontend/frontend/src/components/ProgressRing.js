import React from "react";

// Simple SVG circular progress ring — no charting library needed for a single %.
export default function ProgressRing({ percent = 0, size = 120, stroke = 10, color = "var(--accent)", label }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--border)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          fontSize={size * 0.22} fontWeight="800" fill="var(--text)"
        >
          {Math.round(percent)}%
        </text>
      </svg>
      {label && <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{label}</span>}
    </div>
  );
}
