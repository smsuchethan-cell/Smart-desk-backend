import React, { useEffect, useState, useCallback } from "react";
import { getSummary, getRecentCheckins, getEmployeeCheckinsToday, getMeetingsStatus } from "../api";

const REFRESH_INTERVAL = 10000;

export default function CorporateDashboard() {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [employeeCheckins, setEmployeeCheckins] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(() => {
    Promise.allSettled([getSummary(), getRecentCheckins(8), getEmployeeCheckinsToday(), getMeetingsStatus()])
      .then(([s, r, ec, m]) => {
        if (s.status === "fulfilled") setSummary(s.value.data);
        if (r.status === "fulfilled") setRecent(r.value.data);
        if (ec.status === "fulfilled") setEmployeeCheckins(ec.value.data);
        if (m.status === "fulfilled") setMeetings(m.value.data);
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

  const ongoingMeetings = meetings.filter(m => m.status === "ongoing");

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>🏢 Corporate Dashboard</h2>
        {lastRefresh && <span style={{ fontSize: 12, color: "var(--muted)" }}>Updated {lastRefresh}</span>}
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Employees</div><div className="stat-value">{employeeCheckins?.total_employees ?? 0}</div><div className="stat-icon">👔</div></div>
        <div className="stat-card green"><div className="stat-label">Checked In Today</div><div className="stat-value">{employeeCheckins?.present_count ?? 0}</div><div className="stat-icon">✅</div></div>
        <div className="stat-card yellow"><div className="stat-label">Visitor Check-ins</div><div className="stat-value">{summary?.total_checked_in ?? 0}</div><div className="stat-icon">🧑‍💼</div></div>
        <div className="stat-card red"><div className="stat-label">Meetings Ongoing Now</div><div className="stat-value">{ongoingMeetings.length}</div><div className="stat-icon">🟢</div></div>
      </div>

      {ongoingMeetings.length > 0 && (
        <>
          <h3 className="section-label">🟢 Meeting Rooms In Use Right Now</h3>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Title</th><th>Room</th><th>Organizer</th><th>Ends</th></tr></thead>
                <tbody>
                  {ongoingMeetings.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{m.title}</td>
                      <td>{m.room || "—"}</td>
                      <td style={{ color: "var(--muted)" }}>{m.organizer || "—"}</td>
                      <td>{new Date(m.end_time).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <h3 className="section-label">🕐 Visitor Check-in Timeline</h3>

      <div className="card">
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
    </div>
  );
}
