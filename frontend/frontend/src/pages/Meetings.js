import React, { useEffect, useState } from "react";
import { getMeetingsStatus, createMeeting, deleteMeeting } from "../api";
import toast from "react-hot-toast";

const EMPTY = { title: "", room: "", organizer: "", start_time: "", end_time: "" };

const STATUS_BADGE = {
  ongoing:   { label: "🟢 Ongoing",   cls: "badge-green" },
  upcoming:  { label: "🟡 Upcoming",  cls: "badge-yellow" },
  completed: { label: "⚪ Completed", cls: "badge-purple" },
};

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getMeetingsStatus().then(r => setMeetings(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.start_time || !form.end_time) {
      toast.error("Title, start time, and end time are required");
      return;
    }
    setSaving(true);
    try {
      await createMeeting(form);
      toast.success("Meeting scheduled!");
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to schedule meeting");
    } finally {
      setSaving(false);
    }
  };

  const drop = async (id) => {
    if (!window.confirm("Cancel this meeting?")) return;
    try { await deleteMeeting(id); toast.success("Cancelled"); load(); } catch { toast.error("Failed"); }
  };

  const ongoingCount = meetings.filter(m => m.status === "ongoing").length;
  const upcomingCount = meetings.filter(m => m.status === "upcoming").length;

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>🗓️ Meeting Rooms</h2>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card green"><div className="stat-label">Ongoing Now</div><div className="stat-value">{ongoingCount}</div><div className="stat-icon">🟢</div></div>
        <div className="stat-card yellow"><div className="stat-label">Upcoming</div><div className="stat-value">{upcomingCount}</div><div className="stat-icon">🟡</div></div>
        <div className="stat-card"><div className="stat-label">Total Scheduled</div><div className="stat-value">{meetings.length}</div><div className="stat-icon">🗓️</div></div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>+ Schedule a Meeting</h3>
        <form onSubmit={save}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Sprint Planning" />
            </div>
            <div className="form-group">
              <label className="form-label">Room</label>
              <input className="form-input" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="e.g. Room A" />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input className="form-input" type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input className="form-input" type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Organizer</label>
            <input className="form-input" value={form.organizer} onChange={e => setForm(f => ({ ...f, organizer: e.target.value }))} placeholder="Name" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Scheduling…" : "Schedule Meeting"}</button>
        </form>
      </div>

      {meetings.length === 0 ? (
        <div className="empty"><div className="empty-icon">🗓️</div><h3>No meetings scheduled</h3></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Title</th><th>Room</th><th>Organizer</th><th>Start</th><th>End</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {meetings.map(m => {
                  const badge = STATUS_BADGE[m.status];
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{m.title}</td>
                      <td>{m.room || "—"}</td>
                      <td style={{ color: "var(--muted)" }}>{m.organizer || "—"}</td>
                      <td>{new Date(m.start_time).toLocaleString()}</td>
                      <td>{new Date(m.end_time).toLocaleString()}</td>
                      <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => drop(m.id)}>🗑</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
