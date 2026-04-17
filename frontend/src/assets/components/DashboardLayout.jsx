import React from "react";
import { Outlet } from "react-router-dom";

import "./DashboardLayout.css";
import { NavLink } from "react-router-dom";
import {
  LuHouse,
  LuUniversity,
  LuBadgeDollarSign,
  LuFileSearch,
  LuBot,
  LuFileCheck,
  LuUser,
  LuLogOut,
} from "react-icons/lu";
import logo from "../logo.png";

export default function DashboardLayout() {
  const navItems = [
    { to: "/dashboard", label: "Home", icon: LuHouse, end: true },
    { to: "/dashboard/universities", label: "Universities", icon: LuUniversity },
    { to: "/dashboard/scholarships", label: "Scholarships", icon: LuBadgeDollarSign },
    { to: "/dashboard/analyzer", label: "Document Analyzer", icon: LuFileSearch },
    { to: "/dashboard/ai-advisor", label: "AI Advisor", icon: LuBot },
    { to: "/dashboard/visa-guidance", label: "Visa Guidance", icon: LuFileCheck },
  ];

  return (
    <div className="dash-wrapper">
      {/* SIDEBAR */}
      <aside className="dash-sidebar">
        <div className="dash-logo-box">
          <img src={logo} alt="logo" />
          <h3 className="dash-logo-title">Mashwara-e-Taleem</h3>
        </div>

        <nav className="dash-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `dash-link ${isActive ? "active" : ""}`.trim()}
              >
                <Icon className="dash-link-icon" strokeWidth={1.9} aria-hidden="true" />
                <span className="dash-link-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="dash-bottom-links">
          <NavLink
            to="/dashboard/profile"
            className={({ isActive }) => `dash-link ${isActive ? "active" : ""}`.trim()}
          >
            <LuUser className="dash-link-icon" strokeWidth={1.9} aria-hidden="true" />
            <span className="dash-link-label">Profile</span>
          </NavLink>
          <NavLink to="/login" className="dash-link logout">
            <LuLogOut className="dash-link-icon" strokeWidth={1.9} aria-hidden="true" />
            <span className="dash-link-label">Log Out</span>
          </NavLink>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="dash-main">
        <div className="dash-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
