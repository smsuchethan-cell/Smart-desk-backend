import React, { useEffect, useState } from "react";
import { useMode } from "../context/ModeContext";
import { getSummary, getScanStats, ROOT } from "../api";

export default function Reports() {
  const { mode } = useMode();
  const [summary, setSummary] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([getSummary(), getScanStats()])
      .then(([s, sc]) => {
        if (s.status === "fulfilled") setSummary(s.value.data);
        if (sc.status === "fulfilled") setScans(sc.value.data.sort((a, b) => b.total_scans - a.total_scans));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>📊 Reports</h2>
        {mode === "Corporate" && (
          <a className="btn btn-primary" href={`${ROOT}/api/v1/attendees/export`}>⬇ Export Visitor Log</a>
        )}
      </div>

      {mode === "Corporate" && (
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card"><div className="stat-label">Visitor Check-ins</div><div className="stat-value">{summary?.total_checked_in ?? 0}</div><div className="stat-icon">🏢</div></div>
          <div className="stat-card green"><div className="stat-label">Meetings Hosted</div><div className="stat-value">{summary?.total_events ?? 0}</div><div className="stat-icon">🗓️</div></div>
        </div>
      )}

      {mode === "Retail" && (
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>🏆 Product Scan Leaderboard</h3>
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
      )}
    </div>
  );
}
