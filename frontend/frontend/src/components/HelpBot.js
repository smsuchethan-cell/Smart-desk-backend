import React, { useState, useRef, useEffect } from "react";
import { askHelpBot } from "../api";

const GREETING = {
  from: "bot",
  text: "Hi! Ask me anything about Smart Desk — how to do something, or what's happening right now. Try \"how many students are present today?\" or \"how do I print a badge?\"",
};

export default function HelpBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || thinking) return;

    setMessages(m => [...m, { from: "user", text: question }]);
    setInput("");
    setThinking(true);
    try {
      const { data } = await askHelpBot(question);
      setMessages(m => [...m, { from: "bot", text: data.answer }]);
    } catch {
      setMessages(m => [...m, { from: "bot", text: "Couldn't reach the server just now — try again in a moment." }]);
    } finally {
      setThinking(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Ask for help"
        style={{
          position: "fixed", right: 24, bottom: 24, zIndex: 900,
          width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer",
          background: "var(--accent)", color: "#fff", fontSize: 24,
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        }}
      >
        💬
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed", right: 24, bottom: 24, zIndex: 900,
        width: 340, maxWidth: "calc(100vw - 48px)", height: 460, maxHeight: "calc(100vh - 48px)",
        display: "flex", flexDirection: "column",
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.28)", overflow: "hidden",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg2)",
      }}>
        <strong style={{ fontSize: 14 }}>💬 Help</strong>
        <button
          onClick={() => setOpen(false)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted)" }}
          aria-label="Close help"
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.from === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              background: m.from === "user" ? "var(--accent)" : "var(--bg2)",
              color: m.from === "user" ? "#fff" : "var(--text)",
              padding: "9px 12px", borderRadius: 12, fontSize: 13.5, lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {m.text}
          </div>
        ))}
        {thinking && (
          <div style={{ alignSelf: "flex-start", color: "var(--muted)", fontSize: 13, padding: "9px 12px" }}>
            Looking that up…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--border)" }}>
        <input
          className="form-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question…"
          style={{ flex: 1, fontSize: 13.5 }}
          autoFocus
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={thinking}>Send</button>
      </form>
    </div>
  );
}
