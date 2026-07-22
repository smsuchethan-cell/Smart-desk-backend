import React, { useEffect, useState } from "react";
import { getEmployees, createEmployee, deleteEmployee, checkinEmployee, getEmployeeCheckinsToday, ROOT } from "../api";
import toast from "react-hot-toast";

const EMPTY = { name: "", email: "", phone: "", department: "", designation: "" };

function AddEmployeeModal({ onClose, onSaved }) {
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
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photo) fd.append("photo", photo);
      await createEmployee(fd);
      toast.success("Employee added!");
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to add employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">👔 Add Employee</h2>
        <form onSubmit={save}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-input" value={form.department} onChange={e => set("department", e.target.value)} placeholder="e.g. Engineering" />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Designation</label>
              <input className="form-input" value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. Manager" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 …" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="employee@company.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Photo</label>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {preview
                ? <img src={preview} alt="preview" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }} />
                : <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bg2)", border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👔</div>
              }
              <label style={{ cursor: "pointer" }}>
                <span className="btn btn-ghost btn-sm">📷 Upload Photo</span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Add Employee"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [checkins, setCheckins] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    Promise.allSettled([getEmployees(), getEmployeeCheckinsToday()])
      .then(([e, c]) => {
        if (e.status === "fulfilled") setEmployees(e.value.data);
        if (c.status === "fulfilled") setCheckins(c.value.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const drop = async (id) => {
    if (!window.confirm("Remove this employee?")) return;
    try { await deleteEmployee(id); toast.success("Removed"); load(); } catch { toast.error("Remove failed"); }
  };

  const doCheckin = async (id) => {
    try {
      const { data } = await checkinEmployee(id);
      toast.success(data.message);
      load();
    } catch { toast.error("Check-in failed"); }
  };

  const presentIds = new Set((checkins?.present || []).map(p => p.employee_id));
  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.department || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>👔 Employees</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <input className="search-input" placeholder="Search name / department…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Add Employee</button>
        </div>
      </div>

      {checkins && (
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card"><div className="stat-label">Total Employees</div><div className="stat-value">{checkins.total_employees}</div><div className="stat-icon">👔</div></div>
          <div className="stat-card green"><div className="stat-label">Checked In Today</div><div className="stat-value">{checkins.present_count}</div><div className="stat-icon">✅</div></div>
          <div className="stat-card red"><div className="stat-label">Not Checked In</div><div className="stat-value">{checkins.absent_count}</div><div className="stat-icon">❌</div></div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">👔</div><h3>No employees added</h3><p>Add your team to enable daily check-in tracking</p></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Photo</th><th>Name</th><th>Department</th><th>Designation</th><th>Today</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td><span className="badge badge-purple">{e.id}</span></td>
                    <td>
                      {e.photo_path
                        ? <img src={`${ROOT}/${e.photo_path}`} alt={e.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 24 }}>👔</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td>{e.department || "—"}</td>
                    <td style={{ color: "var(--muted)" }}>{e.designation || "—"}</td>
                    <td>
                      {presentIds.has(e.id)
                        ? <span className="badge badge-green">✅ Checked In</span>
                        : <span className="badge badge-yellow">⚪ Not Yet</span>}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        {!presentIds.has(e.id) && (
                          <button className="btn btn-success btn-sm" onClick={() => doCheckin(e.id)}>✅ Check In</button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => drop(e.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <AddEmployeeModal onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />
      )}
    </div>
  );
}
