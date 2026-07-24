import React, { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { getRecentCheckins } from "./api";
import { ModeProvider, useMode, MODES } from "./context/ModeContext";
import { fireConfetti } from "./utils/confetti";
import "./index.css";

// Pages
import Dashboard       from "./pages/Dashboard";
import QRScanner       from "./pages/QRScanner";
import Products        from "./pages/Products";
import ProductView     from "./pages/ProductView";
import Events          from "./pages/Events";
import Attendees       from "./pages/Attendees";
import AttendeeView    from "./pages/AttendeeView";
import RegisterAttendee from "./pages/RegisterAttendee";
import Enquiries       from "./pages/Enquiries";
import Students        from "./pages/Students";
import SchoolAnalytics from "./pages/SchoolAnalytics";
import HolidayLeave    from "./pages/HolidayLeave";
import Attendance      from "./pages/Attendance";
import Footfall        from "./pages/Footfall";
import Reports         from "./pages/Reports";
import Employees       from "./pages/Employees";
import Meetings        from "./pages/Meetings";
import ModeLanding     from "./pages/ModeLanding";

const CHECKIN_POLL_MS = 8000;

// Per-mode sidebar navigation. Several items intentionally point at the same
// existing route under a mode-appropriate label/icon (e.g. Corporate's
// "Visitors" and Event's "Attendees" both use the real attendee check-in
// data) rather than forking duplicate pages for the same functionality.
const NAV_BY_MODE = {
  School: [
    { to: "/",               label: "Dashboard", icon: "📊", end: true },
    { to: "/attendance",     label: "Attendance", icon: "✅" },
    { to: "/school-analytics", label: "Analytics", icon: "📈" },
    { to: "/holidays-leave", label: "Holidays",   icon: "📅" },
    { to: "/students",       label: "Students",   icon: "🎓" },
  ],
  Corporate: [
    { to: "/",          label: "Dashboard", icon: "📊", end: true },
    { to: "/employees", label: "Employees", icon: "👔" },
    { to: "/attendees", label: "Visitors",  icon: "🧑‍💼" },
    { to: "/meetings",  label: "Meetings",  icon: "🗓️" },
    { to: "/reports",   label: "Reports",   icon: "📑" },
  ],
  Event: [
    { to: "/",          label: "Dashboard",   icon: "📊", end: true },
    { to: "/attendees", label: "Attendees",   icon: "👥" },
    { to: "/scanner",   label: "Gate Entry",  icon: "🚪" },
    { to: "/attendees", label: "Badge Print", icon: "🪪" },
    { to: "/",          label: "Analytics",   icon: "📈" },
  ],
  Retail: [
    { to: "/",          label: "Dashboard", icon: "📊", end: true },
    { to: "/products",  label: "Products",  icon: "📦" },
    { to: "/enquiries", label: "Leads",     icon: "💬" },
    { to: "/footfall",  label: "Footfall",  icon: "🔥" },
    { to: "/reports",   label: "Reports",   icon: "📑" },
  ],
};

// Polls recent check-ins and toasts any that appear after the first poll
// (which just establishes a baseline, so old check-ins don't all fire at once).
// Fires confetti too when in Event mode, since that's the celebratory one.
function useCheckinNotifications(mode) {
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

        const fresh = data.filter((d) => d.attendance_id > lastSeenId.current).reverse();
        fresh.forEach((d) => {
          toast.success(`✅ ${d.attendee_name} checked in — ${d.event_name}`);
          if (mode === "Event") fireConfetti();
        });

        lastSeenId.current = Math.max(lastSeenId.current, data[0].attendance_id);
      } catch {
        // ignore — next poll will retry
      }
    };

    poll();
    const timer = setInterval(poll, CHECKIN_POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [mode]);
}

function ModeSelect() {
  const { mode, setMode } = useMode();
  return (
    <select
      className="form-select"
      value={mode}
      onChange={(e) => setMode(e.target.value)}
      style={{ width: "100%", marginBottom: 16 }}
    >
      {MODES.map((m) => (
        <option key={m.key} value={m.key}>{m.icon} {m.label}</option>
      ))}
    </select>
  );
}

function Sidebar() {
  const { mode } = useMode();
  const items = NAV_BY_MODE[mode] || NAV_BY_MODE.Event;

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">Smart<span>Desk</span> 2.0</div>

      <ModeSelect />

      <span className="sidebar-section">{mode}</span>
      {items.map((item, i) => (
        <NavLink
          key={`${item.to}-${item.label}-${i}`}
          to={item.to}
          end={item.end}
          className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
        >
          <span className="icon">{item.icon}</span>{item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Topbar() {
  const { mode, clearMode } = useMode();
  const current = MODES.find((m) => m.key === mode);

  return (
    <div className="topbar">
      <h1>Smart Desk 2.0</h1>
      <span
        className="topbar-badge"
        style={{ cursor: "pointer" }}
        onClick={clearMode}
        title="Click to switch modes"
      >
        {current?.icon} {mode} Mode ⇄
      </span>
    </div>
  );
}

// The admin/internal experience — gated behind picking a mode, since the
// sidebar, topbar, and every route here are staff-facing tools.
function AdminShell() {
  const { mode } = useMode();
  useCheckinNotifications(mode);

  if (!mode) return <ModeLanding />;

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/scanner"    element={<QRScanner />} />
          <Route path="/products"   element={<Products />} />
          <Route path="/events"     element={<Events />} />
          <Route path="/attendees"  element={<Attendees />} />
          <Route path="/enquiries"  element={<Enquiries />} />
          <Route path="/students"   element={<Students />} />
          <Route path="/school-analytics" element={<SchoolAnalytics />} />
          <Route path="/holidays-leave"   element={<HolidayLeave />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/footfall"   element={<Footfall />} />
          <Route path="/reports"    element={<Reports />} />
          <Route path="/employees"  element={<Employees />} />
          <Route path="/meetings"   element={<Meetings />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ModeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public — reachable by anyone scanning a QR with a fresh browser,
              no mode ever chosen. Must not sit behind the mode gate. */}
          <Route path="/products/:id"   element={<ProductView />} />
          <Route path="/attendee/:qrId" element={<AttendeeView />} />
          <Route path="/register/:eventId" element={<RegisterAttendee />} />
          {/* Everything else is the staff-facing admin app. */}
          <Route path="/*" element={<AdminShell />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" },
          }}
        />
      </BrowserRouter>
    </ModeProvider>
  );
}
