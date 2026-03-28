import React from "react";
import { Outlet } from "react-router-dom";

import "./DashboardLayout.css";
import { NavLink } from "react-router-dom";
import logo from "../logo.png";

export default function DashboardLayout({ children }) {
  return (
    <div className="dash-wrapper">

      {/* SIDEBAR */}
      <aside className="dash-sidebar">
        <div className="dash-logo-box">
          <img src={logo} alt="logo" />
          <h3>Mashwara-e-Taleem</h3>
        </div>

        <nav className="dash-nav">
<NavLink to="/dashboard" end className="dash-link">Home</NavLink>

          <NavLink to="/dashboard/universities" className="dash-link">Universities</NavLink>
          <NavLink to="/dashboard/scholarships" className="dash-link">Scholarships</NavLink>
          <NavLink to="/dashboard/analyzer" className="dash-link">Document Analyzer</NavLink>
          <NavLink to="/dashboard/ai-advisor" className="dash-link">AI Advisor</NavLink>
          <NavLink to="/dashboard/statistics" className="dash-link">Statistics</NavLink>
        </nav>

        <div className="dash-bottom-links">
          <NavLink to="/dashboard/profile" className="dash-link">Profile</NavLink>
          <NavLink to="/login" className="dash-link logout">Log Out</NavLink>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="dash-main">
        <header className="dash-topbar">
          <span className="dash-topbar-title">Mashwara-e-Taleem</span>
        </header>

<div className="dash-content">
  <Outlet />
</div>

      </main>

    </div>
  );
}
