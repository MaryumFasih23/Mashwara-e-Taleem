const axios = require("axios");

const SERPER_URL = "https://google.serper.dev/search";
const DEFAULT_RESULTS_PER_QUERY = 20;

function buildQueries(country, domain, degreeLevel) {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const countryPart = country === "Any" ? "Pakistani students" : country;
  const domainPart = domain === "Any" ? "" : domain;
  const degreePart = degreeLevel === "Any" ? "" : degreeLevel;

  const requiredQueries = [
    "fully funded scholarships for Pakistani students UK USA Canada Australia Qatar",
    "bachelor scholarships international students Pakistan",
    "government scholarships UK USA Australia Canada Qatar",
    "undergraduate scholarships fully funded",
  ];

  const targetedQueries = [
    `${countryPart} fully funded scholarships ${domainPart} bachelor master UK USA Canada Australia Qatar ${currentYear} ${nextYear}`,
    `${countryPart} government scholarships ${domainPart} ${degreePart} official application deadline`,
    `Chevening Fulbright Australia Awards Canada Qatar scholarships Pakistani students official`,
    `undergraduate bachelor fully funded scholarships Pakistani students official`,
    `masters MS fully funded scholarships Pakistani students official`,
    `UK government scholarships Pakistani students bachelor master Chevening Commonwealth GREAT official`,
    `USA government scholarships Pakistani students bachelor master Fulbright Humphrey official`,
    `Canada scholarships Pakistani students bachelor master Vanier Lester Pearson McCall MacBain official`,
    `Australia scholarships Pakistani students bachelor master Australia Awards RTP official`,
    `Qatar scholarships Pakistani students bachelor master Qatar University HBKU Doha Institute official`,
    `HEC overseas scholarships Pakistani students bachelor master official`,
    `DAAD Pakistan master scholarship official`,
  ];

  return [...requiredQueries, ...targetedQueries]
    .map((query) => query.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function getResultsPerQuery() {
  const parsed = Number.parseInt(
    process.env.SERPER_RESULTS_PER_QUERY || String(DEFAULT_RESULTS_PER_QUERY),
    10
  );

  if (!Number.isFinite(parsed) || parsed < 10) {
    return DEFAULT_RESULTS_PER_QUERY;
  }

  return Math.min(parsed, 30);
}

async function runSearchQuery(query, apiKey) {
  try {
    const response = await axios.post(
      SERPER_URL,
      {
        q: query,
        num: getResultsPerQuery(),
        gl: "us",
        hl: "en",
      },
      {
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const organic = Array.isArray(response.data?.organic)
      ? response.data.organic
      : [];

    return organic.map((item) => ({
      title: item.title || "",
      link: item.link || "",
      snippet: item.snippet || "",
      sourceType: "search",
      query,
    }));
  } catch (err) {
    console.error(`Serper query failed: "${query}"`, err.message);
    return [];
  }
}

async function searchScholarships(country, domain, degreeLevel) {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    console.warn("SERPER_API_KEY is not configured. Search API results skipped.");
    return [];
  }

  const queries = buildQueries(country, domain, degreeLevel);
  const searchGroups = await Promise.all(
    queries.map((query) => runSearchQuery(query, apiKey))
  );

  const allResults = searchGroups.flat();
  const seen = new Set();

  return allResults.filter((result) => {
    const key = (result.link || result.title || "").toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

module.exports = { buildQueries, searchScholarships };
