import React, { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { getRecentCheckins } from "./api";
import { ModeProvider, useMode, MODES } from "./ModeContext";
import "./index.css";

// Pages
import Dashboard     from "./pages/Dashboard";
import QRScanner     from "./pages/QRScanner";
import Products      from "./pages/Products";
import ProductView   from "./pages/ProductView";
import Events        from "./pages/Events";
import Attendees     from "./pages/Attendees";
import AttendeeView  from "./pages/AttendeeView";
import Enquiries     from "./pages/Enquiries";
import Students      from "./pages/Students";

const CHECKIN_POLL_MS = 8000;

// Polls recent check-ins and toasts any that appear after the first poll
// (which just establishes a baseline, so old check-ins don't all fire at once).
function useCheckinNotifications() {
  const lastSeenId = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const { data } = await getRecentCheckins(5);
        if (cancelled || !data.length) return;

        if (lastSeenId.current === null) {
          lastSeenId.current = data[0].attendance_id;
          return;
        }

        data
          .filter((d) => d.attendance_id > lastSeenId.current)
          .reverse()
          .forEach((d) => toast.success(`✅ ${d.attendee_name} checked in — ${d.event_name}`));

        lastSeenId.current = Math.max(lastSeenId.current, data[0].attendance_id);
      } catch {
        // ignore — next poll will retry
      }
    };

    poll();
    const timer = setInterval(poll, CHECKIN_POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);
}

function ModeSelector() {
  const { mode, setMode } = useMode();
  return (
    <select
      className="form-select"
      value={mode}
      onChange={(e) => setMode(e.target.value)}
      style={{ width: "100%", marginBottom: 16 }}
    >
      {MODES.map((m) => (
        <option key={m.key} value={m.key}>{m.label}</option>
      ))}
    </select>
  );
}

function Sidebar() {
  const { mode } = useMode();

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">Smart<span>Desk</span> 2.0</div>

      <ModeSelector />

      <span className="sidebar-section">Main</span>
      <NavLink to="/"          className={({isActive})=>"nav-link"+(isActive?" active":"")} end><span className="icon">📊</span>Dashboard</NavLink>
      <NavLink to="/scanner"   className={({isActive})=>"nav-link"+(isActive?" active":"")}><span className="icon">📷</span>QR Scanner</NavLink>

      <span className="sidebar-section">Products</span>
      <NavLink to="/products"  className={({isActive})=>"nav-link"+(isActive?" active":"")}><span className="icon">📦</span>Products</NavLink>
      <NavLink to="/enquiries" className={({isActive})=>"nav-link"+(isActive?" active":"")}><span className="icon">💬</span>Enquiries</NavLink>

      <span className="sidebar-section">Events</span>
      <NavLink to="/events"    className={({isActive})=>"nav-link"+(isActive?" active":"")}><span className="icon">🎪</span>Events</NavLink>
      <NavLink to="/attendees" className={({isActive})=>"nav-link"+(isActive?" active":"")}><span className="icon">👥</span>Attendees</NavLink>

      {mode === "School" && (
        <>
          <span className="sidebar-section">School</span>
          <NavLink to="/students" className={({isActive})=>"nav-link"+(isActive?" active":"")}><span className="icon">🎓</span>Students</NavLink>
        </>
      )}
    </nav>
  );
}

export default function App() {
  useCheckinNotifications();

  return (
    <ModeProvider>
      <BrowserRouter>
        <div className="app">
          <Sidebar />
          <div className="main">
            <Routes>
              <Route path="/"           element={<Dashboard />} />
              <Route path="/scanner"    element={<QRScanner />} />
              <Route path="/products"   element={<Products />} />
              <Route path="/products/:id" element={<ProductView />} />
              <Route path="/events"     element={<Events />} />
              <Route path="/attendees"  element={<Attendees />} />
              <Route path="/attendee/:qrId" element={<AttendeeView />} />
              <Route path="/enquiries"  element={<Enquiries />} />
              <Route path="/students"   element={<Students />} />
            </Routes>
          </div>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#1a1a2e", color: "#e8e8f0", border: "1px solid #2a2a45" },
          }}
        />
      </BrowserRouter>
    </ModeProvider>
  );
}