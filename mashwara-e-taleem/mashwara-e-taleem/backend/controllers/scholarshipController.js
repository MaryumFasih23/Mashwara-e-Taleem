const Scholarship = require("../models/Scholarship");
const { CACHE_SCHEMA_VERSION } = require("../models/Scholarship");
const { searchScholarships } = require("../services/scholarshipSearch");
const { fetchRSSScholarships } = require("../services/rssFeeds");
const { parseScholarshipsWithAI } = require("../services/geminiParser");
const { finalizeScholarships } = require("../services/scholarshipQuality");
const {
  buildCacheKey,
  buildFallbackScholarships,
  dedupeRawResults,
  hasOnlyObjects,
  normalizeQueryValue,
  splitRawResults,
} = require("../services/scholarshipFormatter");

const backgroundRefreshes = new Set();

async function getCachedScholarships(cacheKey) {
  try {
    return await Scholarship.findOne({ cacheKey }).lean();
  } catch (err) {
    console.error("Cache lookup failed:", err.message);
    return null;
  }
}

function isUsableCache(cached) {
  return (
    cached &&
    cached.cacheVersion === CACHE_SCHEMA_VERSION &&
    Array.isArray(cached.scholarships) &&
    Array.isArray(cached.irrelevantSources)
  );
}

async function saveScholarships(cacheKey, scholarships, irrelevantSources) {
  if (!hasOnlyObjects(scholarships) || !hasOnlyObjects(irrelevantSources)) {
    return;
  }

  try {
    await Scholarship.findOneAndUpdate(
      { cacheKey },
      {
        cacheKey,
        cacheVersion: CACHE_SCHEMA_VERSION,
        scholarships,
        irrelevantSources,
        createdAt: new Date(),
      },
      {
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
        upsert: true,
      }
    );
  } catch (err) {
    console.error("Cache save failed:", err.message);
  }
}

async function collectRawResults(country, domain, degreeLevel) {
  const [searchResult, rssResult] = await Promise.allSettled([
    searchScholarships(country, domain, degreeLevel),
    fetchRSSScholarships(country, domain, degreeLevel),
  ]);

  const searchResults =
    searchResult.status === "fulfilled" && Array.isArray(searchResult.value)
      ? searchResult.value
      : [];
  const rssResults =
    rssResult.status === "fulfilled" && Array.isArray(rssResult.value)
      ? rssResult.value
      : [];

  if (searchResult.status === "rejected") {
    console.error("Search API failed:", searchResult.reason?.message || searchResult.reason);
  }

  if (rssResult.status === "rejected") {
    console.error("RSS fetch failed:", rssResult.reason?.message || rssResult.reason);
  }

  return dedupeRawResults([...searchResults, ...rssResults]);
}

async function buildFreshScholarshipDataset(country, domain, degreeLevel) {
  const rawResults = await collectRawResults(country, domain, degreeLevel);
  const { relevantResults, irrelevantSources } = splitRawResults(rawResults);
  let extractedScholarships = [];
  const ai = {
    attempted: false,
    provider: null,
    model: null,
    fallbackUsed: false,
    errors: [],
  };

  if (relevantResults.length > 0) {
    ai.attempted = true;
    const aiResult = await parseScholarshipsWithAI(
      relevantResults,
      country,
      domain,
      degreeLevel
    );
    ai.provider = aiResult.provider;
    ai.model = aiResult.model;
    ai.errors = Array.isArray(aiResult.errors) ? aiResult.errors : [];
    extractedScholarships = Array.isArray(aiResult.scholarships)
      ? aiResult.scholarships
      : [];

    if (extractedScholarships.length === 0) {
      console.warn("Using manual fallback scholarship formatting.");
      ai.fallbackUsed = true;
      extractedScholarships = buildFallbackScholarships(
        relevantResults,
        country,
        domain,
        degreeLevel
      );
    }
  } else {
    ai.fallbackUsed = true;
  }

  const scholarships = finalizeScholarships(
    extractedScholarships,
    country,
    domain,
    degreeLevel,
    { minResults: 30 }
  );

  return { ai, irrelevantSources, rawCount: rawResults.length, scholarships };
}

function isCacheStale(cached) {
  if (!cached?.createdAt) {
    return true;
  }

  const ageMs = Date.now() - new Date(cached.createdAt).getTime();
  return ageMs > 1000 * 60 * 60 * 24;
}

function triggerBackgroundRefresh(cacheKey, country, domain, degreeLevel) {
  if (backgroundRefreshes.has(cacheKey)) {
    return;
  }

  backgroundRefreshes.add(cacheKey);
  buildFreshScholarshipDataset(country, domain, degreeLevel)
    .then(({ scholarships, irrelevantSources }) =>
      saveScholarships(cacheKey, scholarships, irrelevantSources)
    )
    .catch((err) => {
      console.error(`Background refresh failed for ${cacheKey}:`, err.message);
    })
    .finally(() => {
      backgroundRefreshes.delete(cacheKey);
    });
}

async function getScholarships(req, res) {
  const country = normalizeQueryValue(req.query.country);
  const domain = normalizeQueryValue(req.query.domain);
  const degreeLevel = normalizeQueryValue(req.query.degreeLevel);
  const refresh = req.query.refresh === "true" || req.query.refresh === "1";
  const backgroundRefresh =
    req.query.backgroundRefresh === "true" || req.query.backgroundRefresh === "1";
  const cacheKey = buildCacheKey(country, domain, degreeLevel);

  try {
    const cached = refresh ? null : await getCachedScholarships(cacheKey);

    if (cached && !isUsableCache(cached)) {
      console.log(`Ignoring legacy cache for ${cacheKey}. Fresh AI provider run required.`);
    }

    if (isUsableCache(cached)) {
      console.log(`Cache hit for ${cacheKey}. AI providers were not called.`);

      if (backgroundRefresh || isCacheStale(cached)) {
        triggerBackgroundRefresh(cacheKey, country, domain, degreeLevel);
      }

      return res.json({
        fromCache: true,
        cacheStatus: "hit",
        count: cached.scholarships.length,
        scholarships: cached.scholarships,
        ai: {
          attempted: false,
          reason: "served_from_cache",
          backgroundRefreshQueued: backgroundRefresh || isCacheStale(cached),
        },
        irrelevantSources: Array.isArray(cached.irrelevantSources)
          ? cached.irrelevantSources
          : [],
      });
    }

    const { ai, irrelevantSources, rawCount, scholarships } =
      await buildFreshScholarshipDataset(country, domain, degreeLevel);

    await saveScholarships(cacheKey, scholarships, irrelevantSources);

    return res.json({
      fromCache: false,
      cacheStatus: refresh ? "refresh" : "miss",
      count: scholarships.length,
      rawCount,
      scholarships,
      ai,
      irrelevantSources,
    });
  } catch (err) {
    console.error("Scholarship endpoint failed:", err.message);
    return res.json({
      fromCache: false,
      cacheStatus: "error",
      count: 0,
      scholarships: [],
      ai: {
        attempted: false,
        provider: null,
        model: null,
        fallbackUsed: true,
        errors: [],
      },
      irrelevantSources: [],
    });
  }
}

async function clearCache(req, res) {
  const { cacheKey } = req.params;

  try {
    await Scholarship.deleteOne({ cacheKey });
    res.json({ message: "Cache cleared" });
  } catch (err) {
    console.error("Cache clear failed:", err.message);
    res.status(503).json({ error: "Cache unavailable" });
  }
}

async function clearAllCache(req, res) {
  try {
    const result = await Scholarship.deleteMany({});
    res.json({
      message: "All scholarship cache cleared",
      deletedCount: result.deletedCount || 0,
    });
  } catch (err) {
    console.error("Clear all cache failed:", err.message);
    res.status(503).json({ error: "Cache unavailable" });
  }
}

module.exports = { clearAllCache, getScholarships, clearCache };
