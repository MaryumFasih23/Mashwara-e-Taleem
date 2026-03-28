import React from "react";
import "./Dashboard.css";
import logo from "../logo.png";
import dashboardImage from "../logo_dash.png";
import { getAuth, signOut } from "firebase/auth";
import { app } from "../../firebaseConfig";

const statCards = [
  { label: "Universities saved", value: "12", delta: "+2 this week" },
  { label: "Scholarships tracked", value: "7", delta: "3 due soon" },
  { label: "Docs analyzed", value: "18", delta: "Last 24h: 3" },
  { label: "Tasks completed", value: "42", delta: "82% on track" },
];

const deadlines = [
  { title: "University of Toronto", due: "in 5 days", type: "Application" },
  { title: "DAAD Scholarship", due: "Oct 12", type: "Scholarship" },
  { title: "Reference letters", due: "Oct 18", type: "Documents" },
];

const quickActions = [
  { title: "Document Analyzer", description: "Refine SOPs and CVs with AI." },
  { title: "AI Advisor", description: "Ask questions about programs and visas." },
  { title: "Scholarship Finder", description: "Curated matches for your profile." },
  { title: "Task Planner", description: "Create checklists and reminders." },
];

const recentActivity = [
  { title: "Reviewed Statement of Purpose", time: "2h ago" },
  { title: "Updated scholarship shortlist", time: "5h ago" },
  { title: "Shared AI summary with mentor", time: "Yesterday" },
];

export default function Dashboard() {
  const auth = getAuth(app);

  return (
    <div className="dash-shell">
      {/* LEFT SIDEBAR */}
      <aside className="dash-sidebar">
        <div className="dash-logo-block">
          <div className="dash-logo-circle">
            <img className="dash-logo" src={dashboardImage} alt="Dashboard logo" />
          </div>
        </div>

        <nav className="dash-nav">
          <button className="dash-nav-item active">Home</button>
          <button className="dash-nav-item">Universities</button>
          <button className="dash-nav-item">Scholarships</button>
          <button className="dash-nav-item">Document Analyzer</button>
          <button className="dash-nav-item">AI Advisor</button>
          <button className="dash-nav-item">Statistics</button>
        </nav>

        <div className="dash-bottom">
          <button className="dash-nav-item">Profile</button>
          <button className="dash-nav-item danger" onClick={() => signOut(auth)}>
            Log Out
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN AREA */}
      <div className="dash-main">
        {/* TOP BAR */}
        <header className="dash-topbar">
          <div className="dash-brand">
            <img className="dash-brand-logo" src={logo} alt="Mashwara logo" />
            <div className="dash-brand-copy">
              <span className="dash-brand-text">Mashwara-e-Taleem</span>
              <p className="dash-brand-sub">Guidance for your study abroad journey</p>
            </div>
          </div>
          <div className="dash-top-actions">
            <input
              type="search"
              className="dash-search"
              placeholder="Search universities, scholarships, or tasks"
            />
            <div className="dash-avatar">M</div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="dash-content">
          <section className="dash-hero">
            <div className="dash-hero-text">
              <p className="dash-kicker">Welcome back</p>
              <h1>Plan your next step with confidence</h1>
              <p className="dash-hero-body">
                Track applications, improve documents, and get tailored scholarship guidance
                from one place.
              </p>
              <div className="dash-hero-actions">
                <button className="dash-btn primary">Start new application</button>
                <button className="dash-btn ghost">Open document analyzer</button>
              </div>
            </div>
            <div className="dash-hero-pane">
              <div className="dash-progress">
                <div className="dash-progress-label">
                  <span>Overall readiness</span>
                  <span>82%</span>
                </div>
                <div className="dash-progress-track">
                  <div className="dash-progress-fill" style={{ width: "82%" }} />
                </div>
              </div>
              <div className="dash-bubbles">
                <div className="dash-bubble">
                  <span>3</span>
                  <small>Deadlines this week</small>
                </div>
                <div className="dash-bubble alt">
                  <span>+12</span>
                  <small>Scholarships matched</small>
                </div>
              </div>
            </div>
          </section>

          <section className="dash-cards">
            {statCards.map((item) => (
              <div key={item.label} className="dash-card">
                <p className="dash-card-label">{item.label}</p>
                <p className="dash-card-value">{item.value}</p>
                <p className="dash-card-delta">{item.delta}</p>
              </div>
            ))}
          </section>

          <section className="dash-panels">
            <div className="dash-panel">
              <div className="dash-panel-header">
                <h3>Upcoming deadlines</h3>
                <button className="dash-link">View all</button>
              </div>
              <ul className="dash-deadlines">
                {deadlines.map((item) => (
                  <li key={item.title} className="dash-deadline">
                    <div>
                      <p className="dash-deadline-title">{item.title}</p>
                      <span className="dash-pill">{item.type}</span>
                    </div>
                    <span className="dash-deadline-date">{item.due}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="dash-panel">
              <div className="dash-panel-header">
                <h3>Quick actions</h3>
                <button className="dash-link">Customize</button>
              </div>
              <div className="dash-actions">
                {quickActions.map((item) => (
                  <button key={item.title} className="dash-action">
                    <p className="dash-action-title">{item.title}</p>
                    <p className="dash-action-desc">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="dash-activity-panel">
            <div className="dash-panel-header">
              <h3>Recent activity</h3>
              <button className="dash-link">Share</button>
            </div>
            <ul className="dash-activity">
              {recentActivity.map((item) => (
                <li key={item.title} className="dash-activity-item">
                  <div>
                    <p className="dash-activity-title">{item.title}</p>
                    <span className="dash-activity-time">{item.time}</span>
                  </div>
                  <button className="dash-tag">Follow up</button>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}
