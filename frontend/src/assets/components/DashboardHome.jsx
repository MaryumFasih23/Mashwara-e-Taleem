import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../AuthContext";
import { getUserProfile } from "../../api/userapi";
import "./DashboardHome.css";

const PROFILE_FIELDS = [
  "name",
  "email",
  "educationLevel",
  "fieldOfStudy",
  "institution",
  "cgpa",
  "preferredStudyLevel",
  "preferredCountries",
  "preferredPrograms",
  "careerGoals",
];

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  return String(value || "").trim().length > 0;
}

function getProfileCompletion(profile) {
  if (!profile) return 0;
  const completed = PROFILE_FIELDS.filter((field) => hasValue(profile[field])).length;
  return Math.round((completed / PROFILE_FIELDS.length) * 100);
}

function getTopUniversities(universities) {
  return [...(universities || [])]
    .sort(
      (a, b) =>
        Number(b.final_score || b.eligibility_probability || 0) -
        Number(a.final_score || a.eligibility_probability || 0)
    )
    .slice(0, 3);
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

export default function DashboardHome() {
  const { user, universities = [], universitiesLoading } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [scholarships, setScholarships] = useState([]);
  const [scholarshipsLoading, setScholarshipsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user?.uid) {
        setProfile(null);
        return;
      }

      setProfileLoading(true);
      try {
        const data = await getUserProfile(user.uid);
        if (active) setProfile(data || null);
      } catch {
        if (active) setProfile(null);
      } finally {
        if (active) setProfileLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    let active = true;

    async function loadScholarships() {
      setScholarshipsLoading(true);
      try {
        const response = await fetch("http://localhost:5000/api/scholarships?domain=Computer%20Science");
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not load scholarships");

        if (active) setScholarships(Array.isArray(data?.scholarships) ? data.scholarships : []);
      } catch {
        if (active) setScholarships([]);
      } finally {
        if (active) setScholarshipsLoading(false);
      }
    }

    loadScholarships();

    return () => {
      active = false;
    };
  }, []);

  const profileCompletion = useMemo(() => getProfileCompletion(profile), [profile]);
  const profileReady = profileCompletion >= 60;

  const topUniversities = useMemo(() => getTopUniversities(universities), [universities]);
  const topScholarships = useMemo(() => getTopScholarships(scholarships), [scholarships]);
  const upcomingDeadline = useMemo(() => getUpcomingDeadline(scholarships), [scholarships]);

  const quickStats = [
    { label: "Profile", value: `${profileCompletion}%` },
    { label: "Universities", value: universitiesLoading ? "..." : String(universities.length) },
    { label: "Scholarships", value: scholarshipsLoading ? "..." : String(scholarships.length) },
    { label: "Modules", value: "4" },
  ];

  return (
    <div className="dh2-shell">
      <section className="dh2-hero">
        <div className="dh2-hero-copy">
          <p className="dh2-kicker">Dashboard Journey</p>
          <h1>Your step-by-step application flow</h1>
          <p>
            Follow these steps to improve profile quality, unlock better recommendations, and take action
            across universities, scholarships, document analysis, and AI guidance.
          </p>
          <div className="dh2-cta-row">
            <Link to="/dashboard/profile" className="dh2-btn dh2-btn-primary">
              Update Profile
            </Link>
            <Link to="/dashboard/ai-advisor" className="dh2-btn dh2-btn-secondary">
              Ask AI Advisor
            </Link>
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

      <section className="dh2-live" aria-live="polite">
        <div className="dh2-live-head">
          <h2>{profileReady ? "Live recommendation snapshot" : "Profile-first mode"}</h2>
          <p>
            {profileLoading
              ? "Checking your profile..."
              : profileReady
              ? "Profile is sufficiently complete. These are your top current opportunities."
              : "Complete more profile fields to unlock stronger matching quality."}
          </p>
        </div>

        <div className="dh2-progress-wrap">
          <div className="dh2-progress-labels">
            <span>Profile completion</span>
            <strong>{profileCompletion}%</strong>
          </div>
          <div className="dh2-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profileCompletion}>
            <div className="dh2-progress-fill" style={{ width: `${profileCompletion}%` }} />
          </div>
        </div>

        <div className="dh2-live-grid">
          <article className="dh2-live-card">
            <h3>Top Universities</h3>
            {universitiesLoading ? (
              <p>Loading matches...</p>
            ) : topUniversities.length === 0 ? (
              <p>No university matches yet. Add profile scores to unlock recommendations.</p>
            ) : (
              <ul>
                {topUniversities.map((uni) => (
                  <li key={`${uni.university}-${uni.country}`}>
                    <span>{uni.university}</span>
                    <small>{Math.round(Number(uni.eligibility_probability || 0) * 100)}% match</small>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/dashboard/universities">Open Universities</Link>
          </article>

          <article className="dh2-live-card">
            <h3>Top Scholarships</h3>
            {scholarshipsLoading ? (
              <p>Loading scholarships...</p>
            ) : topScholarships.length === 0 ? (
              <p>No scholarships found right now.</p>
            ) : (
              <ul>
                {topScholarships.map((item) => (
                  <li key={`${item.title}-${item.provider}`}> 
                    <span>{item.title}</span>
                    <small>{item.provider || "Provider"}</small>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/dashboard/scholarships">Open Scholarships</Link>
          </article>

          <article className="dh2-live-card">
            <h3>Next Priority</h3>
            {profileReady ? (
              <p>
                {upcomingDeadline
                  ? `Upcoming scholarship deadline: ${upcomingDeadline.deadline} (${upcomingDeadline.title}).`
                  : "Use AI Advisor to decide your next action from available opportunities."}
              </p>
            ) : (
              <p>Finish profile details first, then revisit recommendations for better ranking quality.</p>
            )}
            <Link to="/dashboard/analyzer">Open Analyzer</Link>
          </article>
        </div>
      </section>
    </div>
  );
}
