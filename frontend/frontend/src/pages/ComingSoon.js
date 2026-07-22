import React from "react";
import { useLocation } from "react-router-dom";

const COPY = {
  "/employees": { icon: "👔", title: "Employees", desc: "Employee directory and daily check-in tracking is planned for Corporate mode." },
  "/meetings":  { icon: "🗓️", title: "Meetings", desc: "Meeting room booking and status indicators are planned for Corporate mode." },
};

export default function ComingSoon() {
  const { pathname } = useLocation();
  const copy = COPY[pathname] || { icon: "🚧", title: "Coming Soon", desc: "This feature is on the roadmap." };

  return (
    <div className="page fade-in">
      <div className="empty" style={{ paddingTop: 100 }}>
        <div className="empty-icon">{copy.icon}</div>
        <h3>{copy.title} — Coming Soon</h3>
        <p>{copy.desc}</p>
      </div>
    </div>
  );
}
