import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../AuthContext";
import { getUserProfile } from "../../api/userapi";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import "./HomePage.css";

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

function fieldHasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  return String(value || "").trim().length > 0;
}

function getProfileCompletion(profile) {
  if (!profile) return 0;

  const completed = PROFILE_FIELDS.filter((field) => fieldHasValue(profile[field])).length;
  return Math.round((completed / PROFILE_FIELDS.length) * 100);
}

function getTopUniversities(universities) {
  return [...(universities || [])]
    .sort((a, b) => Number(b.final_score || b.eligibility_probability || 0) - Number(a.final_score || a.eligibility_probability || 0))
    .slice(0, 3);
}

function deadlineToEpoch(deadline) {
  if (!deadline) return Number.MAX_SAFE_INTEGER;
  const parsed = Date.parse(deadline);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function getTopScholarships(scholarships) {
  return [...(scholarships || [])]
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, 3);
}

function getUpcomingScholarshipDeadline(scholarships) {
  const upcoming = [...(scholarships || [])]
    .map((item) => ({ ...item, epoch: deadlineToEpoch(item.deadline) }))
    .filter((item) => Number.isFinite(item.epoch) && item.epoch !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.epoch - b.epoch)[0];

  return upcoming || null;
}

function InstructionsPage() {
  const { user, universities = [], universitiesLoading } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [scholarships, setScholarships] = useState([]);
  const [scholarshipsLoading, setScholarshipsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadScholarships() {
      try {
        const response = await fetch("http://localhost:5000/api/scholarships?domain=Computer%20Science");
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not load scholarships");

        if (active) {
          setScholarships(Array.isArray(data?.scholarships) ? data.scholarships : []);
        }
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

  const profileCompletion = useMemo(() => getProfileCompletion(profile), [profile]);
  const profileComplete = profileCompletion >= 60;
  const topUniversities = useMemo(() => getTopUniversities(universities), [universities]);
  const topScholarships = useMemo(() => getTopScholarships(scholarships), [scholarships]);
  const upcomingDeadline = useMemo(() => getUpcomingScholarshipDeadline(scholarships), [scholarships]);

  const stats = [
    { label: "Profile completion", value: `${profileCompletion}%` },
    { label: "University matches", value: universitiesLoading ? "..." : String(universities.length) },
    { label: "Scholarship leads", value: scholarshipsLoading ? "..." : String(scholarships.length) },
    { label: "Modules active", value: "4" },
  ];

  return (
    <div className="home-instructions-shell">
      <section className="home-hero-wave">
        <div className="home-hero-copy">
          <p className="home-kicker">Mashwara-e-Taleem Journey</p>
          <h1>From profile to admission plan</h1>
          <p>
            Follow the flow, unlock recommendations, and use each module at the right time.
            This page becomes your real-time dashboard as soon as your profile is ready.
          </p>
          <div className="home-cta-row">
            <Link to={user ? "/dashboard/profile" : "/signup"} className="home-cta-primary">
              {user ? "Complete Profile" : "Create Account"}
            </Link>
            <Link to={user ? "/dashboard" : "/login"} className="home-cta-secondary">
              {user ? "Open Dashboard" : "Log In"}
            </Link>
          </div>
        </div>

        <div className="home-hero-stats">
          {stats.map((item, index) => (
            <article key={item.label} className="home-stat-card" style={{ animationDelay: `${index * 90}ms` }}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="home-steps" aria-label="Instruction steps">
        <h2>How to use the platform</h2>
        <div className="home-step-grid">
          <article className="home-step-card">
            <span>Step 1</span>
            <h3>Fill your profile</h3>
            <p>Add academics, scores, preferences, and goals so every module can personalize results.</p>
          </article>
          <article className="home-step-card">
            <span>Step 2</span>
            <h3>View universities and scholarships</h3>
            <p>See your top opportunities and compare options by match strength, deadlines, and funding.</p>
          </article>
          <article className="home-step-card">
            <span>Step 3</span>
            <h3>Analyze your SOP and CV</h3>
            <p>Use document analysis to improve writing quality before final submission rounds.</p>
          </article>
          <article className="home-step-card">
            <span>Step 4</span>
            <h3>Ask AI Advisor</h3>
            <p>Get strategic next actions and personalized guidance based on your current progress.</p>
          </article>
        </div>
      </section>

      {!user && (
        <section className="home-lock-state">
          <h2>Sign in to unlock live recommendations</h2>
          <p>The page will automatically switch to your personalized statistics and top matches.</p>
        </section>
      )}

      {user && (
        <section className="home-live-section" aria-live="polite">
          <div className="home-live-head">
            <h2>{profileComplete ? "Your live recommendation snapshot" : "Profile-first mode"}</h2>
            <p>
              {profileLoading
                ? "Checking your profile..."
                : profileComplete
                ? "Profile is ready. Here are the best opportunities currently available."
                : "Complete profile fields to unlock stronger recommendations."}
            </p>
          </div>

          <div className="home-progress-wrap">
            <div className="home-progress-labels">
              <span>Profile completion</span>
              <strong>{profileCompletion}%</strong>
            </div>
            <div className="home-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profileCompletion}>
              <div className="home-progress-fill" style={{ width: `${profileCompletion}%` }} />
            </div>
          </div>

          <div className="home-live-grid">
            <article className="home-live-card">
              <h3>Top Universities</h3>
              {universitiesLoading ? (
                <p>Loading matches...</p>
              ) : topUniversities.length === 0 ? (
                <p>No university matches yet. Update profile scores to get results.</p>
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

            <article className="home-live-card">
              <h3>Top Scholarships</h3>
              {scholarshipsLoading ? (
                <p>Loading scholarships...</p>
              ) : topScholarships.length === 0 ? (
                <p>No scholarships available right now.</p>
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

            <article className="home-live-card">
              <h3>Next Priority</h3>
              {profileComplete ? (
                <p>
                  {upcomingDeadline
                    ? `Upcoming scholarship deadline: ${upcomingDeadline.deadline} (${upcomingDeadline.title}).`
                    : "Use AI Advisor to choose your next action based on your top matches."}
                </p>
              ) : (
                <p>
                  Finish profile details first, then run University Recommendations and Scholarship Finder.
                </p>
              )}
              <Link to="/dashboard/ai-advisor">Ask AI Advisor</Link>
            </article>
          </div>
        </section>
      )}
    </div>
  );
}

const HomePage = () => {
  return (
    <>
      <Navbar />
      <InstructionsPage />
      <Footer />
    </>
  );
};

export default HomePage;
