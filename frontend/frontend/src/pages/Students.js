import React, { useEffect, useState } from "react";
import { getStudents, createStudent, deleteStudent, getTodayAttendance, ROOT } from "../api";
import toast from "react-hot-toast";

const EMPTY = { name: "", roll_number: "", class_section: "" };

function AddStudentModal({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
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
    if (!form.name.trim() || !form.roll_number.trim()) {
      toast.error("Name and roll number are required");
      return;
    }
    if (!photo) {
      toast.error("A reference photo is required for face recognition");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("roll_number", form.roll_number);
      fd.append("class_section", form.class_section);
      fd.append("photo", photo);
      await createStudent(fd);
      toast.success("Student registered!");
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">🎓 Register Student</h2>
        <form onSubmit={save}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Roll Number *</label>
              <input className="form-input" value={form.roll_number} onChange={e => set("roll_number", e.target.value)} placeholder="e.g. 10A-23" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Class / Section</label>
            <input className="form-input" value={form.class_section} onChange={e => set("class_section", e.target.value)} placeholder="e.g. 10-A" />
          </div>
          <div className="form-group">
            <label className="form-label">Reference Photo * (used for face recognition)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {preview
                ? <img src={preview} alt="preview" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }} />
                : <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bg2)", border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎓</div>
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
              {saving ? "Registering…" : "Register Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    Promise.allSettled([getStudents(), getTodayAttendance()])
      .then(([s, a]) => {
        if (s.status === "fulfilled") setStudents(s.value.data);
        if (a.status === "fulfilled") setAttendance(a.value.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const drop = async (id) => {
    if (!window.confirm("Remove this student?")) return;
    try { await deleteStudent(id); toast.success("Removed"); load(); } catch { toast.error("Remove failed"); }
  };

  const presentIds = new Set((attendance?.present || []).map(p => p.student_id));
  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>🎓 Students</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <input className="search-input" placeholder="Search name / roll number…" value={search} onChange={e=>setSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Register Student</button>
        </div>
      </div>

      {attendance && (
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Total Students</div>
            <div className="stat-value">{attendance.total_students}</div>
            <div className="stat-icon">🎓</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Present Today</div>
            <div className="stat-value">{attendance.present_count}</div>
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Absent Today</div>
            <div className="stat-value">{attendance.absent_count}</div>
            <div className="stat-icon">❌</div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">🎓</div><h3>No students registered</h3><p>Register a student with a reference photo to enable face attendance</p></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Photo</th><th>Name</th><th>Roll No.</th><th>Class</th><th>Today</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td><span className="badge badge-purple">{s.id}</span></td>
                    <td>
                      {s.photo_path
                        ? <img src={`${ROOT}/${s.photo_path}`} alt={s.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 24 }}>🎓</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.roll_number}</td>
                    <td>{s.class_section || "—"}</td>
                    <td>
                      {presentIds.has(s.id)
                        ? <span className="badge badge-green">✅ Present</span>
                        : <span className="badge badge-yellow">⚪ Absent</span>}
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => drop(s.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <AddStudentModal onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />
      )}
    </div>
  );
}
