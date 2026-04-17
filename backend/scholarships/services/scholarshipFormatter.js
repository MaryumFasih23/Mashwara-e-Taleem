function normalizeQueryValue(value, fallback = "Any") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function buildCacheKey(country, domain, degreeLevel) {
  return [country, domain, degreeLevel]
    .map((value) =>
      normalizeQueryValue(value)
        .toLowerCase()
        .replace(/\s+/g, "_")
    )
    .join("_");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function cleanStringArray(value, fallback) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value
    .map((item) => cleanString(item))
    .filter((item) => item.length > 0);

  return cleaned.length > 0 ? cleaned : fallback;
}

function getRawLink(rawResult) {
  return cleanString(
    rawResult.link ||
      rawResult.url ||
      rawResult.applicationLink ||
      rawResult.source
  );
}

function getRawDescription(rawResult) {
  return cleanString(
    rawResult.snippet ||
      rawResult.contentSnippet ||
      rawResult.description ||
      rawResult.content ||
      rawResult.summary
  );
}

function getRawTitle(rawResult) {
  return cleanString(rawResult.title);
}

function getRawText(rawResult) {
  return `${getRawTitle(rawResult)} ${getRawDescription(rawResult)} ${getRawLink(rawResult)}`;
}

function isIrrelevantSource(rawResult) {
  const link = getRawLink(rawResult).toLowerCase();
  const title = getRawTitle(rawResult).toLowerCase();
  const description = getRawDescription(rawResult).toLowerCase();
  const text = `${link} ${title} ${description}`;

  return (
    text.includes("facebook.com") ||
    text.includes("reddit.com") ||
    text.includes("quora.com") ||
    text.includes("forum") ||
    text.includes("/forums/") ||
    text.includes("/groups/") ||
    text.includes("discussion") ||
    text.includes("comments")
  );
}

function getIrrelevantReason(rawResult) {
  const link = getRawLink(rawResult).toLowerCase();
  const text = `${link} ${getRawTitle(rawResult)} ${getRawDescription(rawResult)}`.toLowerCase();

  if (link.includes("facebook.com")) {
    return "Facebook source";
  }

  if (link.includes("reddit.com")) {
    return "Reddit discussion";
  }

  if (link.includes("quora.com")) {
    return "Forum or discussion source";
  }

  if (text.includes("forum") || text.includes("discussion") || text.includes("/groups/")) {
    return "Forum or discussion source";
  }

  return "Irrelevant source";
}

function isGenericListingPage(rawResult) {
  const title = getRawTitle(rawResult).toLowerCase();
  const link = getRawLink(rawResult).toLowerCase();
  const description = getRawDescription(rawResult).toLowerCase();
  const text = `${title} ${description}`;

  return (
    /^\d+\s+/.test(title) ||
    title.includes("scholarships for ") ||
    title.includes("scholarships in ") ||
    title.includes("scholarships |") ||
    title.includes("top ") ||
    title.includes("list of ") ||
    title.includes("find ") ||
    link.includes("applykite.com/search") ||
    link.includes("mastersportal.com/search") ||
    link.includes("scholarshiptab.com/scholarships-for") ||
    link.includes("topuniversities.com/student-info/scholarship-advice") ||
    text.includes("discover top") ||
    text.includes("find exclusive scholarships")
  );
}

function inferProvider(rawResult) {
  const text = getRawText(rawResult).toLowerCase();

  if (text.includes("commonwealth") && (text.includes("hec") || text.includes("higher education commission"))) {
    return "Commonwealth Scholarship Commission and HEC Pakistan";
  }

  if (text.includes("commonwealth")) {
    return "Commonwealth Scholarship Commission";
  }

  if (text.includes("hec") || text.includes("higher education commission")) {
    return "Higher Education Commission Pakistan";
  }

  if (text.includes("daad")) {
    return "DAAD";
  }

  if (text.includes("fulbright")) {
    return "Fulbright";
  }

  if (text.includes("chevening")) {
    return "Chevening";
  }

  if (text.includes("erasmus")) {
    return "Erasmus Mundus";
  }

  if (text.includes("mext")) {
    return "MEXT";
  }

  if (text.includes("adb-japan") || text.includes("asian development bank")) {
    return "Asian Development Bank and Japan Scholarship Program";
  }

  if (text.includes("mpower")) {
    return "MPOWER Financing";
  }

  if (text.includes("mastercard foundation")) {
    return "Mastercard Foundation";
  }

  return "Unknown";
}

function inferTitle(rawResult) {
  const title = getRawTitle(rawResult);
  const text = getRawText(rawResult).toLowerCase();

  if (text.includes("adb-japan") || text.includes("asian development bank")) {
    return "Asian Development Bank-Japan Scholarship Program";
  }

  if (text.includes("commonwealth")) {
    return title.includes("Commonwealth") ? title : "Commonwealth Scholarships";
  }

  if (text.includes("daad")) {
    return title.includes("DAAD") ? title : "DAAD Scholarship Programmes";
  }

  if (text.includes("fulbright")) {
    return title.includes("Fulbright") ? title : "Fulbright Scholarship";
  }

  if (text.includes("chevening")) {
    return title.includes("Chevening") ? title : "Chevening Scholarship";
  }

  return title || "Unknown";
}

function inferAmount(rawResult) {
  const text = getRawText(rawResult).toLowerCase();

  if (text.includes("fully funded") || text.includes("full tuition")) {
    return "Fully Funded";
  }

  if (text.includes("partial") || text.includes("partially funded")) {
    return "Partial";
  }

  if (text.match(/\$|usd|pkr|stipend|allowance|tuition/)) {
    return "Partial";
  }

  return "Unknown";
}

function inferDeadline(rawResult) {
  const text = getRawText(rawResult);
  const deadlineMatch = text.match(/deadline[:\s-]+([^.;\n]{4,40})/i);
  const dateMatch = text.match(/\b\d{1,2}\s+[A-Z][a-z]+\s+\d{4}\b/);
  const monthRangeMatch = text.match(/\b[A-Z][a-z]{2,8}\s*-\s*[A-Z][a-z]{2,8}\s+\d{4}\b/);

  if (deadlineMatch) {
    return deadlineMatch[1].trim();
  }

  if (dateMatch) {
    return dateMatch[0];
  }

  if (monthRangeMatch) {
    return monthRangeMatch[0];
  }

  return "Unknown";
}

function inferBenefits(rawResult) {
  const text = getRawText(rawResult).toLowerCase();
  const benefits = [];

  if (text.includes("tuition")) {
    benefits.push("tuition");
  }

  if (text.includes("stipend") || text.includes("allowance")) {
    benefits.push("stipend");
  }

  if (text.includes("accommodation") || text.includes("housing")) {
    benefits.push("accommodation");
  }

  if (text.includes("health care") || text.includes("healthcare") || text.includes("insurance")) {
    benefits.push("health insurance");
  }

  if (benefits.length === 0 && inferAmount(rawResult) === "Fully Funded") {
    return ["tuition", "stipend"];
  }

  return benefits.length > 0 ? benefits : ["Unknown"];
}

function inferEligibility(rawResult) {
  const text = getRawText(rawResult).toLowerCase();
  const eligibility = [];

  if (text.includes("pakistani") || text.includes("pakistan")) {
    eligibility.push("Pakistani applicants");
  }

  if (text.includes("ajk")) {
    eligibility.push("AJK nationals");
  }

  if (text.includes("16 years of education")) {
    eligibility.push("Minimum 16 years of education");
  }

  if (text.match(/\bgre\b/)) {
    eligibility.push("GRE may be required");
  }

  if (text.includes("english proficiency")) {
    eligibility.push("English proficiency may be required");
  }

  return eligibility.length > 0 ? eligibility : ["Unknown"];
}

function inferType(rawResult) {
  const provider = inferProvider(rawResult).toLowerCase();
  const text = getRawText(rawResult).toLowerCase();

  if (
    provider.includes("hec") ||
    provider.includes("daad") ||
    provider.includes("commonwealth") ||
    provider.includes("fulbright") ||
    provider.includes("chevening") ||
    provider.includes("mext") ||
    text.includes(".gov")
  ) {
    return "Government";
  }

  if (text.includes("university")) {
    return "University";
  }

  return "Private";
}

function inferIsGovernment(rawResult) {
  return inferType(rawResult) === "Government";
}

function isLikelyRealScholarship(rawResult) {
  const title = getRawTitle(rawResult).toLowerCase();
  const link = getRawLink(rawResult).toLowerCase();
  const description = getRawDescription(rawResult).toLowerCase();
  const text = `${title} ${link} ${description}`;
  const knownProviderOrProgram =
    text.includes("hec") ||
    text.includes("daad") ||
    text.includes("fulbright") ||
    text.includes("commonwealth") ||
    text.includes("chevening") ||
    text.includes("erasmus") ||
    text.includes("mext") ||
    text.includes("mastercard foundation") ||
    text.includes("adb-japan") ||
    text.includes("queen elizabeth") ||
    text.includes("scholarship programme") ||
    text.includes("scholarship program");

  if (isGenericListingPage(rawResult) && !knownProviderOrProgram) {
    return false;
  }

  return (
    text.includes("scholarship") &&
    (
      knownProviderOrProgram ||
      text.includes("apply") ||
      text.includes("application") ||
      text.includes("funded") ||
      text.includes("deadline")
    )
  );
}

function splitRawResults(rawResults) {
  const relevantResults = [];
  const irrelevantSources = [];

  if (!Array.isArray(rawResults)) {
    return { relevantResults, irrelevantSources };
  }

  for (const rawResult of rawResults) {
    if (!isPlainObject(rawResult)) {
      continue;
    }

    if (isIrrelevantSource(rawResult)) {
      irrelevantSources.push({
        title: getRawTitle(rawResult) || "Untitled source",
        applicationLink: getRawLink(rawResult),
        description: getRawDescription(rawResult),
        source: getRawLink(rawResult),
        reason: getIrrelevantReason(rawResult),
      });
      continue;
    }

    relevantResults.push(rawResult);
  }

  return { relevantResults, irrelevantSources };
}

function makeFallbackScholarship(rawResult, country, domain, degreeLevel) {
  const applicationLink = getRawLink(rawResult);
  const type = inferType(rawResult);

  return {
    title: inferTitle(rawResult),
    provider: inferProvider(rawResult),
    country,
    domain,
    degreeLevel,
    amount: inferAmount(rawResult),
    deadline: inferDeadline(rawResult),
    eligibility: inferEligibility(rawResult),
    benefits: inferBenefits(rawResult),
    applicationLink,
    isGovernment: inferIsGovernment(rawResult),
    type,
    description: getRawDescription(rawResult),
    source: applicationLink,
  };
}

function buildFallbackScholarships(rawResults, country, domain, degreeLevel) {
  if (!Array.isArray(rawResults)) {
    return [];
  }

  return rawResults
    .filter(isPlainObject)
    .filter(isLikelyRealScholarship)
    .map((rawResult) =>
      makeFallbackScholarship(rawResult, country, domain, degreeLevel)
    );
}

function normalizeScholarship(item, country, domain, degreeLevel) {
  if (!isPlainObject(item)) {
    return null;
  }

  const applicationLink = cleanString(item.applicationLink || item.link || item.url);
  const source = cleanString(item.source, applicationLink);

  return {
    title: cleanString(item.title, "Untitled scholarship"),
    provider: cleanString(item.provider, "Unknown"),
    country: cleanString(item.country, country),
    domain: cleanString(item.domain, domain),
    degreeLevel: cleanString(item.degreeLevel, degreeLevel),
    amount: cleanString(item.amount, "Unknown"),
    deadline: cleanString(item.deadline, "Unknown"),
    eligibility: cleanStringArray(item.eligibility, ["Unknown"]),
    benefits: cleanStringArray(item.benefits, ["Unknown"]),
    applicationLink,
    isGovernment: typeof item.isGovernment === "boolean" ? item.isGovernment : false,
    type: cleanString(item.type, "General"),
    description: cleanString(item.description),
    source,
  };
}

function validateScholarships(value, country, domain, degreeLevel) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeScholarship(item, country, domain, degreeLevel))
    .filter(Boolean);
}

function hasOnlyObjects(value) {
  return Array.isArray(value) && value.every(isPlainObject);
}

function dedupeRawResults(results) {
  if (!Array.isArray(results)) {
    return [];
  }

  const seen = new Set();
  const deduped = [];

  for (const result of results) {
    if (!isPlainObject(result)) {
      continue;
    }

    const link = getRawLink(result);
    const title = cleanString(result.title);
    const key = (link || title).toLowerCase();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(result);
  }

  return deduped;
}

module.exports = {
  buildCacheKey,
  buildFallbackScholarships,
  cleanString,
  dedupeRawResults,
  hasOnlyObjects,
  normalizeQueryValue,
  splitRawResults,
  validateScholarships,
};
