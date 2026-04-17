import React from "react";

const ScholarshipFilters = ({
  countries,
  degreeLevels,
  selectedCountry,
  selectedDegree,
  onCountryChange,
  onDegreeChange,
  onReset,
}) => (
  <aside className="filters-panel">
    <div className="filters-heading">
      <h2>Filters</h2>
      <button type="button" onClick={onReset}>
        Reset
      </button>
    </div>

    <section className="filter-group">
      <h3>Country</h3>
      <div className="chip-list">
        {countries.map((country) => (
          <button
            type="button"
            key={country}
            className={selectedCountry === country ? "chip active" : "chip"}
            onClick={() => onCountryChange(country)}
          >
            {country}
          </button>
        ))}
      </div>
    </section>

    <section className="filter-group">
      <h3>Degree Level</h3>
      <div className="chip-list">
        {degreeLevels.map((degree) => (
          <button
            type="button"
            key={degree}
            className={selectedDegree === degree ? "chip active" : "chip"}
            onClick={() => onDegreeChange(degree)}
          >
            {degree}
          </button>
        ))}
      </div>
    </section>
  </aside>
);

export default ScholarshipFilters;
