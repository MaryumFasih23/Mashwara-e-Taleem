import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../AuthContext";
import { getUniversityRecommendations } from "../../api/universityapi";
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

export default function Universities() {
  const { user } = useContext(AuthContext);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("bestMatch");
  const [minMatch, setMinMatch] = useState("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [results, setResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user?.uid) return;

    let active = true;
    setLoading(true);
    setError("");

    // Always request recommendations with a minimum 10% eligibility floor.
    getUniversityRecommendations(user.uid, { minProb: 0.1, topK: 5000 })
      .then((data) => {
        if (!active) return;
        setResults(data.results || []);
        setWarnings(data.warnings || []);
      })
      .catch((err) => {
        if (!active) return;
        const apiMessage = err?.response?.data?.error;
        const apiDetail = err?.response?.data?.detail;
        setError(apiDetail ? `${apiMessage}: ${apiDetail}` : apiMessage || "Failed to fetch recommendations.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const filteredResults = useMemo(() => {
    let list = [...results];

    // Hard floor: do not list universities below 10% eligibility.
    list = list.filter((item) => Number(item.eligibility_probability) >= 0.1);

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
      // Primary: lowest tuition. Secondary: highest eligibility within same tuition tier.
      list.sort((a, b) => {
        const tuitionDiff = Number(a.tuition_usd || 0) - Number(b.tuition_usd || 0);
        if (tuitionDiff !== 0) return tuitionDiff;
        return Number(b.eligibility_probability || 0) - Number(a.eligibility_probability || 0);
      });
    } else {
      // bestMatch: final_score = 0.4 * eligibility + 0.6 * QS prestige
      list.sort((a, b) => Number(b.final_score || 0) - Number(a.final_score || 0));
    }

    return list;
  }, [results, search, minMatch, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / RESULTS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, minMatch, sortBy, user?.uid]);

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

  return (
    <div className="uni-container">
      <h1 className="uni-title">Universities</h1>

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

          <label className="uni-label">Minimum Match Score</label>
          <select className="uni-select" value={minMatch} onChange={(e) => setMinMatch(e.target.value)}>
            <option value="all">All Ranges</option>
            <option value="90">90%+</option>
            <option value="70">70%+</option>
            <option value="50">50%+</option>
          </select>

          <button
            className="uni-reset"
            onClick={() => {
              setSearch("");
              setMinMatch("all");
              setSortBy("bestMatch");
            }}
          >
            Reset Filters
          </button>
        </div>

        <div className="uni-list">
          <div className="uni-sort">
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
              <div className="uni-card" key={`${uni.university}-${uni.url || "no-url"}`}>
                <div className="uni-card-info">
                  <h2 className="uni-card-title">{uni.university}</h2>
                  {Number(uni.qs_rank) < 1000 && (
                    <p className="uni-qs-badge">QS Rank: <span className="qs-num">#{uni.qs_rank}</span></p>
                  )}
                  <p>Tuition/Year: <span className="red">{formatCurrency(Number(uni.tuition_usd))}</span></p>
                  <p>Min GPA: <span className="red">{Number(uni.min_gpa || 0).toFixed(2)}</span></p>
                  <p>Min SAT: <span className="red">{Math.round(Number(uni.min_sat || 0))}</span></p>
                  <p>Min TOEFL: <span className="red">{Math.round(Number(uni.min_toefl || 0))}</span></p>
                  <p>Min IELTS: <span className="red">{Number(uni.min_ielts || 0).toFixed(1)}</span></p>
                  <p>
                    Eligibility: <span className="green">{formatPercent(Number(uni.eligibility_probability || 0))}</span>
                  </p>
                  {uni.url && (
                    <p>
                      <a href={uni.url} target="_blank" rel="noreferrer" className="uni-link">
                        Visit University Website
                      </a>
                    </p>
                  )}
                </div>
              </div>
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
                    <span key={page} className="uni-page-ellipsis">…</span>
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
    </div>
  );
}
