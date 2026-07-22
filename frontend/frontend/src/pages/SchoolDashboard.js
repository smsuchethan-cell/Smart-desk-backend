import React, { useEffect, useState, useCallback } from "react";
import { getTodayAttendance, getClassBreakdown } from "../api";
import ProgressRing from "../components/ProgressRing";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";

const REFRESH_INTERVAL = 10000;

export default function SchoolDashboard() {
  const [attendance, setAttendance] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(() => {
    Promise.allSettled([getTodayAttendance(), getClassBreakdown()])
      .then(([a, b]) => {
        if (a.status === "fulfilled") setAttendance(a.value.data);
        if (b.status === "fulfilled") setBreakdown(b.value.data);
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

  const total = attendance?.total_students || 0;
  const present = attendance?.present_count || 0;
  const onLeave = attendance?.on_leave_count || 0;
  const absent = attendance?.absent_count ?? Math.max(total - present - onLeave, 0);
  const percent = total ? (present / total) * 100 : 0;
  const recentPresent = (attendance?.present || []).slice(0, 6);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>🎓 School Dashboard</h2>
        {lastRefresh && <span style={{ fontSize: 12, color: "var(--muted)" }}>Updated {lastRefresh}</span>}
      </div>

      <div className="card" style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap", marginBottom: 24 }}>
        <ProgressRing percent={percent} color="var(--accent2)" label="Present today" size={140} stroke={12} />
        <div className="stat-grid" style={{ flex: 1, marginBottom: 0 }}>
          <div className="stat-card"><div className="stat-label">Total Students</div><div className="stat-value">{total}</div><div className="stat-icon">🎓</div></div>
          <div className="stat-card green"><div className="stat-label">Present</div><div className="stat-value">{present}</div><div className="stat-icon">✅</div></div>
          <div className="stat-card yellow"><div className="stat-label">On Leave</div><div className="stat-value">{onLeave}</div><div className="stat-icon">📝</div></div>
          <div className="stat-card red"><div className="stat-label">Absent</div><div className="stat-value">{absent}</div><div className="stat-icon">❌</div></div>
        </div>
      </div>

      <h3 className="section-label">📊 Class-wise Attendance (Today)</h3>

      <div className="card" style={{ marginBottom: 24 }}>
        {breakdown.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>No students registered yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={breakdown} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="class_section" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Present" fill="var(--accent2)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="absent" name="Absent" fill="var(--danger)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <h3 className="section-label">✅ Recently Checked In</h3>

      <div className="card">
        {recentPresent.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>No one checked in yet today</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Roll No.</th><th>Class</th><th>Time</th></tr></thead>
              <tbody>
                {recentPresent.map(p => (
                  <tr key={p.student_id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.roll_number}</td>
                    <td>{p.class_section || "—"}</td>
                    <td style={{ color: "var(--muted)" }}>{new Date(p.marked_at).toLocaleTimeString()}</td>
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
