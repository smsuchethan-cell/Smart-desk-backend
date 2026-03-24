import React, { useState } from "react";
import { scanQR } from "../api";
import toast from "react-hot-toast";

const BASE = "http://localhost:8000";

export default function QRScanner() {
  const [input, setInput]   = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await scanQR(input.trim());
      setResult(data);
      if (data.success) toast.success(data.message || "Scan successful!");
      else toast.error(data.message || "Scan failed");
    } catch (err) {
      toast.error("Server error — is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleScan(e);
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>📷 QR Scanner</h2>
        <span className="topbar-badge">Ready</span>
      </div>

      <div className="scanner-container">
        <div className="card" style={{ width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📲</div>
          <h3 style={{ marginBottom: 8, fontSize: 18 }}>Scan or Type QR Data</h3>
          <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>
            Point a USB QR scanner (acts as keyboard) or manually type the QR value
          </p>
          <form onSubmit={handleScan} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input
              className="scan-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="PRODUCT:1  or  ATTENDEE:A3F9C2"
              autoFocus
            />
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Scanning…" : "🔍 Process Scan"}
            </button>
          </form>
        </div>

        {result && (
          <div className={`result-panel ${result.success ? "result-success" : "result-error"} slide-up`}>
            {/* PRODUCT result */}
            {result.type === "product" && result.success && (
              <div>
                <div className="badge badge-purple" style={{ marginBottom: 16 }}>📦 Product</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{result.data.name}</h3>
                <p style={{ fontSize: 26, color: "var(--accent2)", fontWeight: 800, marginBottom: 12 }}>
                  ₹{result.data.price?.toLocaleString() ?? "N/A"}
                </p>
                {result.data.description && <p style={{ color: "var(--muted)", marginBottom: 16 }}>{result.data.description}</p>}
                {result.data.specs && (
                  <div style={{ background: "var(--surface2)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <pre style={{ fontFamily: "inherit", fontSize: 13, color: "var(--muted)", whiteSpace: "pre-wrap" }}>{result.data.specs}</pre>
                  </div>
                )}
                {result.data.image_url && (
                  <img src={result.data.image_url} alt={result.data.name} style={{ width: "100%", borderRadius: 10, marginBottom: 16, maxHeight: 220, objectFit: "cover" }} />
                )}
                {result.data.video_url && (
                  <a href={result.data.video_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">▶ Watch Video</a>
                )}
              </div>
            )}

            {/* ATTENDEE result */}
            {result.type === "attendee" && result.success && (
              <div>
                <div className="badge badge-green" style={{ marginBottom: 16 }}>
                  {result.already_checked_in ? "⚠️ Already Checked In" : "✅ Check-In Successful"}
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{result.data?.name}</h3>
                <p style={{ color: "var(--muted)", marginBottom: 16 }}>{result.data?.company}</p>
                <p style={{ color: "var(--muted)", marginBottom: 16, fontSize: 14 }}>QR ID: <strong style={{ color: "var(--accent)" }}>{result.data?.qr_id}</strong></p>
                {result.badge_path && (
                  <div>
                    <p style={{ color: "var(--muted)", marginBottom: 8, fontSize: 13 }}>Badge generated:</p>
                    <img src={`${BASE}/${result.badge_path}`} alt="Event Badge" style={{ width: "100%", borderRadius: 10 }} />
                    <a href={`${BASE}/${result.badge_path}`} download className="btn btn-success btn-sm" style={{ marginTop: 12 }}>⬇ Download Badge</a>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {!result.success && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
                <h3 style={{ color: "var(--danger)", marginBottom: 8 }}>Scan Failed</h3>
                <p style={{ color: "var(--muted)" }}>{result.message}</p>
              </div>
            )}
          </div>
        )}

        <div className="card" style={{ width: "100%" }}>
          <h4 style={{ marginBottom: 12, fontSize: 14, color: "var(--muted)" }}>QR Format Reference</h4>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 16px", flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>PRODUCT QR</div>
              <code style={{ color: "var(--accent)" }}>PRODUCT:&#123;id&#125;</code>
            </div>
            <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 16px", flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>ATTENDEE QR</div>
              <code style={{ color: "var(--accent2)" }}>ATTENDEE:&#123;qr_id&#125;</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
