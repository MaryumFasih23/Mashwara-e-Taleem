import React from "react";

const FLAGS = {
  Australia: "AU",
  Canada: "CA",
  Germany: "DE",
  Qatar: "QA",
  UK: "GB",
  USA: "US",
};

const getFlagUrl = (country) => {
  const code = FLAGS[country];
  return code ? `https://flagcdn.com/w160/${code.toLowerCase()}.png` : "";
};

const formatList = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return "Check source";
  return items.slice(0, 3).join(", ");
};

const ScholarshipCard = ({ scholarship }) => {
  const flag = getFlagUrl(scholarship.country);
  const link = scholarship.applicationLink || scholarship.source || "#";
  const isFullyFunded = String(scholarship.amount || "")
    .toLowerCase()
    .includes("fully funded");

  return (
    <article className="scholarship-card">
      <div className="flag-block">
        {flag ? (
          <img src={flag} alt={`${scholarship.country} flag`} />
        ) : (
          <span>{String(scholarship.country || "NA").slice(0, 2)}</span>
        )}
      </div>

      <div className="scholarship-info">
        <p className="provider">{scholarship.provider || "Unknown provider"}</p>
        <h3>{scholarship.title}</h3>

        <p className="description">
          {scholarship.description || "Scholarship details are available from the official source."}
        </p>

        <div className="badge-row">
          <span>{scholarship.country}</span>
          <span>{scholarship.degreeLevel}</span>
          <span className={isFullyFunded ? "funding full" : "funding"}>
            {scholarship.amount || "Unknown"}
          </span>
          <span>{scholarship.type || "Scholarship"}</span>
        </div>

        <div className="detail-grid">
          <div>
            <span>Deadline</span>
            <strong>{scholarship.deadline || "Unknown"}</strong>
          </div>
          <div>
            <span>Eligibility</span>
            <strong>{formatList(scholarship.eligibility)}</strong>
          </div>
          <div>
            <span>Benefits</span>
            <strong>{formatList(scholarship.benefits)}</strong>
          </div>
        </div>
      </div>

      <div className="card-side">
        <span className="score-badge">{scholarship.score || 0}/10</span>
        <span className={isFullyFunded ? "funding-pill full" : "funding-pill"}>
          {isFullyFunded ? "Fully Funded" : scholarship.amount || "Funding"}
        </span>

        <div className="card-action">
        <a href={link} target="_blank" rel="noreferrer">
          Apply
        </a>
        </div>
      </div>
    </article>
  );
};

export default ScholarshipCard;
