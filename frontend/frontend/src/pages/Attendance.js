import React, { useEffect, useState } from "react";
import { getTodayAttendance, getStudents } from "../api";
import ProgressRing from "../components/ProgressRing";

export default function Attendance() {
  const [attendance, setAttendance] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([getTodayAttendance(), getStudents()])
      .then(([a, s]) => {
        if (a.status === "fulfilled") setAttendance(a.value.data);
        if (s.status === "fulfilled") setStudents(s.value.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const total = attendance?.total_students || 0;
  const present = attendance?.present_count || 0;
  const onLeave = attendance?.on_leave_count || 0;
  const absent = attendance?.absent_count ?? Math.max(total - present - onLeave, 0);
  const percent = total ? (present / total) * 100 : 0;
  const presentIds = new Set((attendance?.present || []).map(p => p.student_id));
  const onLeaveList = attendance?.on_leave || [];
  const onLeaveIds = new Set(onLeaveList.map(p => p.student_id));
  const absentees = students.filter(s => !presentIds.has(s.id) && !onLeaveIds.has(s.id));

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>✅ Today's Attendance</h2>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Present Today</h3>
          {(attendance?.present || []).length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>No one checked in yet</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Roll No.</th><th>Time</th></tr></thead>
                <tbody>
                  {attendance.present.map(p => (
                    <tr key={p.student_id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.roll_number}</td>
                      <td>{new Date(p.marked_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>On Leave Today</h3>
          {onLeaveList.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>No one on approved leave today</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Roll No.</th><th>Reason</th></tr></thead>
                <tbody>
                  {onLeaveList.map(p => (
                    <tr key={p.student_id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.roll_number}</td>
                      <td style={{ color: "var(--muted)" }}>{p.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Absent Today</h3>
          {absentees.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>Everyone's accounted for 🎉</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Roll No.</th><th>Status</th></tr></thead>
                <tbody>
                  {absentees.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.roll_number}</td>
                      <td><span className="badge badge-red">Absent</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
