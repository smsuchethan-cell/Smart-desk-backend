import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProduct, submitEnquiry } from "../api";
import toast from "react-hot-toast";

const BASE = "https://smart-desk-backend-qtx5.onrender.com";

export default function ProductView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getProduct(id)
      .then(r => setProduct(r.data))
      .catch(() => toast.error("Product not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const sendEnquiry = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSending(true);
    try {
      await submitEnquiry({ ...form, product_id: parseInt(id) });
      toast.success("Enquiry sent!");
      setShowEnquiry(false);
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch { toast.error("Failed to send enquiry"); }
    finally { setSending(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!product) return (
    <div className="page"><div className="empty"><div className="empty-icon">❌</div><h3>Product not found</h3><button className="btn btn-ghost" onClick={() => navigate(-1)}>← Go Back</button></div></div>
  );

  return (
    <div className="page fade-in">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
        <span className="badge badge-purple">Product #{product.id}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "start" }}>
        {/* Left — image + QR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {product.image_url
            ? <img src={product.image_url} alt={product.name} style={{ width: "100%", borderRadius: 16, maxHeight: 340, objectFit: "cover", border: "1px solid var(--border)" }} />
            : <div style={{ height: 280, background: "var(--surface2)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, border: "1px solid var(--border)" }}>📦</div>
          }
          {product.qr_code_path && (
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <img src={`${BASE}/${product.qr_code_path}`} alt="QR" style={{ width: 90, height: 90, borderRadius: 8 }} />
              <div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Product QR Code</div>
                <div style={{ fontSize: 12, color: "var(--accent)", fontFamily: "monospace" }}>PRODUCT:{product.id}</div>
                <a href={`${BASE}/${product.qr_code_path}`} download className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>⬇ Download</a>
              </div>
            </div>
          )}
        </div>

        {/* Right — details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card">
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{product.name}</h1>
            <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent2)", marginBottom: 16 }}>
              {product.price ? `₹${product.price.toLocaleString()}` : "Price on request"}
            </div>
            {product.description && <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 16 }}>{product.description}</p>}
            {product.specs && (
              <div style={{ background: "var(--surface2)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Specifications</div>
                <pre style={{ fontFamily: "inherit", fontSize: 14, color: "var(--text)", whiteSpace: "pre-wrap" }}>{product.specs}</pre>
              </div>
            )}
            {product.video_url && (
              <a href={product.video_url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ marginBottom: 16 }}>▶ Watch Product Video</a>
            )}
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setShowEnquiry(true)}>
              💬 Send Enquiry
            </button>
          </div>
        </div>
      </div>

      {/* Enquiry Modal */}
      {showEnquiry && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEnquiry(false)}>
          <div className="modal">
            <h2 className="modal-title">💬 Enquire About {product.name}</h2>
            <form onSubmit={sendEnquiry}>
              <div className="form-group">
                <label className="form-label">Your Name *</label>
                <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Full name" />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="you@email.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+91 …" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-textarea" value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="What would you like to know?" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEnquiry(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? "Sending…" : "Send Enquiry"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
