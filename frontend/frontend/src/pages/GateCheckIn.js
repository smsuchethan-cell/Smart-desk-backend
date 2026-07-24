import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const BASE = "https://smart-desk-backend-11.onrender.com";

// Public self check-in kiosk — reached by scanning the fixed "Gate" QR
// (see GET /gate/qr.png, printed once and placed at the entrance). A
// visitor types the entry code they got when they registered; this is
// meant to sit unattended and reset itself for the next person after
// each result, unlike the staff-operated Gate Entry / QR Scanner page.
export default function GateCheckIn() {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // { success, message, name, already_checked_in, print_url }

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    try {
      const params = new URLSearchParams();
      params.append("unique_code", code.trim());
      const { data } = await axios.post(`${BASE}/api/v1/gate/verify`, params);
      setResult(data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Invalid code — please check and try again");
    } finally {
      setChecking(false);
    }
  };

  const reset = () => {
    setCode("");
    setResult(null);
  };

  return (
    <div className="page fade-in" style={{ maxWidth: 420, margin: "0 auto" }}>
      <div className="card" style={{ textAlign: "center" }}>
        {!result ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🚪</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Gate Check-In</h1>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
              Enter the entry code you got when you registered
            </p>
            <form onSubmit={submit}>
              <input
                className="form-input"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. 384A78"
                autoFocus
                style={{ textAlign: "center", fontSize: 24, letterSpacing: "0.2em", fontWeight: 700, marginBottom: 16 }}
              />
              <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={checking}>
                {checking ? "Checking…" : "Check In"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {result.already_checked_in ? "⚠️" : "✅"}
            </div>
            <h2 style={{ color: result.already_checked_in ? "var(--warning)" : "var(--accent2)", marginBottom: 8 }}>
              {result.already_checked_in ? "Already Checked In" : `Welcome, ${result.name}!`}
            </h2>
            {result.print_url && (
              <a
                href={`${BASE}${result.print_url}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success"
                style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
              >
                🪪 View / Print Badge
              </a>
            )}
            <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={reset}>
              Done — Next Person
            </button>
          </>
        )}
      </div>
    </div>
  );
}
