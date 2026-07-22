import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAttendeeByQr } from "../api";

export default function AttendeeView() {
  const { qrId } = useParams();
  const navigate = useNavigate();
  const [attendee, setAttendee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getAttendeeByQr(qrId)
      .then((r) => setAttendee(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [qrId]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  if (notFound || !attendee) {
    return (
      <div className="page">
        <div className="empty">
          <div className="empty-icon">❌</div>
          <h3>Registration not found</h3>
          <button className="btn btn-ghost" onClick={() => navigate("/")}>← Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>
          {attendee.checked_in ? "✅" : "🎫"}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{attendee.name}</h1>
        {attendee.designation && (
          <p style={{ color: "var(--accent)", fontSize: 14, marginBottom: 2 }}>{attendee.designation}</p>
        )}
        {attendee.company && (
          <p style={{ color: "var(--muted)", marginBottom: 16 }}>{attendee.company}</p>
        )}

        <div style={{ background: "var(--surface2)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase" }}>
            Event
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{attendee.event_name || "—"}</div>
        </div>

        <div style={{ background: "var(--surface2)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase" }}>
            Entry Code
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "0.2em", color: "var(--accent2)" }}>
            {attendee.unique_code || "—"}
          </div>
        </div>

        <p style={{ color: attendee.checked_in ? "#00d4aa" : "var(--muted)", fontWeight: 600 }}>
          {attendee.checked_in ? "Already checked in" : "Not checked in yet — show this at the gate"}
        </p>
      </div>
    </div>
  );
}
