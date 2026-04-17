import React, { useEffect, useMemo, useState } from "react";
import ScholarshipFilters from "./ScholarshipFilters";
import ScholarshipCard from "./ScholarshipCard";
import "./scholarships.css";

const COUNTRIES = ["All", "USA", "UK", "Canada", "Australia", "Qatar", "Germany"];
const TARGET_COUNTRIES = COUNTRIES.slice(1);
const DEGREE_LEVELS = ["All", "Bachelor", "Master"];

const COUNTRY_ALIASES = {
  "united states": "USA",
  "united states of america": "USA",
  us: "USA",
  usa: "USA",
  "united kingdom": "UK",
  england: "UK",
  britain: "UK",
  uk: "UK",
  canada: "Canada",
  australia: "Australia",
  qatar: "Qatar",
  germany: "Germany",
};

const normalizeCountry = (country = "") => {
  const key = String(country).trim().toLowerCase();
  return COUNTRY_ALIASES[key] || country || "Unknown";
};

const normalizeDegree = (degree = "") => {
  const value = String(degree).toLowerCase();
  const hasBachelor = value.includes("bachelor") || value.includes("undergraduate");
  const hasMaster = value.includes("master") || value.includes("ms");
  if (hasBachelor && hasMaster) return "Bachelor/Master";
  if (hasBachelor) return "Bachelor";
  if (hasMaster) return "Master";
  return degree || "Unknown";
};

const normalizeScholarship = (scholarship) => ({
  ...scholarship,
  country: normalizeCountry(scholarship.country),
  degreeLevel: normalizeDegree(scholarship.degreeLevel),
  score: Number(scholarship.score || 0),
});

const isBachelorOrMaster = (scholarship) => {
  const degree = String(scholarship.degreeLevel || "").toLowerCase();
  return degree.includes("bachelor") || degree.includes("master");
};

const deadlineValue = (deadline = "") => {
  const text = String(deadline).toLowerCase();
  if (!text || text === "unknown") return Number.MAX_SAFE_INTEGER;

  const parsed = Date.parse(deadline);
  if (!Number.isNaN(parsed)) return parsed;

  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const monthIndex = months.findIndex((month) => text.includes(month));
  return monthIndex >= 0 ? monthIndex : Number.MAX_SAFE_INTEGER - 1;
};

const fundingValue = (amount = "") => {
  const text = String(amount).toLowerCase();
  if (text.includes("fully funded")) return 3;
  if (text.includes("partial")) return 2;
  if (text.includes("tuition")) return 1;
  return 0;
};

const ScholarshipsPage = () => {
  const [scholarships, setScholarships] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedDegree, setSelectedDegree] = useState("All");
  const [sortBy, setSortBy] = useState("Best Match");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState({ count: 0, rawCount: 0, fromCache: false });

  useEffect(() => {
    let active = true;

    async function loadScholarships() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/scholarships?domain=Computer%20Science");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load scholarships.");
        }

        const cleanScholarships = Array.isArray(data.scholarships)
          ? data.scholarships.map(normalizeScholarship).filter(isBachelorOrMaster)
          .filter((scholarship) => TARGET_COUNTRIES.includes(scholarship.country))
          : [];

        if (active) {
          setScholarships(cleanScholarships);
          setMeta({
            count: data.count || cleanScholarships.length,
            rawCount: data.rawCount || 0,
            fromCache: Boolean(data.fromCache),
          });
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadScholarships();

    return () => {
      active = false;
    };
  }, []);

  const filteredScholarships = useMemo(() => {
    let results = scholarships.filter((scholarship) => {
      const countryOk =
        selectedCountry === "All" || scholarship.country === selectedCountry;
      const degreeOk =
        selectedDegree === "All" ||
        String(scholarship.degreeLevel).toLowerCase().includes(selectedDegree.toLowerCase());

      return countryOk && degreeOk;
    });

    if (sortBy === "Deadline") {
      results = [...results].sort(
        (a, b) => deadlineValue(a.deadline) - deadlineValue(b.deadline)
      );
    } else if (sortBy === "Funding") {
      results = [...results].sort(
        (a, b) =>
          fundingValue(b.amount) - fundingValue(a.amount) ||
          b.score - a.score
      );
    } else {
      results = [...results].sort(
        (a, b) =>
          b.score - a.score ||
          Number(b.isGovernment) - Number(a.isGovernment) ||
          fundingValue(b.amount) - fundingValue(a.amount)
      );
    }

    return results;
  }, [scholarships, selectedCountry, selectedDegree, sortBy]);

  const stats = useMemo(() => {
    const fullyFunded = scholarships.filter((item) =>
      String(item.amount).toLowerCase().includes("fully funded")
    ).length;
    const government = scholarships.filter((item) => item.isGovernment).length;

    return [
      { label: "Scholarships", value: scholarships.length },
      { label: "Fully funded", value: fullyFunded },
      { label: "Government", value: government },
    ];
  }, [scholarships]);

  return (
    <div className="scholarships-shell">
      <Sidebar />

      <main className="scholarships-main">
        <header className="page-header">
          <div>
            <p className="eyebrow">Mashwara-e-Taleem</p>
            <h1>Scholarships</h1>
            <p className="page-subtitle">
              Ranked Bachelor and Master scholarships from trusted global sources.
            </p>
          </div>

          <label className="sort-box">
            <span>Sort by</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option>Best Match</option>
              <option>Deadline</option>
              <option>Funding</option>
            </select>
          </label>
        </header>

        <section className="stats-row" aria-label="Scholarship summary">
          {stats.map((item) => (
            <div className="stat-card" key={item.label}>
              <strong>{loading ? "-" : item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </section>

        <div className="dashboard-grid">
          <ScholarshipFilters
            countries={COUNTRIES}
            degreeLevels={DEGREE_LEVELS}
            selectedCountry={selectedCountry}
            selectedDegree={selectedDegree}
            onCountryChange={setSelectedCountry}
            onDegreeChange={setSelectedDegree}
            onReset={() => {
              setSelectedCountry("All");
              setSelectedDegree("All");
            }}
          />

          <section className="results-area" aria-live="polite">
            <div className="results-header">
              <div>
                <h2>{filteredScholarships.length} scholarships found</h2>
                <p>
                  {meta.fromCache ? "Loaded from cache" : "Loaded from backend"}
                  {meta.rawCount ? ` from ${meta.rawCount} raw results` : ""}
                </p>
              </div>
            </div>

            {loading && (
              <div className="state-card">
                <h3>Loading scholarships</h3>
                <p>Fetching your ranked scholarship list from the backend.</p>
              </div>
            )}

            {error && (
              <div className="state-card error-card">
                <h3>Scholarships could not load</h3>
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && filteredScholarships.length === 0 && (
              <div className="state-card">
                <h3>No results for this filter</h3>
                <p>Choose another country or reset the filters.</p>
              </div>
            )}

            {!loading &&
              !error &&
              filteredScholarships.map((scholarship) => (
                <ScholarshipCard
                  key={`${scholarship.title}-${scholarship.provider}-${scholarship.applicationLink}`}
                  scholarship={scholarship}
                />
              ))}
          </section>
        </div>
      </main>
    </div>
  );
};

const Sidebar = () => {
  const navItems = [
    "Home",
    "Universities",
    "Scholarships",
    "Document Analyzer",
    "AI Advisor",
    "Visa Guidance",
  ];

  return (
    <aside className="sidebar">
      <div className="brand-panel">
        <div className="brand-icon">MT</div>
        <div>
          <strong>Mashwara-e-Taleem</strong>
          <span>Scholarship finder</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <a
            href="#"
            key={item}
            className={item === "Scholarships" ? "active" : ""}
          >
            {item}
          </a>
        ))}
      </nav>

      <nav className="sidebar-nav account-nav" aria-label="Account navigation">
        <a href="#">Profile</a>
        <a href="#">Log Out</a>
      </nav>
    </aside>
  );
};

export default ScholarshipsPage;
