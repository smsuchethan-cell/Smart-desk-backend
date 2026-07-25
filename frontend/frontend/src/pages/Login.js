import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setSigningIn(true);
    try {
      await login(password);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Wrong password");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="page fade-in" style={{ maxWidth: 380, margin: "80px auto 0" }}>
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Smart Desk 2.0</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>Staff login</p>
        <form onSubmit={submit}>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{ textAlign: "center", marginBottom: 16 }}
          />
          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={signingIn}>
            {signingIn ? "Signing in…" : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
