import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../AuthContext";
import {
  getUniversityProgramEligibility,
} from "../../api/universityapi";
import "./Universities.css";

const RESULTS_PER_PAGE = 6;

function formatCurrency(value) {
  if (!Number.isFinite(value) || value <= 0) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  const normalized = Math.min(Math.max(value, 0), 1);
  return `${(normalized * 100).toFixed(2)}%`;
}

function normalizeCountryLabel(country) {
  const value = String(country || "").trim();
  return value || "Unknown";
}

const COUNTRY_CODE_OVERRIDES = {
  usa: "US",
  us: "US",
  uk: "GB",
  uae: "AE",
  "united states": "US",
  "united states of america": "US",
  "united kingdom": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "south korea": "KR",
  "north korea": "KP",
  russia: "RU",
  vietnam: "VN",
  laos: "LA",
  iran: "IR",
  syria: "SY",
  bolivia: "BO",
  tanzania: "TZ",
  venezuela: "VE",
  moldova: "MD",
  palestine: "PS",
  kosovo: "XK",
};

function toCountryCode(country) {
  const raw = String(country || "").trim();
  if (!raw) return "";

  if (/^[A-Za-z]{2}$/.test(raw)) {
    const twoLetter = raw.toUpperCase();
    if (twoLetter === "UK") return "GB";
    return twoLetter;
  }

  const key = raw
    .toLowerCase()
    .replace(/[().,]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (key.includes("united kingdom") || key === "uk" || key.includes("great britain") || key.includes("britain")) {
    return "GB";
  }

  if (key.includes("united states") || key === "usa" || key === "us") {
    return "US";
  }

  if (COUNTRY_CODE_OVERRIDES[key]) {
    return COUNTRY_CODE_OVERRIDES[key];
  }

  try {
    const display = new Intl.DisplayNames(["en"], { type: "region" });
    const regionCodes = [
      "AE", "AR", "AT", "AU", "BD", "BE", "BG", "BH", "BR", "CA", "CH", "CL", "CN", "CO", "CZ", "DE", "DK", "DZ", "EE", "EG", "ES", "FI", "FR", "GB", "GR", "HK", "HR", "HU", "ID", "IE", "IL", "IN", "IQ", "IR", "IT", "JO", "JP", "KE", "KR", "KW", "KZ", "LB", "LK", "LT", "LU", "LV", "MA", "MM", "MX", "MY", "NG", "NL", "NO", "NP", "NZ", "OM", "PH", "PK", "PL", "PT", "QA", "RO", "RS", "RU", "SA", "SE", "SG", "SI", "SK", "TH", "TN", "TR", "TW", "UA", "US", "VN", "ZA",
    ];

    const matched = regionCodes.find((code) => {
      const name = display.of(code);
      return name && name.toLowerCase() === key;
    });

    return matched || "";
  } catch {
    return "";
  }
}

function getCountryFlagImageUrl(country) {
  const code = toCountryCode(country);
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

export default function Universities() {
  const { user, universities, universitiesLoading, universitiesError, getCachedPrograms, setProgramsCache } = useContext(AuthContext);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("bestMatch");
  const [minMatch, setMinMatch] = useState("all");
  const [selectedCountries, setSelectedCountries] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [results, setResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [programLoading, setProgramLoading] = useState(false);
  const [programError, setProgramError] = useState("");
  const [programWarnings, setProgramWarnings] = useState([]);

  useEffect(() => {
    if (!user?.uid) {
      setResults([]);
      setError("");
      setWarnings([]);
      return;
    }

    setLoading(universitiesLoading);
    setError(universitiesError);
    setResults(universities);
    setSelectedUniversity(null);
    setPrograms([]);
    setProgramError("");
  }, [universities, universitiesLoading, universitiesError, user?.uid]);

  const countryOptions = useMemo(() => {
    const set = new Set();
    results.forEach((item) => set.add(normalizeCountryLabel(item.country)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [results]);

  useEffect(() => {
    if (countryOptions.length === 0) {
      setSelectedCountries([]);
      return;
    }

    setSelectedCountries((previous) => {
      if (previous.length === 0) {
        return [...countryOptions];
      }

      const filtered = previous.filter((country) => countryOptions.includes(country));
      return filtered.length > 0 ? filtered : [...countryOptions];
    });
  }, [countryOptions]);

  const filteredResults = useMemo(() => {
    let list = [...results];

    list = list.filter((item) => Number(item.eligibility_probability) >= 0.1);

    if (selectedCountries.length > 0) {
      list = list.filter((item) => selectedCountries.includes(normalizeCountryLabel(item.country)));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((item) => item.university?.toLowerCase().includes(q));
    }

    if (minMatch === "90") {
      list = list.filter((item) => Number(item.eligibility_probability) >= 0.9);
    } else if (minMatch === "70") {
      list = list.filter((item) => Number(item.eligibility_probability) >= 0.7);
    } else if (minMatch === "50") {
      list = list.filter((item) => Number(item.eligibility_probability) >= 0.5);
    }

    if (sortBy === "lowestTuition") {
      list.sort((a, b) => {
        const tuitionDiff = Number(a.tuition_usd || 0) - Number(b.tuition_usd || 0);
        if (tuitionDiff !== 0) return tuitionDiff;
        return Number(b.eligibility_probability || 0) - Number(a.eligibility_probability || 0);
      });
    } else {
      list.sort((a, b) => Number(b.final_score || 0) - Number(a.final_score || 0));
    }

    return list;
  }, [results, search, minMatch, sortBy, selectedCountries]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / RESULTS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, minMatch, sortBy, selectedCountries, user?.uid]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * RESULTS_PER_PAGE;
    return filteredResults.slice(start, start + RESULTS_PER_PAGE);
  }, [filteredResults, currentPage]);

  const pageStartIndex = filteredResults.length === 0 ? 0 : (currentPage - 1) * RESULTS_PER_PAGE + 1;
  const pageEndIndex = Math.min(currentPage * RESULTS_PER_PAGE, filteredResults.length);

  const topMatchPercent = useMemo(() => {
    if (filteredResults.length === 0) return 0;
    const best = Math.max(...filteredResults.map((item) => Number(item.eligibility_probability || 0)));
    return Math.round(best * 100);
  }, [filteredResults]);

  const avgTuition = useMemo(() => {
    if (filteredResults.length === 0) return 0;
    const tuitionValues = filteredResults
      .map((item) => Number(item.tuition_usd || 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (tuitionValues.length === 0) return 0;
    return Math.round(tuitionValues.reduce((sum, value) => sum + value, 0) / tuitionValues.length);
  }, [filteredResults]);

  const heroStats = [
    { label: "Universities", value: loading ? "..." : filteredResults.length },
    { label: "Top Match", value: `${topMatchPercent}%` },
    { label: "Countries", value: countryOptions.length },
    { label: "Avg Tuition", value: avgTuition > 0 ? `$${avgTuition.toLocaleString()}` : "N/A" },
  ];

  const handleCountryToggle = (country) => {
    setSelectedCountries((previous) => {
      if (previous.includes(country)) {
        return previous.filter((value) => value !== country);
      }
      return [...previous, country];
    });
  };

  const openPrograms = async (uni) => {
    if (!user?.uid) return;

    setSelectedUniversity(uni);
    setProgramError("");
    setProgramWarnings([]);
    setPrograms([]);

    const cacheKey = `${uni.university}---${uni.country}`;

    const cachedData = getCachedPrograms(cacheKey);
    if (cachedData) {
      setPrograms(cachedData.results || []);
      setProgramWarnings(cachedData.warnings || []);
      return;
    }

    setProgramLoading(true);

    try {
      const data = await getUniversityProgramEligibility(user.uid, {
        university: uni.university,
        country: uni.country,
        topK: 50,
      });

      setPrograms(data.results || []);
      setProgramWarnings(data.warnings || []);

      setProgramsCache(cacheKey, data);
    } catch (err) {
      const apiMessage = err?.response?.data?.error;
      const apiDetail = err?.response?.data?.detail;
      setProgramError(apiDetail ? `${apiMessage}: ${apiDetail}` : apiMessage || "Failed to fetch program eligibility.");
    } finally {
      setProgramLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setMinMatch("all");
    setSortBy("bestMatch");
    setSelectedCountries([...countryOptions]);
  };

  return (
    <div className="uni-container">
      <section className="uni-hero">
        <div className="uni-hero-copy">
          <p className="uni-kicker">Dashboard Journey</p>
          <h1>Discover your top universities</h1>
          <p>
            Review ranked university matches, compare tuition and requirements, then open program-level
            eligibility for each institution.
          </p>
        </div>
        <div className="uni-stats-grid">
          {heroStats.map((item, index) => (
            <article key={item.label} className="uni-stat-card" style={{ animationDelay: `${index * 80}ms` }}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </section>

      {selectedUniversity ? (
        <div className="uni-programs-view">
          <button
            className="uni-back-btn"
            onClick={() => {
              setSelectedUniversity(null);
              setPrograms([]);
              setProgramError("");
              setProgramWarnings([]);
            }}
          >
            ← Back to Universities
          </button>

          <h2 className="uni-programs-title">
            Program Eligibility for {selectedUniversity.university} ({normalizeCountryLabel(selectedUniversity.country)})
          </h2>

          {programWarnings.length > 0 && (
            <div className="uni-note">
              <strong>Profile notes:</strong> {programWarnings.join(" ")}
            </div>
          )}

          {programError && <div className="uni-error">{programError}</div>}

          {programLoading && <div className="uni-empty">Loading program eligibility...</div>}

          {!programLoading && !programError && programs.length === 0 && (
            <div className="uni-empty">No program eligibility data found for this university.</div>
          )}

          {!programLoading && !programError && programs.length > 0 && (
            <div className="uni-program-list">
              {programs.map((program) => (
                <div
                  className="uni-card"
                  key={`${program.university_name}-${program.program_name}-${program.degree_type}`}
                >
                  <div className="uni-card-info">
                    <h2 className="uni-card-title">{program.program_name}</h2>
                    <p>
                      University: <span className="red">{program.university_name}</span>
                    </p>
                    <p>
                      Category: <span className="red">{program.program_category || "N/A"}</span>
                    </p>
                    <p>
                      Level: <span className="red">{program.program_level || program.degree_type || "N/A"}</span>
                    </p>
                    <p>
                      Duration: <span className="red">{program.program_duration_years || "N/A"} years</span>
                    </p>
                    <p>
                      Tuition/Year: <span className="red">{formatCurrency(Number(program.tuition_fee_usd))}</span>
                    </p>
                    <p>
                      Eligibility: <span className="green">{formatPercent(Number(program.eligibility_probability || 0))}</span>
                    </p>
                    {program.university_url && (
                      <p>
                        <a href={program.university_url} target="_blank" rel="noreferrer" className="uni-link">
                          Visit University Website
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="uni-top">
          <div className="uni-filters">
            <h3>Filters</h3>

            <input
              type="text"
              placeholder="Search university..."
              className="uni-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <label className="uni-label">Countries</label>
            <div className="uni-country-list">
              {countryOptions.map((country) => (
                <label className="uni-country-item" key={country}>
                  <input
                    type="checkbox"
                    checked={selectedCountries.includes(country)}
                    onChange={() => handleCountryToggle(country)}
                  />
                  <span>{country}</span>
                </label>
              ))}
            </div>

            <label className="uni-label">Minimum Match Score</label>
            <select className="uni-select" value={minMatch} onChange={(e) => setMinMatch(e.target.value)}>
              <option value="all">All Ranges</option>
              <option value="90">90%+</option>
              <option value="70">70%+</option>
              <option value="50">50%+</option>
            </select>

            <button className="uni-reset" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>

          <div className="uni-list">
            <div className="uni-list-meta">
              <span>
                {loading
                  ? "Loading recommendations..."
                  : `Showing ${pageStartIndex}-${pageEndIndex} of ${filteredResults.length} Universities`}
              </span>

              <div>
                Sort by:{" "}
                <select className="uni-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="bestMatch">Best Match</option>
                  <option value="lowestTuition">Lowest Tuition</option>
                </select>
              </div>
            </div>

            {warnings.length > 0 && (
              <div className="uni-note">
                <strong>Profile notes:</strong> {warnings.join(" ")}
              </div>
            )}

            {error && <div className="uni-error">{error}</div>}

            {!loading && !error && filteredResults.length === 0 && (
              <div className="uni-empty">No universities found. Update your profile scores and try again.</div>
            )}

            {!loading &&
              !error &&
              paginatedResults.map((uni) => (
                <article
                  className="uni-card uni-card-clickable"
                  key={`${uni.university}-${uni.country}-${uni.url || "no-url"}`}
                  onClick={() => openPrograms(uni)}
                >
                  <div className="uni-card-info">
                    <h2 className="uni-card-title">{uni.university}</h2>
                    <p>
                      Country: <span className="red">{getCountryFlagImageUrl(uni.country) && <img className="uni-flag-img" src={getCountryFlagImageUrl(uni.country)} alt={`${normalizeCountryLabel(uni.country)} flag`} loading="lazy" />} {normalizeCountryLabel(uni.country)}</span>
                    </p>
                    {Number(uni.qs_rank) > 0 && (
                      <p className="uni-qs-badge">
                        Rank: <span className="qs-num">#{Math.round(Number(uni.qs_rank))}</span>
                      </p>
                    )}
                    <p>
                      Tuition/Year: <span className="red">{formatCurrency(Number(uni.tuition_usd))}</span>
                    </p>
                    <p className="uni-card-hint">Click this card to view eligible programs.</p>
                  </div>

                  <div className="uni-card-side">
                    <div className="uni-match-pill">
                      <small>Match</small>
                      <strong>{formatPercent(Number(uni.eligibility_probability || 0))}</strong>
                    </div>
                    {uni.url && (
                      <a
                        href={uni.url}
                        target="_blank"
                        rel="noreferrer"
                        className="uni-open-link"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Visit Website
                      </a>
                    )}
                  </div>
                </article>
              ))}

            {!loading && !error && filteredResults.length > 0 && totalPages > 1 && (
              <div className="uni-pagination">
                <button
                  className="uni-page-btn uni-page-nav"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                >
                  ‹ Prev
                </button>

                {(() => {
                  const pages = [];
                  const delta = 2;
                  const left = Math.max(2, currentPage - delta);
                  const right = Math.min(totalPages - 1, currentPage + delta);

                  pages.push(1);
                  if (left > 2) pages.push("start-ellipsis");
                  for (let i = left; i <= right; i++) pages.push(i);
                  if (right < totalPages - 1) pages.push("end-ellipsis");
                  if (totalPages > 1) pages.push(totalPages);

                  return pages.map((page) =>
                    typeof page === "string" ? (
                      <span key={page} className="uni-page-ellipsis">
                        …
                      </span>
                    ) : (
                      <button
                        key={page}
                        className={page === currentPage ? "uni-page-btn active" : "uni-page-btn"}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )
                  );
                })()}

                <button
                  className="uni-page-btn uni-page-nav"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                >
                  Next ›
                </button>

                <span className="uni-page-info">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}