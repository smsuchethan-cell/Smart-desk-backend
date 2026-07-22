import React, { useEffect, useState } from "react";
import { getStallCount, getHourlyTraffic } from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function Footfall() {
  const [stall, setStall] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([getStallCount(), getHourlyTraffic()])
      .then(([s, h]) => {
        if (s.status === "fulfilled") setStall(s.value.data);
        if (h.status === "fulfilled") setHourly(h.value.data.map(r => ({ name: `${r.hour}:00`, visitors: r.checkins })));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const peakHour = hourly.reduce((max, r) => r.visitors > (max?.visitors || 0) ? r : max, null);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>🔥 Footfall</h2>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Today's Footfall</div>
          <div className="stat-value">{stall?.today_count ?? 0}</div>
          <div className="stat-icon">👥</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Yesterday</div>
          <div className="stat-value">{stall?.yesterday_count ?? 0}</div>
          <div className="stat-icon">📅</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">All-Time Total</div>
          <div className="stat-value">{stall?.total_count ?? 0}</div>
          <div className="stat-icon">∑</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Peak Hour</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{peakHour ? peakHour.name : "—"}</div>
          <div className="stat-icon">🕐</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Footfall Heatmap — Today</h3>
        {hourly.every(h => h.visitors === 0) ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>No footfall recorded yet today</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourly} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="visitors" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
