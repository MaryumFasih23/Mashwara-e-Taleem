import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../AuthContext";
import "./DashboardHome.css";

function getTopUniversities(universities) {
  return [...(universities || [])]
    .sort((a, b) =>
      Number(b.final_score || b.eligibility_probability || 0) -
      Number(a.final_score || a.eligibility_probability || 0)
    )
    .slice(0, 5);
}

function toEpoch(deadline) {
  if (!deadline) return Number.MAX_SAFE_INTEGER;
  const parsed = Date.parse(deadline);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function getTopScholarships(list) {
  return [...(list || [])].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, 3);
}

function getUpcomingDeadline(list) {
  const upcoming = [...(list || [])]
    .map((item) => ({ ...item, epoch: toEpoch(item.deadline) }))
    .filter((item) => item.epoch !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.epoch - b.epoch)[0];
  return upcoming || null;
}

// Horizontal bar chart for university match scores
function UniBarChart({ universities }) {
  const COLORS = ["#2a7f78", "#15b89f", "#1f8a80", "#3fa99f", "#6dc9be"];
  if (!universities.length) {
    return <p className="dh2-chart-empty">Complete your profile to see university matches.</p>;
  }
  const max = Math.max(...universities.map((u) => Number(u.eligibility_probability || 0) * 100), 1);

  return (
    <div className="dh2-bar-chart">
      {universities.map((uni, i) => {
        const pct = Math.round(Number(uni.eligibility_probability || 0) * 100);
        const barW = pct;
        return (
          <div key={`${uni.university}-${i}`} className="dh2-bar-row">
            <span className="dh2-bar-name" title={uni.university}>
              {uni.university?.length > 22 ? uni.university.slice(0, 22) + "…" : uni.university}
            </span>
            <div className="dh2-bar-track">
              <div
                className="dh2-bar-fill"
                style={{
                  width: `${barW}%`,
                  background: COLORS[i % COLORS.length],
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            </div>
            <span className="dh2-bar-val">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// Mini sparkline for scholarship scores
function ScholarshipSparkline({ scholarships }) {
  if (!scholarships.length) {
    return <p className="dh2-chart-empty">No scholarships loaded yet.</p>;
  }
  const max = Math.max(...scholarships.map((s) => Number(s.score || 0)), 1);
  const W = 280, H = 70, pad = 16;
  const pts = scholarships.map((s, i) => {
    const x = pad + (i / (scholarships.length - 1 || 1)) * (W - pad * 2);
    const y = H - pad - ((Number(s.score || 0) / max) * (H - pad * 2));
    return `${x},${y}`;
  });

  return (
    <div className="dh2-spark-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="dh2-sparkline">
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="#2a7f78"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {scholarships.map((s, i) => {
          const [x, y] = pts[i].split(",");
          return (
            <circle key={i} cx={x} cy={y} r="4" fill="#15b89f">
              <title>{s.title} — score: {s.score}</title>
            </circle>
          );
        })}
      </svg>
      <div className="dh2-spark-labels">
        {scholarships.map((s, i) => (
          <span key={i} title={s.title}>
            {s.title?.length > 14 ? s.title.slice(0, 14) + "…" : s.title}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const { user, universities = [], universitiesLoading } = useContext(AuthContext);
  const [scholarships, setScholarships] = useState([]);
  const [scholarshipsLoading, setScholarshipsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadScholarships() {
      setScholarshipsLoading(true);
      try {
        const response = await fetch("http://localhost:5000/api/scholarships?domain=Computer%20Science");
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not load scholarships");
        if (active) setScholarships(Array.isArray(data?.scholarships) ? data.scholarships : []);
      } catch { if (active) setScholarships([]); }
      finally { if (active) setScholarshipsLoading(false); }
    }
    loadScholarships();
    return () => { active = false; };
  }, []);

  const topUniversities = useMemo(() => getTopUniversities(universities), [universities]);
  const topScholarships = useMemo(() => getTopScholarships(scholarships), [scholarships]);
  const upcomingDeadline = useMemo(() => getUpcomingDeadline(scholarships), [scholarships]);

  const quickStats = [
    { label: "Universities", value: universitiesLoading ? "…" : String(universities.length) },
    { label: "Scholarships", value: scholarshipsLoading ? "…" : String(scholarships.length) },
    { label: "Modules", value: "4" },
  ];

  return (
    <div className="dh2-shell">
      {/* HERO */}
      <section className="dh2-hero">
        <div className="dh2-hero-copy">
          <p className="dh2-kicker">Dashboard Journey</p>
          <h1>Your step-by-step application flow</h1>
          <p>
            Follow these steps to unlock better recommendations and take action across
            universities, scholarships, document analysis, and AI guidance.
          </p>
          <div className="dh2-cta-row">
            <Link to="/dashboard/profile" className="dh2-btn dh2-btn-primary">Update Profile</Link>
            <Link to="/dashboard/ai-advisor" className="dh2-btn dh2-btn-secondary">Ask AI Advisor</Link>
          </div>
        </div>

        <div className="dh2-stats-grid">
          {quickStats.map((item, index) => (
            <article key={item.label} className="dh2-stat-card" style={{ animationDelay: `${index * 90}ms` }}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </section>

      {/* STEPS */}
      <section className="dh2-steps">
        <h2>Instruction Path</h2>
        <div className="dh2-step-grid">
          <article className="dh2-step-card">
            <span>Step 1</span>
            <h3>Complete your profile</h3>
            <p>Fill education, test scores, preferences, and goals to get accurate recommendations.</p>
          </article>
          <article className="dh2-step-card">
            <span>Step 2</span>
            <h3>Review top opportunities</h3>
            <p>Open university matches and scholarship leads based on your profile details.</p>
          </article>
          <article className="dh2-step-card">
            <span>Step 3</span>
            <h3>Analyze documents</h3>
            <p>Use the analyzer to improve SOP and resume strength before submissions.</p>
          </article>
          <article className="dh2-step-card">
            <span>Step 4</span>
            <h3>Get AI strategy</h3>
            <p>Use AI Advisor for your next best action based on your current progress.</p>
          </article>
        </div>
      </section>

      {/* CHARTS */}
      <section className="dh2-charts">
        <h2>Your Opportunities at a Glance</h2>
        <p className="dh2-charts-sub">Live data from your current recommendations.</p>

        <div className="dh2-charts-grid">
          {/* University Match Bar Chart */}
          <article className="dh2-chart-card">
            <h3>University Match Scores</h3>
            {universitiesLoading ? (
              <p className="dh2-chart-empty">Loading matches…</p>
            ) : (
              <UniBarChart universities={topUniversities} />
            )}
            <Link to="/dashboard/universities" className="dh2-chart-link">View All Universities →</Link>
          </article>

          {/* Scholarship Sparkline */}
          <article className="dh2-chart-card">
            <h3>Scholarship Score Trend</h3>
            {scholarshipsLoading ? (
              <p className="dh2-chart-empty">Loading scholarships…</p>
            ) : (
              <ScholarshipSparkline scholarships={topScholarships} />
            )}
            {upcomingDeadline && (
              <div className="dh2-deadline-badge">
                ⏰ Next deadline: <strong>{upcomingDeadline.deadline}</strong>
              </div>
            )}
            <Link to="/dashboard/scholarships" className="dh2-chart-link">View All Scholarships →</Link>
          </article>

          {/* Priority card */}
          <article className="dh2-chart-card dh2-priority-card">
            <h3>Next Priority</h3>
            <div className="dh2-priority-body">
              <div className="dh2-priority-icon">🎯</div>
              <p>
                {upcomingDeadline
                  ? `Upcoming scholarship deadline: ${upcomingDeadline.deadline} — "${upcomingDeadline.title}".`
                  : "Use the AI Advisor to decide your next action from available opportunities."}
              </p>
            </div>
            <Link to="/dashboard/analyzer" className="dh2-chart-link">Open Document Analyzer →</Link>
          </article>
        </div>
      </section>
    </div>
  );
}