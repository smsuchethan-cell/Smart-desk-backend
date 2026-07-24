import React, { useEffect, useState } from "react";
import { getAttendees, getEvents, checkinAttendee, deleteAttendee } from "../api";
import { useMode } from "../context/ModeContext";
import axios from "axios";
import toast from "react-hot-toast";

const BASE = "https://smart-desk-backend-11.onrender.com";
const FRONTEND_URL = "https://smart-desk-backend-1.onrender.com";
const EMPTY = { name: "", company: "", email: "", phone: "", designation: "", event_id: "" };

// ── Register Modal ─────────────────────────────────────────────────────────
function RegisterModal({ events, onClose, onSaved }) {
  const [form,   setForm]   = useState(EMPTY);
  const [photo,  setPhoto]  = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.event_id) {
      toast.error("Name, email, and event are required");
      return;
    }
    setSaving(true);
    try {
      // Must use FormData because of photo upload
      const fd = new FormData();
      fd.append("event_id",    form.event_id);
      fd.append("name",        form.name);
      fd.append("email",       form.email);
      fd.append("phone",       form.phone);
      fd.append("company",     form.company);
      fd.append("designation", form.designation);
      if (photo) fd.append("photo", photo);

      await axios.post(`${BASE}/api/v1/attendees/register`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Registered! Unique code sent to email" + (form.phone.trim() ? " & WhatsApp" : "") + ".");
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <h2 className="modal-title">👤 Register Attendee</h2>
        <form onSubmit={save}>

          {/* Event */}
          <div className="form-group">
            <label className="form-label">Event *</label>
            <select className="form-select" value={form.event_id} onChange={e => set("event_id", e.target.value)}>
              <option value="">— Select Event —</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name} {ev.date ? `(${ev.date})` : ""}</option>
              ))}
            </select>
          </div>

          {/* Name + Company */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="form-input" value={form.company} onChange={e => set("company", e.target.value)} placeholder="Company / Organisation" />
            </div>
          </div>

          {/* Email + Designation */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="attendee@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Designation</label>
              <input className="form-input" value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. CEO, Developer" />
            </div>
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label">Phone (WhatsApp)</label>
            <input className="form-input" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" />
          </div>

          {/* Photo upload */}
          <div className="form-group">
            <label className="form-label">Photo</label>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {preview
                ? <img src={preview} alt="preview" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }} />
                : <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bg2)", border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👤</div>
              }
              <label style={{ cursor: "pointer" }}>
                <span className="btn btn-ghost btn-sm">📷 Upload Photo</span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Registering…" : "Register & Send Code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Check-In Modal ──────────────────────────────────────────────────────────
function CheckInModal({ attendee, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  const doCheckin = async () => {
    setLoading(true);
    try {
      const { data } = await checkinAttendee(attendee.qr_id);
      setResult(data);
      if (data.success) toast.success(data.message);
      else toast.error(data.message);
    } catch {
      toast.error("Check-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">✅ Check-In</h2>
        {!result ? (
          <div style={{ textAlign: "center" }}>
            {/* Photo */}
            {attendee.photo_path
              ? <img src={`${BASE}/${attendee.photo_path}`} alt={attendee.name}
                  style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover",
                           border: "3px solid var(--accent)", marginBottom: 12 }} />
              : <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
            }
            <h3 style={{ fontSize: 20, marginBottom: 4 }}>{attendee.name}</h3>
            <p style={{ color: "var(--accent)", fontSize: 13, marginBottom: 2 }}>{attendee.designation}</p>
            <p style={{ color: "var(--muted)", marginBottom: 4 }}>{attendee.company}</p>
            <p style={{ color: "var(--accent2)", fontFamily: "monospace", marginBottom: 24 }}>{attendee.qr_id}</p>
            {attendee.qr_code_path && (
              <img src={`${BASE}/${attendee.qr_code_path}`} alt="QR"
                style={{ width: 120, height: 120, borderRadius: 10, marginBottom: 24 }} />
            )}
            <button className="btn btn-success" style={{ width: "100%", justifyContent: "center" }}
              onClick={doCheckin} disabled={loading}>
              {loading ? "Processing…" : "✅ Confirm Check-In & Print Badge"}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            {result.already_checked_in
              ? <><div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                  <h3 style={{ color: "var(--warning)" }}>Already Checked In</h3></>
              : <><div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <h3 style={{ color: "var(--accent2)" }}>Welcome, {result.attendee?.name}!</h3></>
            }
            {result.badge_path && (
              <div style={{ marginTop: 16 }}>
                <img src={`${BASE}/${result.badge_path}`} alt="Badge"
                  style={{ width: "100%", borderRadius: 10, marginBottom: 12,
                           border: "1px solid var(--border)" }} />
                <a href={`${BASE}/${result.badge_path}`} download
                  className="btn btn-success btn-sm">⬇ Download Badge</a>
              </div>
            )}
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
const TITLE_BY_MODE = {
  Corporate: { icon: "🧑‍💼", label: "Visitors" },
};

export default function Attendees() {
  const { mode } = useMode();
  const title = TITLE_BY_MODE[mode] || { icon: "👥", label: "Attendees" };
  const [attendees,   setAttendees]  = useState([]);
  const [events,      setEvents]     = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [filterEvent, setFilter]     = useState("");
  const [modal,       setModal]      = useState(null);
  const [checkin,     setCheckin]    = useState(null);
  const [search,      setSearch]     = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([getAttendees(filterEvent || undefined), getEvents()])
      .then(([a, ev]) => { setAttendees(a.data); setEvents(ev.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterEvent]); // eslint-disable-line

  const drop = async (id) => {
    if (!window.confirm("Delete this attendee? This also removes their check-in record.")) return;
    try { await deleteAttendee(id); toast.success("Deleted"); load(); } catch { toast.error("Delete failed"); }
  };

  const filtered = attendees.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  // Registration is per-event — the QR/link only makes sense once a specific
  // event is chosen in the filter above (there's no single "register" page
  // that isn't tied to an event).
  const regLink = filterEvent ? `${FRONTEND_URL}/register/${filterEvent}` : null;
  const regQr   = filterEvent ? `${BASE}/api/v1/events/${filterEvent}/register-qr.png` : null;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>{title.icon} {title.label}</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <select className="form-select" style={{ width: 200 }} value={filterEvent} onChange={e => setFilter(e.target.value)}>
            <option value="">All Events</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <input className="search-input" placeholder="Search name / email…"
            value={search} onChange={e => setSearch(e.target.value)} />

          {/* Copy registration link button — only meaningful once an event is picked */}
          {regLink && (
            <button className="btn btn-ghost btn-sm" onClick={() => {
              navigator.clipboard.writeText(regLink);
              toast.success("Registration link copied!");
            }}>
              🔗 Copy Reg Link
            </button>
          )}

          <a
            className="btn btn-ghost btn-sm"
            href={`${BASE}/api/v1/attendees/export${filterEvent ? `?event_id=${filterEvent}` : ""}`}
          >
            ⬇ Export Excel
          </a>

          <button className="btn btn-primary" onClick={() => setModal("register")}>+ Register</button>
        </div>
      </div>

      {/* Registration QR / link — event-scoped, so pick an event above first */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "10px 16px", marginBottom: 20,
                    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {regLink ? (
          <>
            <img src={regQr} alt="Registration QR" style={{ width: 56, height: 56, borderRadius: 6 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: 13, color: "var(--muted)", display: "block" }}>📨 Scan to self-register — print this for the desk:</span>
              <code style={{ fontSize: 12, color: "var(--accent2)" }}>{regLink}</code>
            </div>
            <a className="btn btn-ghost btn-sm" href={regQr} download>⬇ Download QR</a>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              navigator.clipboard.writeText(regLink);
              toast.success("Copied!");
            }}>Copy Link</button>
          </>
        ) : (
          <span style={{ fontSize: 13, color: "var(--muted)" }}>📨 Select an event above to get its registration QR code for the desk.</span>
        )}
      </div>

      {loading
        ? <div className="loading-center"><div className="spinner" /></div>
        : filtered.length === 0
          ? <div className="empty"><div className="empty-icon">👥</div><h3>No attendees yet</h3></div>
          : <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Photo</th><th>Name</th><th>Designation</th>
                      <th>Company</th><th>Email</th><th>Code</th><th>QR</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => (
                      <tr key={a.id}>
                        <td><span className="badge badge-purple">{a.id}</span></td>
                        <td>
                          {a.photo_path
                            ? <img src={`${BASE}/${a.photo_path}`} alt={a.name}
                                style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                            : <span style={{ fontSize: 24 }}>👤</span>
                          }
                        </td>
                        <td style={{ fontWeight: 600 }}>{a.name}</td>
                        <td style={{ color: "var(--accent)", fontSize: 13 }}>{a.designation || "—"}</td>
                        <td>{a.company || "—"}</td>
                        <td style={{ color: "var(--muted)" }}>{a.email}</td>
                        <td>
                          <code style={{ color: "var(--accent2)", fontSize: 13,
                                         background: "var(--bg2)", padding: "2px 6px",
                                         borderRadius: 4 }}>
                            {a.unique_code || "—"}
                          </code>
                        </td>
                        <td>
                          {a.qr_code_path
                            ? <img src={`${BASE}/${a.qr_code_path}`} alt="QR"
                                style={{ width: 44, height: 44, borderRadius: 6 }} />
                            : <span style={{ color: "var(--muted)" }}>—</span>
                          }
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-success btn-sm" onClick={() => setCheckin(a)}>
                              ✅ Check In
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => drop(a.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
      }

      {modal === "register" && (
        <RegisterModal events={events} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }} />
      )}
      {checkin && (
        <CheckInModal attendee={checkin} onClose={() => { setCheckin(null); load(); }} />
      )}
    </div>
  );
}