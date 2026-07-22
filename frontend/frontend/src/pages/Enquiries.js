import React, { useEffect, useState } from "react";
import { getEnquiries, deleteEnquiry } from "../api";
import toast from "react-hot-toast";

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [expanded, setExpanded]   = useState(null);

  const load = () => {
    setLoading(true);
    getEnquiries().then(r => setEnquiries(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const drop = async (id) => {
    if (!window.confirm("Delete this enquiry?")) return;
    try { await deleteEnquiry(id); toast.success("Deleted"); load(); } catch { toast.error("Delete failed"); }
  };

  const filtered = enquiries.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>💬 Enquiries</h2>
        <input className="search-input" placeholder="Search by name / email…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {loading
        ? <div className="loading-center"><div className="spinner" /></div>
        : filtered.length === 0
          ? <div className="empty"><div className="empty-icon">💬</div><h3>No enquiries yet</h3><p>Product enquiries will appear here</p></div>
          : <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Product</th><th>Source</th><th>Date</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => {
                      const fromQrScan = (e.message || "").toLowerCase().includes("qr scan");
                      return (
                      <React.Fragment key={e.id}>
                        <tr style={{ cursor: "pointer" }} onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                          <td><span className="badge badge-yellow">{e.id}</span></td>
                          <td style={{ fontWeight: 600 }}>{e.name}</td>
                          <td style={{ color: "var(--muted)" }}>{e.email || "—"}</td>
                          <td>{e.phone || "—"}</td>
                          <td><span className="badge badge-purple">{e.product_name || `#${e.product_id}`}</span></td>
                          <td>
                            {fromQrScan
                              ? <span className="badge badge-green">📱 QR Scan</span>
                              : <span style={{ color: "var(--muted)" }}>Manual</span>}
                          </td>
                          <td style={{ color: "var(--muted)", fontSize: 13 }}>
                            {e.created_at ? new Date(e.created_at).toLocaleDateString("en-IN") : "—"}
                          </td>
                          <td>
                            <button className="btn btn-danger btn-sm" onClick={(ev) => { ev.stopPropagation(); drop(e.id); }}>🗑</button>
                          </td>
                        </tr>
                        {expanded === e.id && e.message && (
                          <tr>
                            <td colSpan={8} style={{ paddingTop: 0 }}>
                              <div style={{
                                background: "var(--surface2)", borderRadius: 8, padding: "12px 16px",
                                color: "var(--muted)", fontSize: 14, lineHeight: 1.6,
                                borderLeft: "3px solid var(--accent)", margin: "0 0 8px 0"
                              }}>
                                <strong style={{ color: "var(--text)", display: "block", marginBottom: 4 }}>Message:</strong>
                                {e.message}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );})}
                  </tbody>
                </table>
              </div>
            </div>
      }
    </div>
  );
}
