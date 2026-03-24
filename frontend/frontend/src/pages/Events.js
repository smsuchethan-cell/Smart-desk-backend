import React, { useEffect, useState } from "react";
import { getEvents, createEvent, updateEvent, deleteEvent } from "../api";
import toast from "react-hot-toast";

const EMPTY = { name: "", description: "", date: "", location: "" };

function EventModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Event name required"); return; }
    setSaving(true);
    try {
      if (isEdit) await updateEvent(initial.id, form);
      else         await createEvent(form);
      toast.success(isEdit ? "Event updated!" : "Event created!");
      onSaved();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">{isEdit ? "✏️ Edit Event" : "➕ New Event"}</h2>
        <form onSubmit={save}>
          <div className="form-group">
            <label className="form-label">Event Name *</label>
            <input className="form-input" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Tech Expo 2025" />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e=>set("date",e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location} onChange={e=>set("location",e.target.value)} placeholder="Venue / City" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Event details…" />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Event"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Events() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);

  const load = () => { setLoading(true); getEvents().then(r => setEvents(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const drop = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try { await deleteEvent(id); toast.success("Deleted"); load(); } catch { toast.error("Delete failed"); }
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>🎪 Events</h2>
        <button className="btn btn-primary" onClick={() => setModal("new")}>+ New Event</button>
      </div>

      {loading
        ? <div className="loading-center"><div className="spinner" /></div>
        : events.length === 0
          ? <div className="empty"><div className="empty-icon">🎪</div><h3>No events yet</h3><p>Create your first event to start managing attendees</p></div>
          : <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Name</th><th>Date</th><th>Location</th><th>Description</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(ev => (
                      <tr key={ev.id}>
                        <td><span className="badge badge-purple">{ev.id}</span></td>
                        <td style={{ fontWeight: 600 }}>{ev.name}</td>
                        <td>{ev.date ? new Date(ev.date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—"}</td>
                        <td>{ev.location || "—"}</td>
                        <td style={{ color: "var(--muted)", maxWidth: 200 }}>{ev.description?.slice(0, 60) || "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setModal(ev)}>✏️ Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => drop(ev.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
      }

      {modal && (
        <EventModal
          initial={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
