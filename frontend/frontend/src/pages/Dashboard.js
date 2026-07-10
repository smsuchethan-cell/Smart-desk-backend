import React, { useEffect, useState, useCallback } from "react";
import {
  getSummary,
  getScanStats,
  getAttendanceStats,
  getAttendanceSummary,
  getStallCount,
  getGpsLocation,
} from "../api";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const REFRESH_INTERVAL = 10000;

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
      <div
        style={{
          background: "#1a1a2e",
          border: "1px solid #2a2a45",
          borderRadius: 8,
          padding: "10px 14px",
        }}
      >
        <p style={{ color: "#7a7a9a", fontSize: 12 }}>{label}</p>
        <p style={{ color: "#6c63ff", fontWeight: 700 }}>
          {payload[0].value}
        </p>
      </div>
    );

  return null;
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [stallCount, setStallCount] = useState(null);

  // NEW
  const [gps, setGps] = useState(null);

  const [scans, setScans] = useState([]);
  const [attend, setAttend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(() => {
    Promise.allSettled([
      getSummary(),
      getScanStats(),
      getAttendanceStats(),
      getAttendanceSummary(),
      getStallCount(),
      getGpsLocation(),
    ])
      .then(([s, sc, at, attSum, stall, gpsData]) => {
        if (s.status === "fulfilled")
          setSummary(s.value.data);

        if (attSum.status === "fulfilled")
          setAttendance(attSum.value.data);

        if (stall.status === "fulfilled")
          setStallCount(stall.value.data);

        // NEW
        if (gpsData.status === "fulfilled")
          setGps(gpsData.value.data);

        if (sc.status === "fulfilled")
          setScans(
            sc.value.data.slice(0, 8).map((r) => ({
              name:
                r.product_name?.slice(0, 14) +
                (r.product_name?.length > 14 ? "…" : ""),
              scans: r.total_scans,
            }))
          );

        if (at.status === "fulfilled")
          setAttend(
            at.value.data.slice(0, 8).map((r) => ({
              name:
                r.event_name?.slice(0, 14) +
                (r.event_name?.length > 14 ? "…" : ""),
              checked_in: r.total_checked_in,
            }))
          );

        setLastRefresh(new Date().toLocaleTimeString());
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const timer = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchAll]);

  if (loading)
    return (
      <div className="loading-center">
        <div className="spinner" />
      </div>
    );

    console.log("GPS Data:", gps); // Debugging line to check GPS data

  return (
    <div className="page fade-in">

      {/* Header */}

      <div className="page-header">
        <h2>📊 Dashboard</h2>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {lastRefresh && (
            <span
              style={{
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              Updated {lastRefresh}
            </span>
          )}

          <span className="topbar-badge">
            🔴 Live
          </span>
        </div>
      </div>

      {/* Summary */}

      <div className="stat-grid">
        <StatCard
          label="Total Products"
          value={summary?.total_products}
          icon="📦"
        />

        <StatCard
          label="Total Scans"
          value={summary?.total_scans}
          icon="📷"
          color="green"
        />

        <StatCard
          label="Events"
          value={summary?.total_events}
          icon="🎪"
          color="yellow"
        />

        <StatCard
          label="Checked In"
          value={summary?.total_checked_in}
          icon="✅"
          color="red"
        />
      </div>

      {/* Stall Counter */}

      <div style={{ margin: "20px 0 8px" }}>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          📷 Live Stall Counter
        </h3>
      </div>

      <div
        className="stat-grid"
        style={{ marginBottom: 24 }}
      >
        <StatCard
          label="Today's Visitors"
          value={stallCount?.today_count ?? 0}
          icon="👥"
          color="green"
        />

        <StatCard
          label="Yesterday's Visitors"
          value={stallCount?.yesterday_count ?? 0}
          icon="📅"
          color="yellow"
        />

        <StatCard
          label="Total Visitors"
          value={stallCount?.total_count ?? 0}
          icon="∑"
          color="red"
        />

        <div className="stat-card">
          <div className="stat-label">
            CAMERA STATUS
          </div>

          <div
            className="stat-value"
            style={{
              fontSize: 18,
              color:
                (stallCount?.today_count ?? 0) > 0
                  ? "#00d4aa"
                  : "#7a7a9a",
            }}
          >
            {(stallCount?.today_count ?? 0) > 0
              ? "🟢 LIVE"
              : "⚪ WAITING"}
          </div>

          <div className="stat-icon">
            📡
          </div>
        </div>
      </div>
            {/* ── Attendance Analytics Cards ── */}
      <div style={{ margin: "20px 0 8px" }}>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          📅 Attendance Analytics
        </h3>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="Today's Attendance"
          value={attendance?.today_count}
          icon="🕐"
          color="green"
        />

        <StatCard
          label="Previous Events Total"
          value={attendance?.previous_total}
          icon="🗂️"
          color="yellow"
        />

        <StatCard
          label="Unique Registered People"
          value={attendance?.total_unique_people}
          icon="👤"
        />

        <StatCard
          label="All-Time Total"
          value={attendance?.all_time_total}
          icon="∑"
          color="red"
        />
      </div>

      {/* ───────────── NEW GPS SECTION ───────────── */}

      <div style={{ margin: "20px 0 8px" }}>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          📍 Stall Live Location
        </h3>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        {gps?.latitude && gps?.longitude ? (
          <>
            <iframe
              title="Stall Map"
              width="100%"
              height="350"
              style={{
                border: 0,
                borderRadius: 12,
              }}
              loading="lazy"
              allowFullScreen
              src={`https://maps.google.com/maps?q=${gps.latitude},${gps.longitude}&z=17&output=embed`}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 15,
                color: "#aaa",
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>Latitude:</strong>{" "}
                {gps.latitude}
              </div>

              <div>
                <strong>Longitude:</strong>{" "}
                {gps.longitude}
              </div>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${gps.latitude},${gps.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "#6c63ff",
                  color: "#fff",
                  padding: "8px 18px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                🧭 Navigate
              </a>
            </div>
          </>
        ) : (
          <div
            style={{
              height: 350,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#888",
              fontSize: 18,
            }}
          >
            Waiting for GPS...
          </div>
        )}
      </div>

      {/* ── Charts ── */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        <div className="card">
          <h3
            style={{
              marginBottom: 20,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Product Scans
          </h3>

          {scans.length === 0 ? (
            <p
              style={{
                color: "var(--muted)",
                textAlign: "center",
                padding: "32px 0",
              }}
            >
              No scan data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scans} margin={{ left: -10 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2a2a45"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  tick={{ fill: "#7a7a9a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fill: "#7a7a9a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} />

                <Bar
                  dataKey="scans"
                  fill="#6c63ff"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3
            style={{
              marginBottom: 20,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Event Attendance
          </h3>

          {attend.length === 0 ? (
            <p
              style={{
                color: "var(--muted)",
                textAlign: "center",
                padding: "32px 0",
              }}
            >
              No events yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={attend} margin={{ left: -10 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2a2a45"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  tick={{ fill: "#7a7a9a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fill: "#7a7a9a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} />

                <Bar
                  dataKey="checked_in"
                  fill="#00d4aa"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}