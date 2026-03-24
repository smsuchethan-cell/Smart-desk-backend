import React, { useEffect, useState } from "react";
import { getSummary, getScanStats, getTopProducts, getAttendanceStats } from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`stat-card ${color || ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? "—"}</div>
      <div className="stat-icon">{icon}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length)
    return (
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a45", borderRadius: 8, padding: "10px 14px" }}>
        <p style={{ color: "#7a7a9a", fontSize: 12 }}>{label}</p>
        <p style={{ color: "#6c63ff", fontWeight: 700 }}>{payload[0].value}</p>
      </div>
    );
  return null;
};

export default function Dashboard() {
  const [summary, setSummary]   = useState(null);
  const [scans, setScans]       = useState([]);
  const [attend, setAttend]     = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getSummary(), getScanStats(), getAttendanceStats()])
      .then(([s, sc, at]) => {
        setSummary(s.data);
        setScans(sc.data.slice(0, 8).map(r => ({ name: r.product_name?.slice(0, 14) + (r.product_name?.length > 14 ? "…" : ""), scans: r.total_scans })));
        setAttend(at.data.slice(0, 8).map(r => ({ name: r.event_name?.slice(0, 14) + (r.event_name?.length > 14 ? "…" : ""), checked_in: r.total_checked_in })));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>📊 Dashboard</h2>
        <span className="topbar-badge">Live</span>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Products" value={summary?.total_products} icon="📦" />
        <StatCard label="Total Scans"    value={summary?.total_scans}    icon="📷" color="green" />
        <StatCard label="Events"         value={summary?.total_events}   icon="🎪" color="yellow" />
        <StatCard label="Checked In"     value={summary?.total_checked_in} icon="✅" color="red" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Product Scans</h3>
          {scans.length === 0
            ? <p style={{ color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>No scan data yet</p>
            : <ResponsiveContainer width="100%" height={250}>
                <BarChart data={scans} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a45" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#7a7a9a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7a7a9a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="scans" fill="#6c63ff" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Event Attendance</h3>
          {attend.length === 0
            ? <p style={{ color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>No events yet</p>
            : <ResponsiveContainer width="100%" height={250}>
                <BarChart data={attend} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a45" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#7a7a9a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7a7a9a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="checked_in" fill="#00d4aa" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>
    </div>
  );
}
