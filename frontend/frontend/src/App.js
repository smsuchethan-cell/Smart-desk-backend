import React from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./index.css";

// Pages
import Dashboard     from "./pages/Dashboard";
import QRScanner     from "./pages/QRScanner";
import Products      from "./pages/Products";
import ProductView   from "./pages/ProductView";
import Events        from "./pages/Events";
import Attendees     from "./pages/Attendees";
import Enquiries     from "./pages/Enquiries";

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">Smart<span>Desk</span> 2.0</div>

      <span className="sidebar-section">Main</span>
      <NavLink to="/"          className={({isActive})=>"nav-link"+(isActive?" active":"")} end><span className="icon">📊</span>Dashboard</NavLink>
      <NavLink to="/scanner"   className={({isActive})=>"nav-link"+(isActive?" active":"")}><span className="icon">📷</span>QR Scanner</NavLink>

      <span className="sidebar-section">Products</span>
      <NavLink to="/products"  className={({isActive})=>"nav-link"+(isActive?" active":"")}><span className="icon">📦</span>Products</NavLink>
      <NavLink to="/enquiries" className={({isActive})=>"nav-link"+(isActive?" active":"")}><span className="icon">💬</span>Enquiries</NavLink>

      <span className="sidebar-section">Events</span>
      <NavLink to="/events"    className={({isActive})=>"nav-link"+(isActive?" active":"")}><span className="icon">🎪</span>Events</NavLink>
      <NavLink to="/attendees" className={({isActive})=>"nav-link"+(isActive?" active":"")}><span className="icon">👥</span>Attendees</NavLink>
    </nav>
  );
}

export default function App() {
  return (
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
            <Route path="/enquiries"  element={<Enquiries />} />
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
  );
}