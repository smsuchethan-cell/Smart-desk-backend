import React, { useEffect, useState, useCallback } from "react";
import { getStallCount, getHourlyTraffic, getScanStats, getSummary, getEnquiries, getRevenuePotential } from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const REFRESH_INTERVAL = 10000;

export default function RetailDashboard() {
  const [stall, setStall] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [scans, setScans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [leadCount, setLeadCount] = useState(0);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(() => {
    Promise.allSettled([getStallCount(), getHourlyTraffic(), getScanStats(), getSummary(), getEnquiries(), getRevenuePotential()])
      .then(([s, h, sc, sum, leads, rev]) => {
        if (s.status === "fulfilled") setStall(s.value.data);
        if (h.status === "fulfilled") setHourly(h.value.data.map(r => ({ name: `${r.hour}:00`, visitors: r.checkins })));
        if (sc.status === "fulfilled") setScans(sc.value.data.sort((a, b) => b.total_scans - a.total_scans).slice(0, 5));
        if (sum.status === "fulfilled") setSummary(sum.value.data);
        if (leads.status === "fulfilled") setLeadCount(leads.value.data.length);
        if (rev.status === "fulfilled") setRevenue(rev.value.data);
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

  const peakHour = hourly.reduce((max, r) => r.visitors > (max?.visitors || 0) ? r : max, null);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>🛍️ Retail Dashboard</h2>
        {lastRefresh && <span style={{ fontSize: 12, color: "var(--muted)" }}>Updated {lastRefresh}</span>}
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Total Products</div><div className="stat-value">{summary?.total_products ?? 0}</div><div className="stat-icon">📦</div></div>
        <div className="stat-card green"><div className="stat-label">Today's Footfall</div><div className="stat-value">{stall?.today_count ?? 0}</div><div className="stat-icon">👥</div></div>
        <div className="stat-card yellow"><div className="stat-label">Leads Captured</div><div className="stat-value">{leadCount}</div><div className="stat-icon">💬</div></div>
        <div className="stat-card red"><div className="stat-label">Peak Hour</div><div className="stat-value" style={{ fontSize: 22 }}>{peakHour ? peakHour.name : "—"}</div><div className="stat-icon">🕐</div></div>
      </div>

      <h3 className="section-label">🔥 Footfall Heatmap — Today</h3>

      <div className="card" style={{ marginBottom: 24 }}>
        {hourly.every(h => h.visitors === 0) ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>No footfall recorded yet today</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
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

      <h3 className="section-label">💰 Revenue Potential</h3>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent2)" }}>
            ₹{(revenue?.total_revenue_potential ?? 0).toLocaleString()}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            if every recorded scan became a sale (price × scan count, summed across all products)
          </div>
        </div>
      </div>

      <h3 className="section-label">🏆 Top Scanned Products</h3>

      <div className="card">
        {scans.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>No scans recorded yet</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Product</th><th>Scans</th></tr></thead>
              <tbody>
                {scans.map((s, i) => (
                  <tr key={s.product_id}>
                    <td><span className="badge badge-purple">{i + 1}</span></td>
                    <td style={{ fontWeight: 600 }}>{s.product_name}</td>
                    <td>{s.total_scans}</td>
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
