import React, { useEffect, useState } from "react";
import { getAttendees, getEvents, registerAttendee, checkinAttendee } from "../api";
import toast from "react-hot-toast";

const BASE = "http://localhost:8000";
const EMPTY = { name: "", company: "", email: "", event_id: "" };

function RegisterModal({ events, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.event_id) { toast.error("Name, email, and event are required"); return; }
    setSaving(true);
    try {
      await registerAttendee({ ...form, event_id: parseInt(form.event_id) });
      toast.success("Attendee registered! QR code generated.");
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">👤 Register Attendee</h2>
        <form onSubmit={save}>
          <div className="form-group">
            <label className="form-label">Event *</label>
            <select className="form-select" value={form.event_id} onChange={e=>set("event_id",e.target.value)}>
              <option value="">— Select Event —</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} {ev.date ? `(${ev.date})` : ""}</option>)}
            </select>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="form-input" value={form.company} onChange={e=>set("company",e.target.value)} placeholder="Company / Organisation" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-input" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="attendee@email.com" />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Registering…" : "Register"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CheckInModal({ attendee, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);

  const doCheckin = async () => {
    setLoading(true);
    try {
      const { data } = await checkinAttendee(attendee.qr_id);
      setResult(data);
      if (data.success) toast.success(data.message);
      else toast.error(data.message);
    } catch { toast.error("Check-in failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">✅ Check-In</h2>
        {!result ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
            <h3 style={{ fontSize: 20, marginBottom: 4 }}>{attendee.name}</h3>
            <p style={{ color: "var(--muted)", marginBottom: 4 }}>{attendee.company}</p>
            <p style={{ color: "var(--accent)", fontFamily: "monospace", marginBottom: 24 }}>{attendee.qr_id}</p>
            {attendee.qr_code_path && <img src={`${BASE}/${attendee.qr_code_path}`} alt="QR" style={{ width: 120, height: 120, borderRadius: 10, marginBottom: 24 }} />}
            <button className="btn btn-success" style={{ width: "100%", justifyContent: "center" }} onClick={doCheckin} disabled={loading}>
              {loading ? "Processing…" : "✅ Confirm Check-In & Print Badge"}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            {result.already_checked_in
              ? <><div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div><h3 style={{ color: "var(--warning)" }}>Already Checked In</h3></>
              : <><div style={{ fontSize: 40, marginBottom: 12 }}>✅</div><h3 style={{ color: "var(--accent2)" }}>Welcome, {result.attendee?.name}!</h3></>
            }
            {result.badge_path && (
              <div style={{ marginTop: 16 }}>
                <img src={`${BASE}/${result.badge_path}`} alt="Badge" style={{ width: "100%", borderRadius: 10, marginBottom: 12, border: "1px solid var(--border)" }} />
                <a href={`${BASE}/${result.badge_path}`} download className="btn btn-success btn-sm">⬇ Download Badge</a>
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

export default function Attendees() {
  const [attendees, setAttendees] = useState([]);
  const [events, setEvents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterEvent, setFilter]  = useState("");
  const [modal, setModal]         = useState(null); // null | "register" | attendee obj
  const [checkin, setCheckin]     = useState(null);
  const [search, setSearch]       = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([getAttendees(filterEvent || undefined), getEvents()])
      .then(([a, ev]) => { setAttendees(a.data); setEvents(ev.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterEvent]); // eslint-disable-line

  const filtered = attendees.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>👥 Attendees</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <select className="form-select" style={{ width:200 }} value={filterEvent} onChange={e=>setFilter(e.target.value)}>
            <option value="">All Events</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <input className="search-input" placeholder="Search name / email…" value={search} onChange={e=>setSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setModal("register")}>+ Register</button>
        </div>
      </div>

      {loading
        ? <div className="loading-center"><div className="spinner" /></div>
        : filtered.length === 0
          ? <div className="empty"><div className="empty-icon">👥</div><h3>No attendees</h3></div>
          : <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Name</th><th>Company</th><th>Email</th><th>QR ID</th><th>QR Code</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => (
                      <tr key={a.id}>
                        <td><span className="badge badge-purple">{a.id}</span></td>
                        <td style={{ fontWeight: 600 }}>{a.name}</td>
                        <td>{a.company || "—"}</td>
                        <td style={{ color: "var(--muted)" }}>{a.email}</td>
                        <td><code style={{ color: "var(--accent2)", fontSize: 13 }}>{a.qr_id}</code></td>
                        <td>
                          {a.qr_code_path
                            ? <img src={`${BASE}/${a.qr_code_path}`} alt="QR" style={{ width: 44, height: 44, borderRadius: 6 }} />
                            : <span style={{ color: "var(--muted)" }}>—</span>
                          }
                        </td>
                        <td>
                          <button className="btn btn-success btn-sm" onClick={() => setCheckin(a)}>✅ Check In</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
      }

      {modal === "register" && (
        <RegisterModal events={events} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {checkin && (
        <CheckInModal attendee={checkin} onClose={() => { setCheckin(null); load(); }} />
      )}
    </div>
  );
}
