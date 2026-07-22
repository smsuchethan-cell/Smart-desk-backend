import React, { useEffect, useState } from "react";
import {
  getHolidays, createHoliday, deleteHoliday,
  getLeaves, createLeave, deleteLeave,
  getStudents,
} from "../api";
import toast from "react-hot-toast";

const EMPTY_HOLIDAY = { date: "", name: "" };
const EMPTY_LEAVE = { student_id: "", date_from: "", date_to: "", reason: "" };

export default function HolidayLeave() {
  const [holidays, setHolidays] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [holidayForm, setHolidayForm] = useState(EMPTY_HOLIDAY);
  const [leaveForm, setLeaveForm] = useState(EMPTY_LEAVE);
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [savingLeave, setSavingLeave] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.allSettled([getHolidays(), getLeaves(), getStudents()])
      .then(([h, l, s]) => {
        if (h.status === "fulfilled") setHolidays(h.value.data);
        if (l.status === "fulfilled") setLeaves(l.value.data);
        if (s.status === "fulfilled") setStudents(s.value.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const addHoliday = async (e) => {
    e.preventDefault();
    if (!holidayForm.date || !holidayForm.name.trim()) {
      toast.error("Date and name are required");
      return;
    }
    setSavingHoliday(true);
    try {
      await createHoliday(holidayForm);
      toast.success("Holiday added");
      setHolidayForm(EMPTY_HOLIDAY);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to add holiday");
    } finally {
      setSavingHoliday(false);
    }
  };

  const dropHoliday = async (id) => {
    if (!window.confirm("Remove this holiday?")) return;
    try { await deleteHoliday(id); toast.success("Removed"); load(); } catch { toast.error("Failed"); }
  };

  const addLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.student_id || !leaveForm.date_from || !leaveForm.date_to) {
      toast.error("Student, from date, and to date are required");
      return;
    }
    setSavingLeave(true);
    try {
      await createLeave({ ...leaveForm, student_id: parseInt(leaveForm.student_id) });
      toast.success("Leave recorded");
      setLeaveForm(EMPTY_LEAVE);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to record leave");
    } finally {
      setSavingLeave(false);
    }
  };

  const dropLeave = async (id) => {
    if (!window.confirm("Remove this leave record?")) return;
    try { await deleteLeave(id); toast.success("Removed"); load(); } catch { toast.error("Failed"); }
  };

  const studentName = (id) => students.find(s => s.id === id)?.name || `#${id}`;

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>📅 Holiday & Leave Management</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* ── Holidays ── */}
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>🏖️ Holidays</h3>

          <form onSubmit={addHoliday} style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <input className="form-input" type="date" style={{ flex: 1, minWidth: 140 }}
              value={holidayForm.date} onChange={e => setHolidayForm(f => ({ ...f, date: e.target.value }))} />
            <input className="form-input" placeholder="Holiday name" style={{ flex: 2, minWidth: 140 }}
              value={holidayForm.name} onChange={e => setHolidayForm(f => ({ ...f, name: e.target.value }))} />
            <button className="btn btn-primary btn-sm" type="submit" disabled={savingHoliday}>
              {savingHoliday ? "Adding…" : "+ Add"}
            </button>
          </form>

          {holidays.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>No holidays added yet</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Name</th><th></th></tr></thead>
                <tbody>
                  {holidays.map(h => (
                    <tr key={h.id}>
                      <td>{h.date}</td>
                      <td>{h.name}</td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => dropHoliday(h.id)}>🗑</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Leaves ── */}
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>📝 Student Leaves</h3>

          <form onSubmit={addLeave} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <select className="form-select" value={leaveForm.student_id}
              onChange={e => setLeaveForm(f => ({ ...f, student_id: e.target.value }))}>
              <option value="">— Select Student —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>)}
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="form-input" type="date" style={{ flex: 1 }}
                value={leaveForm.date_from} onChange={e => setLeaveForm(f => ({ ...f, date_from: e.target.value }))} />
              <input className="form-input" type="date" style={{ flex: 1 }}
                value={leaveForm.date_to} onChange={e => setLeaveForm(f => ({ ...f, date_to: e.target.value }))} />
            </div>
            <input className="form-input" placeholder="Reason (optional)"
              value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} />
            <button className="btn btn-primary btn-sm" type="submit" disabled={savingLeave}>
              {savingLeave ? "Saving…" : "+ Record Leave"}
            </button>
          </form>

          {leaves.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>No leave records yet</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Student</th><th>From</th><th>To</th><th>Reason</th><th></th></tr></thead>
                <tbody>
                  {leaves.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600 }}>{studentName(l.student_id)}</td>
                      <td>{l.date_from}</td>
                      <td>{l.date_to}</td>
                      <td style={{ color: "var(--muted)" }}>{l.reason || "—"}</td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => dropLeave(l.id)}>🗑</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
