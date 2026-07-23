import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProduct, submitEnquiry } from "../api";
import toast from "react-hot-toast";

const BASE = "https://smart-desk-backend-11.onrender.com";

const LEAD_POPUP_DELAY_MS = 5000;

export default function ProductView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);

  const [showLeadPopup, setShowLeadPopup] = useState(false);
  const [leadDismissed, setLeadDismissed] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", email: "" });
  const [leadSending, setLeadSending] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const [scanLogId, setScanLogId] = useState(null);
  const openedAtRef = useRef(Date.now());
  const durationSentRef = useRef(false);

  useEffect(() => {
    getProduct(id)
      .then(r => {
        setProduct(r.data);
        const logId = r.headers["x-scan-log-id"];
        if (logId) setScanLogId(logId);
        openedAtRef.current = Date.now();
      })
      .catch(() => toast.error("Product not found"))
      .finally(() => setLoading(false));
  }, [id]);

  // Passive "time spent on page" tracking — sent via sendBeacon so it fires
  // reliably on tab close/navigation without blocking the UI. Reports on the
  // first exit signal (tab hidden, unload, or React unmount for in-app nav);
  // does not resume counting if the visitor comes back to the tab.
  useEffect(() => {
    if (!scanLogId) return;

    const sendDuration = () => {
      if (durationSentRef.current) return;
      durationSentRef.current = true;
      const seconds = Math.round((Date.now() - openedAtRef.current) / 1000);
      const blob = new Blob([JSON.stringify({ seconds })], { type: "application/json" });
      navigator.sendBeacon(`${BASE}/api/v1/scan-logs/${scanLogId}/duration`, blob);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") sendDuration();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", sendDuration);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", sendDuration);
      sendDuration();
    };
  }, [scanLogId]);

  useEffect(() => {
    if (!product || leadDismissed) return;
    const timer = setTimeout(() => setShowLeadPopup(true), LEAD_POPUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [product, leadDismissed]);

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

  const closeLeadPopup = () => {
    setShowLeadPopup(false);
    setLeadDismissed(true);
  };

  const sendLeadInterest = async (e) => {
    e.preventDefault();
    if (!leadForm.name.trim() || !leadForm.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setLeadSending(true);
    try {
      await submitEnquiry({
        name: leadForm.name,
        phone: leadForm.phone,
        email: leadForm.email,
        product_id: parseInt(id),
        message: "Interested via QR scan",
      });
      setLeadSubmitted(true);
      setTimeout(() => { setShowLeadPopup(false); setLeadDismissed(true); }, 2000);
    } catch {
      toast.error("Something went wrong — please try again");
    } finally {
      setLeadSending(false);
    }
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

      {/* Lead capture popup — auto-shows a few seconds after landing here from a QR scan */}
      {showLeadPopup && (
        <div className="lead-popup">
          <button className="lead-popup-close" onClick={closeLeadPopup} aria-label="Close">✕</button>

          {leadSubmitted ? (
            <div className="lead-popup-success">Thank you! We'll contact you soon 🎉</div>
          ) : (
            <>
              <div className="lead-popup-title">Interested in this product?</div>
              <div className="lead-popup-subtitle">Leave your details, we'll get back to you</div>
              <form onSubmit={sendLeadInterest}>
                <input
                  placeholder="Your name *"
                  value={leadForm.name}
                  onChange={e => setLeadForm(f => ({ ...f, name: e.target.value }))}
                />
                <input
                  placeholder="Phone number *"
                  value={leadForm.phone}
                  onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))}
                />
                <input
                  placeholder="Email (optional)"
                  type="email"
                  value={leadForm.email}
                  onChange={e => setLeadForm(f => ({ ...f, email: e.target.value }))}
                />
                <button type="submit" className="lead-popup-submit" disabled={leadSending}>
                  {leadSending ? "Sending…" : "Send Interest"}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
