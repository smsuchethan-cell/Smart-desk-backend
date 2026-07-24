import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEvent } from "../api";
import axios from "axios";
import toast from "react-hot-toast";

const BASE = "https://smart-desk-backend-11.onrender.com";
const EMPTY = { name: "", email: "", phone: "", company: "", designation: "" };

// Public self-registration page — reached by scanning the QR code printed
// at the entry desk (see Events.js "🔗 Registration QR"). No login, no
// admin nav. On success, sends the visitor straight to their own ticket
// page (AttendeeView) showing their unique code, ready to show at the gate.
export default function RegisterAttendee() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    getEvent(eventId)
      .then(r => setEvent(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [eventId]);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("event_id", eventId);
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      fd.append("company", form.company);
      fd.append("designation", form.designation);
      if (photo) fd.append("photo", photo);

      const { data } = await axios.post(`${BASE}/api/v1/attendees/register`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Registered! Here's your entry code.");
      navigate(`/attendee/${data.qr_id}`, { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  if (notFound || !event) {
    return (
      <div className="page">
        <div className="empty">
          <div className="empty-icon">❌</div>
          <h3>Registration not open</h3>
          <p style={{ color: "var(--muted)" }}>This event couldn't be found — check with the front desk.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card">
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎫</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{event.name}</h1>
          {event.date && <p style={{ color: "var(--muted)", fontSize: 14 }}>{event.date}</p>}
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>Register below to get your entry code</p>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@email.com" />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="form-input" value={form.company} onChange={e => set("company", e.target.value)} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label className="form-label">Designation</label>
              <input className="form-input" value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone (WhatsApp)</label>
            <input className="form-input" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Optional — also sends your code via WhatsApp" />
          </div>

          <div className="form-group">
            <label className="form-label">Photo</label>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {preview
                ? <img src={preview} alt="preview" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }} />
                : <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--surface2)", border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👤</div>
              }
              <label style={{ cursor: "pointer" }}>
                <span className="btn btn-ghost btn-sm">📷 Add Photo</span>
                <input type="file" accept="image/*" capture="user" style={{ display: "none" }} onChange={handlePhoto} />
              </label>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={saving}>
            {saving ? "Registering…" : "Register & Get My Code"}
          </button>
        </form>
      </div>
    </div>
  );
}
