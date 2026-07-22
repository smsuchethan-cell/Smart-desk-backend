import React, { useEffect, useState } from "react";
import { getClassBreakdown, ROOT } from "../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function SchoolAnalytics() {
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClassBreakdown()
      .then(r => setBreakdown(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const totalStudents = breakdown.reduce((sum, c) => sum + c.total, 0);
  const totalPresent  = breakdown.reduce((sum, c) => sum + c.present, 0);
  const totalOnLeave  = breakdown.reduce((sum, c) => sum + (c.on_leave || 0), 0);
  const totalAbsent   = breakdown.reduce((sum, c) => sum + c.absent, 0);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>🎓 School Analytics</h2>
        <a
          className="btn btn-primary"
          href={`${ROOT}/api/v1/school/report/annual`}
        >
          ⬇ Export Annual Report
        </a>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Students</div>
          <div className="stat-value">{totalStudents}</div>
          <div className="stat-icon">🎓</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Present Today</div>
          <div className="stat-value">{totalPresent}</div>
          <div className="stat-icon">✅</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">On Leave</div>
          <div className="stat-value">{totalOnLeave}</div>
          <div className="stat-icon">📝</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Absent Today</div>
          <div className="stat-value">{totalAbsent}</div>
          <div className="stat-icon">❌</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>
          Class-wise Attendance (Today)
        </h3>

        {breakdown.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>
            No students registered yet
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={breakdown} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="class_section" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="present"  name="Present"  fill="var(--accent2)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="on_leave" name="On Leave" fill="var(--warning)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="absent"   name="Absent"   fill="var(--danger)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {breakdown.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Class</th><th>Total</th><th>Present</th><th>On Leave</th><th>Absent</th><th>Attendance %</th></tr>
              </thead>
              <tbody>
                {breakdown.map(c => (
                  <tr key={c.class_section}>
                    <td style={{ fontWeight: 600 }}>{c.class_section}</td>
                    <td>{c.total}</td>
                    <td><span className="badge badge-green">{c.present}</span></td>
                    <td><span className="badge badge-yellow">{c.on_leave || 0}</span></td>
                    <td><span className="badge badge-red">{c.absent}</span></td>
                    <td>{c.total ? Math.round((c.present / c.total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
