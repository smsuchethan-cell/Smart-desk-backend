import React, { useEffect, useState, useCallback } from "react";
import {
  getSummary,
  getScanStats,
  getAttendanceStats,
  getAttendanceSummary,
  getStallCount,
  getGpsLocation,
  getHourlyTraffic,
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
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 14px",
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: 12 }}>{label}</p>
        <p style={{ color: "var(--accent)", fontWeight: 700 }}>
          {payload[0].value}
        </p>
      </div>
    );

  return null;
};

export default function EventDashboard() {
  const [summary, setSummary] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [stallCount, setStallCount] = useState(null);
  const [gps, setGps] = useState(null);
  const [scans, setScans] = useState([]);
  const [attend, setAttend] = useState([]);
  const [hourly, setHourly] = useState([]);
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
      getHourlyTraffic(),
    ])
      .then(([s, sc, at, attSum, stall, gpsData, hourlyData]) => {
        if (s.status === "fulfilled")
          setSummary(s.value.data);

        if (attSum.status === "fulfilled")
          setAttendance(attSum.value.data);

        if (stall.status === "fulfilled")
          setStallCount(stall.value.data);

        if (gpsData.status === "fulfilled")
          setGps(gpsData.value.data);

        if (hourlyData.status === "fulfilled")
          setHourly(
            hourlyData.value.data.map((r) => ({
              name: `${r.hour}:00`,
              checkins: r.checkins,
            }))
          );

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

  return (
    <div className="page fade-in">

      {/* Header */}

      <div className="page-header">
        <h2>🎪 Event Dashboard</h2>

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

      <h3 className="section-label">📷 Live Stall Counter</h3>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
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
            style={{ fontSize: 18, color: stallCount?.camera_live ? "var(--accent2)" : "var(--muted)" }}
          >
            {stallCount?.camera_live ? "🟢 LIVE" : "⚪ OFFLINE"}
          </div>

          <div className="stat-icon">
            📡
          </div>
        </div>
      </div>

      <h3 className="section-label">📅 Attendance Analytics</h3>

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

      {/* ───────────── GPS SECTION ───────────── */}

      <h3 className="section-label">📍 Stall Live Location</h3>

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
                  background: "var(--accent)",
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

      {/* ── Peak Hours ── */}

      <h3 className="section-label">🔥 Live Visitor Heatmap — Today's Peak Hours</h3>

      <div className="card" style={{ marginBottom: 24 }}>
        {hourly.every((h) => h.checkins === 0) ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>
            No check-ins yet today
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourly} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="checkins" fill="var(--danger)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
                  stroke="var(--border)"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} />

                <Bar
                  dataKey="scans"
                  fill="var(--accent)"
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
                  stroke="var(--border)"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} />

                <Bar
                  dataKey="checked_in"
                  fill="var(--accent2)"
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
