import React, { useEffect, useState, useCallback } from "react";
import { getSummary, getRecentCheckins } from "../api";

const REFRESH_INTERVAL = 10000;

export default function CorporateDashboard() {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(() => {
    Promise.allSettled([getSummary(), getRecentCheckins(8)])
      .then(([s, r]) => {
        if (s.status === "fulfilled") setSummary(s.value.data);
        if (r.status === "fulfilled") setRecent(r.value.data);
        setLastRefresh(new Date().toLocaleTimeString());
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const timer = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchAll]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>🏢 Corporate Dashboard</h2>
        {lastRefresh && <span style={{ fontSize: 12, color: "var(--muted)" }}>Updated {lastRefresh}</span>}
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Visitor Check-ins</div><div className="stat-value">{summary?.total_checked_in ?? 0}</div><div className="stat-icon">🧑‍💼</div></div>
        <div className="stat-card green"><div className="stat-label">Meetings Hosted</div><div className="stat-value">{summary?.total_events ?? 0}</div><div className="stat-icon">🗓️</div></div>
        <div className="stat-card yellow"><div className="stat-label">Registered Visitors</div><div className="stat-value">{summary?.total_checked_in ?? 0}</div><div className="stat-icon">👔</div></div>
      </div>

      <h3 className="section-label">🕐 Visitor Check-in Timeline</h3>

      <div className="card" style={{ marginBottom: 24 }}>
        {recent.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>No check-ins yet</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Company</th><th>Meeting</th><th>Time</th></tr></thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.attendance_id}>
                    <td style={{ fontWeight: 600 }}>{r.attendee_name}</td>
                    <td style={{ color: "var(--muted)" }}>{r.company || "—"}</td>
                    <td>{r.event_name}</td>
                    <td style={{ color: "var(--muted)" }}>{new Date(r.checked_in_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="empty" style={{ padding: "32px 0" }}>
        <div className="empty-icon">👔</div>
        <h3>Employee directory & meeting rooms — coming soon</h3>
        <p>This dashboard currently shows visitor check-in data. Dedicated employee and meeting-room tracking is planned but not built yet.</p>
      </div>
    </div>
  );
}
