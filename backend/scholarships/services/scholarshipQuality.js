const MIN_RESULTS = 30;
const MAX_RESULTS = 50;
const PRIORITY_COUNTRIES = ["UK", "USA", "Canada", "Australia", "Qatar", "Germany"];
const TARGET_COUNTRIES = new Set(PRIORITY_COUNTRIES);

const CATALOG = [
  ["Chevening Scholarship", "UK Government", "UK", "Master", "Fully Funded", true, "Government", "https://www.chevening.org/scholarships/", ["chevening"], ["tuition", "stipend", "travel"], ["International applicants", "Leadership potential"]],
  ["Commonwealth Scholarships", "Commonwealth Scholarship Commission", "UK", "Master", "Fully Funded", true, "Government", "https://cscuk.fcdo.gov.uk/scholarships/", ["commonwealth scholarship", "commonwealth scholarships"], ["tuition", "stipend", "travel"], ["Commonwealth country applicants", "Academic merit"]],
  ["GREAT Scholarships", "British Council and UK Universities", "UK", "Master", "Partial", false, "Hybrid", "https://study-uk.britishcouncil.org/scholarships-funding/great-scholarships", ["great scholarship", "great scholarships"], ["tuition"], ["International applicants", "Master applicants"]],
  ["Gates Cambridge Scholarship", "University of Cambridge", "UK", "Master", "Fully Funded", false, "University", "https://www.gatescambridge.org/programme/the-scholarship/", ["gates cambridge"], ["tuition", "stipend", "travel"], ["International applicants", "Academic excellence"]],
  ["Rhodes Scholarship", "Rhodes Trust", "UK", "Master", "Fully Funded", false, "Private", "https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/", ["rhodes scholarship"], ["tuition", "stipend"], ["Academic excellence", "Leadership potential"]],
  ["Clarendon Scholarship", "University of Oxford", "UK", "Master", "Fully Funded", false, "University", "https://www.ox.ac.uk/clarendon", ["clarendon scholarship"], ["tuition", "stipend"], ["Graduate applicants", "Academic merit"]],
  ["Fulbright Foreign Student Program", "US Government", "USA", "Master", "Fully Funded", true, "Government", "https://foreign.fulbrightonline.org/", ["fulbright"], ["tuition", "stipend", "travel"], ["International applicants", "Academic merit"]],
  ["Hubert H. Humphrey Fellowship", "US Government", "USA", "Master", "Fully Funded", true, "Government", "https://www.humphreyfellowship.org/", ["humphrey fellowship", "hubert h humphrey"], ["tuition", "stipend", "travel"], ["Professional experience", "Leadership potential"]],
  ["Knight-Hennessy Scholars", "Stanford University", "USA", "Master", "Fully Funded", false, "University", "https://knight-hennessy.stanford.edu/", ["knight-hennessy", "knight hennessy"], ["tuition", "stipend"], ["Graduate applicants", "Leadership potential"]],
  ["AAUW International Fellowships", "AAUW", "USA", "Master", "Partial", false, "Private", "https://www.aauw.org/resources/programs/fellowships-grants/current-opportunities/international/", ["aauw international"], ["stipend"], ["Women applicants", "International applicants"]],
  ["American University Emerging Global Leader Scholarship", "American University", "USA", "Bachelor", "Partial", false, "University", "https://www.american.edu/admissions/international/egls.cfm", ["emerging global leader", "american university emerging"], ["tuition", "housing"], ["International students", "Undergraduate applicants"]],
  ["Clark Global Scholars Program", "Clark University", "USA", "Bachelor", "Partial", false, "University", "https://www.clarku.edu/offices/financial-assistance/scholarships/", ["clark global scholars", "clark global scholarship"], ["tuition"], ["International students", "Undergraduate applicants"]],
  ["University of Miami Stamps Scholarship", "University of Miami", "USA", "Bachelor", "Fully Funded", false, "University", "https://admissions.miami.edu/undergraduate/financial-aid/scholarships/stamps/index.html", ["miami stamps scholarship", "university of miami stamps"], ["tuition", "housing", "stipend"], ["International students", "Academic merit"]],
  ["Joint Japan/World Bank Graduate Scholarship Program", "World Bank", "USA", "Master", "Fully Funded", true, "Government", "https://www.worldbank.org/en/programs/scholarships", ["world bank graduate scholarship", "joint japan/world bank"], ["tuition", "stipend", "travel"], ["Developing country nationals", "Master applicants"]],
  ["Lester B. Pearson International Scholarship", "University of Toronto", "Canada", "Bachelor", "Fully Funded", false, "University", "https://future.utoronto.ca/pearson/about/", ["lester b pearson", "lester b. pearson"], ["tuition", "books", "residence"], ["International students", "Undergraduate applicants"]],
  ["Vanier Canada Graduate Scholarships", "Government of Canada", "Canada", "Master", "Partial", true, "Government", "https://vanier.gc.ca/", ["vanier canada", "vanier scholarship"], ["stipend"], ["Graduate applicants", "Research excellence"]],
  ["McCall MacBain Scholarship", "McCall MacBain Foundation", "Canada", "Master", "Fully Funded", false, "Private", "https://mccallmacbainscholars.org/", ["mccall macbain", "mccall-macbain"], ["tuition", "stipend"], ["Graduate applicants", "Leadership potential"]],
  ["UBC International Scholars Program", "University of British Columbia", "Canada", "Bachelor", "Fully Funded", false, "University", "https://you.ubc.ca/financial-planning/scholarships-awards-international-students/", ["ubc international scholars"], ["tuition", "living costs"], ["International students", "Undergraduate applicants"]],
  ["University of Calgary International Entrance Scholarship", "University of Calgary", "Canada", "Bachelor", "Partial", false, "University", "https://www.ucalgary.ca/registrar/finances/awards-scholarships", ["calgary international entrance"], ["tuition"], ["International students", "Undergraduate applicants"]],
  ["York University International Entrance Scholarship", "York University", "Canada", "Bachelor", "Partial", false, "University", "https://futurestudents.yorku.ca/financing-your-degree/scholarships-bursaries", ["york university international entrance"], ["tuition"], ["International students", "Academic merit"]],
  ["University of Waterloo International Student Entrance Scholarships", "University of Waterloo", "Canada", "Bachelor", "Partial", false, "University", "https://uwaterloo.ca/future-students/financing/scholarships", ["waterloo international student entrance"], ["tuition"], ["International students", "Undergraduate applicants"]],
  ["Australia Awards Scholarships", "Australian Government", "Australia", "Master", "Fully Funded", true, "Government", "https://www.dfat.gov.au/people-to-people/australia-awards", ["australia awards"], ["tuition", "stipend", "travel"], ["International applicants", "Development impact"]],
  ["Destination Australia Scholarship", "Australian Government", "Australia", "Bachelor | Master", "Partial", true, "Government", "https://www.education.gov.au/destination-australia", ["destination australia"], ["stipend"], ["International applicants", "Regional study"]],
  ["Research Training Program Scholarship", "Australian Government", "Australia", "Master", "Fully Funded", true, "Government", "https://www.education.gov.au/research-block-grants/research-training-program", ["research training program", "rtp scholarship"], ["tuition", "stipend"], ["Research degree applicants", "Academic merit"]],
  ["Melbourne Graduate Research Scholarships", "University of Melbourne", "Australia", "Master", "Fully Funded", false, "University", "https://scholarships.unimelb.edu.au/awards/graduate-research-scholarships", ["melbourne graduate research"], ["tuition", "stipend"], ["Graduate research applicants", "Academic merit"]],
  ["Monash International Merit Scholarship", "Monash University", "Australia", "Bachelor | Master", "Partial", false, "University", "https://www.monash.edu/study/fees-scholarships/scholarships", ["monash international merit"], ["tuition"], ["International students", "Academic merit"]],
  ["ANU Chancellor's International Scholarship", "Australian National University", "Australia", "Bachelor | Master", "Partial", false, "University", "https://www.anu.edu.au/study/scholarships", ["anu chancellor"], ["tuition"], ["International students", "Academic merit"]],
  ["UNSW International Scholarships", "UNSW Sydney", "Australia", "Bachelor | Master", "Partial", false, "University", "https://www.unsw.edu.au/study/how-to-apply/scholarships", ["unsw international scholarships", "unsw international scholarship"], ["tuition"], ["International students", "Academic merit"]],
  ["Qatar University Scholarships", "Qatar University", "Qatar", "Bachelor | Master", "Fully Funded", false, "University", "https://www.qu.edu.qa/students/admission/scholarships", ["qatar university scholarship", "qatar university scholarships"], ["tuition", "housing"], ["International students", "Academic merit"]],
  ["Hamad Bin Khalifa University Scholarship", "Hamad Bin Khalifa University", "Qatar", "Master", "Fully Funded", false, "University", "https://www.hbku.edu.qa/en/admissions/tuition-fees", ["hamad bin khalifa", "hbku scholarship"], ["tuition", "stipend", "housing"], ["Graduate applicants", "Academic merit"]],
  ["Doha Institute Scholarships", "Doha Institute for Graduate Studies", "Qatar", "Master", "Fully Funded", false, "University", "https://www.dohainstitute.edu.qa/EN/Admissions-Office/Pages/Scholarships.aspx", ["doha institute scholarship", "doha institute scholarships"], ["tuition", "stipend"], ["Graduate applicants", "Academic merit"]],
  ["Qatar Foundation Student Financial Services", "Qatar Foundation", "Qatar", "Bachelor | Master", "Partial", false, "Private", "https://www.qf.org.qa/education/student-financial-services", ["qatar foundation scholarship", "qatar foundation financial aid"], ["tuition"], ["Admitted students", "Financial need"]],
  ["DAAD Scholarship Programmes", "DAAD", "Germany", "Master", "Fully Funded", true, "Government", "https://www.daad.pk/en/find-funding/daad-scholarship-programmes-for-pakistan/", ["daad scholarship", "daad scholarship programmes"], ["tuition", "stipend", "travel"], ["Pakistani applicants", "Graduate applicants"]],
  ["Erasmus Mundus Joint Masters Scholarship", "European Union", "Europe", "Master", "Fully Funded", true, "Government", "https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/erasmus-mundus-joint-masters", ["erasmus mundus"], ["tuition", "stipend", "travel"], ["International applicants", "Master applicants"]],
  ["MEXT Scholarship", "Japanese Government", "Japan", "Bachelor | Master", "Fully Funded", true, "Government", "https://www.studyinjapan.go.jp/en/planning/scholarship/", ["mext scholarship"], ["tuition", "stipend", "travel"], ["International applicants", "Academic merit"]],
  ["Asian Development Bank-Japan Scholarship Program", "Asian Development Bank and Japan", "Asia-Pacific", "Master", "Fully Funded", true, "Government", "https://www.adb.org/work-with-us/careers/japan-scholarship-program", ["adb-japan", "asian development bank"], ["tuition", "stipend", "travel"], ["Developing country nationals", "Master applicants"]],
  ["HEC Overseas Scholarships", "Higher Education Commission Pakistan", "Multiple Countries", "Master", "Fully Funded", true, "Government", "https://www.hec.gov.pk/english/scholarshipsgrants/Pages/internationalScholarships.aspx", ["hec overseas", "hec scholarship", "higher education commission pakistan"], ["tuition", "stipend"], ["Pakistani applicants", "Academic merit"]],
  ["Turkiye Burslari Scholarship", "Government of Turkiye", "Turkiye", "Bachelor | Master", "Fully Funded", true, "Government", "https://www.turkiyeburslari.gov.tr/", ["turkiye burslari", "turkey burslari"], ["tuition", "stipend", "housing"], ["International applicants", "Academic merit"]],
  ["Stipendium Hungaricum Scholarship", "Hungarian Government", "Hungary", "Bachelor | Master", "Fully Funded", true, "Government", "https://stipendiumhungaricum.hu/", ["stipendium hungaricum"], ["tuition", "stipend", "housing"], ["International applicants", "Academic merit"]],
];

function clean(value, fallback = "Unknown") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function allowedCountry(country) {
  return TARGET_COUNTRIES.has(clean(country));
}

function catalogRows() {
  return CATALOG.filter((row) => allowedCountry(row[2]));
}

function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch (err) {
    return "";
  }
}

function textOf(item) {
  return `${item.title || ""} ${item.provider || ""} ${item.description || ""} ${item.source || ""} ${item.applicationLink || ""}`.toLowerCase();
}

function catalogObject(row, domain) {
  const benefits = row[9].join(", ");
  return {
    title: row[0],
    provider: row[1],
    country: row[2],
    domain: domain === "Any" ? "Any" : domain,
    degreeLevel: row[3],
    amount: row[4],
    deadline: "Unknown",
    eligibility: row[10],
    benefits: row[9],
    applicationLink: row[7],
    isGovernment: row[5],
    type: row[6],
    description: `${row[0]} supports ${row[3]} study in ${row[2]} with ${benefits} support.`,
    source: row[7],
  };
}

function matchCatalog(item) {
  const text = textOf(item);
  return catalogRows().find((row) => row[8] && row[8].some((pattern) => text.includes(pattern))) ||
    catalogRows().find((row) => row[0].toLowerCase() === clean(item.title, "").toLowerCase()) ||
    null;
}

function inferCountry(item, fallback) {
  const found = matchCatalog(item);
  const text = textOf(item);
  const sourceHost = host(item.source || item.applicationLink);

  if (found) return found[2];
  if (text.includes("chevening") || text.includes("commonwealth") || sourceHost.endsWith(".uk")) return "UK";
  if (text.includes("fulbright") || text.includes("usa") || text.includes("united states") || sourceHost.endsWith(".edu")) return "USA";
  if (text.includes("canada") || text.includes("vanier") || text.includes("mccall macbain")) return "Canada";
  if (text.includes("australia") || text.includes("monash") || text.includes("melbourne")) return "Australia";
  if (text.includes("qatar") || text.includes("hbku") || text.includes("doha institute")) return "Qatar";
  if (text.includes("daad") || text.includes("germany")) return "Germany";
  if (text.includes("erasmus")) return "Europe";
  return fallback === "Pakistan" ? "Unknown" : clean(fallback, "Unknown");
}

function inferDegree(item, fallback) {
  const found = matchCatalog(item);
  const text = textOf(item);
  const bachelor = text.includes("undergraduate") || text.includes("bachelor");
  const master = text.includes("master") || text.includes("masters") || /\bms\b/.test(text) || /\bmsc\b/.test(text);

  if (found) return found[3];
  if (bachelor && master) return "Bachelor | Master";
  if (bachelor) return "Bachelor";
  if (master) return "Master";
  return fallback === "Any" ? "Unknown" : clean(fallback, "Unknown");
}

function inferProvider(item) {
  const found = matchCatalog(item);
  const text = textOf(item);
  const sourceHost = host(item.source || item.applicationLink);

  if (found) return found[1];
  if (sourceHost.includes("hec.gov.pk") || text.includes("hec") || text.includes("higher education commission")) return "Higher Education Commission Pakistan";
  if (sourceHost.includes("daad") || text.includes("daad")) return "DAAD";
  if (text.includes("commonwealth")) return "Commonwealth Scholarship Commission";
  if (text.includes("fulbright")) return "US Government";
  if (text.includes("chevening")) return "UK Government";
  if (text.includes("qatar university")) return "Qatar University";
  if (text.includes("australia awards")) return "Australian Government";
  return clean(item.provider, "Unknown");
}

function isGovernmentProvider(provider) {
  const value = clean(provider, "").toLowerCase();

  return value.includes("government") ||
    value.includes("commonwealth scholarship commission") ||
    value.includes("higher education commission") ||
    value === "daad" ||
    value.includes("european union") ||
    value.includes("world bank") ||
    value.includes("asian development bank") ||
    value.includes("japanese government") ||
    value.includes("hungarian government");
}

function inferAmount(item) {
  const found = matchCatalog(item);
  const text = textOf(item);

  if (found) return found[4];
  if (text.includes("fully funded") || text.includes("full tuition")) return "Fully Funded";
  if (text.includes("partial") || text.includes("tuition") || text.includes("stipend") || text.includes("allowance")) return "Partial";
  return clean(item.amount, "Unknown");
}

function inferDeadline(item) {
  const sourceText = `${item.deadline || ""} ${item.description || ""}`;
  const deadlineMatch = sourceText.match(/deadline[:\s-]+([^.;\n]{4,50})/i);
  const dateMatch = sourceText.match(/\b\d{1,2}\s+[A-Z][a-z]+\s+\d{4}\b/);
  const monthDateMatch = sourceText.match(/\b[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}\b/);
  const monthRangeMatch = sourceText.match(/\b[A-Z][a-z]{2,8}\s*-\s*[A-Z][a-z]{2,8}\s+\d{4}\b/);
  const monthYearMatch = sourceText.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/);
  const monthOnlyMatch = sourceText.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/);

  if (deadlineMatch) return deadlineMatch[1].trim();
  if (dateMatch) return dateMatch[0];
  if (monthDateMatch) return monthDateMatch[0];
  if (monthRangeMatch) return monthRangeMatch[0];
  if (monthYearMatch) return monthYearMatch[0];
  if (monthOnlyMatch) return monthOnlyMatch[0];
  return clean(item.deadline, "Unknown");
}

function asArray(value, fallback) {
  return Array.isArray(value) && value.length > 0 ? value.filter(Boolean) : fallback;
}

function inferBenefits(item) {
  const found = matchCatalog(item);
  const text = textOf(item);
  const benefits = [];

  if (found) return found[9];
  if (text.includes("tuition")) benefits.push("tuition");
  if (text.includes("stipend") || text.includes("allowance")) benefits.push("stipend");
  if (text.includes("travel") || text.includes("airfare")) benefits.push("travel");
  if (text.includes("housing") || text.includes("accommodation") || text.includes("residence")) benefits.push("accommodation");
  if (benefits.length === 0 && inferAmount(item) === "Fully Funded") return ["tuition", "stipend", "travel"];
  return benefits.length > 0 ? benefits : asArray(item.benefits, ["Unknown"]);
}

function inferEligibility(item) {
  const found = matchCatalog(item);
  const text = textOf(item);
  const eligibility = [];

  if (found) return found[10];
  if (text.includes("pakistan") || text.includes("pakistani")) eligibility.push("Pakistani applicants");
  if (text.includes("international")) eligibility.push("International applicants");
  if (text.includes("undergraduate") || text.includes("bachelor")) eligibility.push("Bachelor applicants");
  if (text.includes("master") || /\bms\b/.test(text)) eligibility.push("Master applicants");
  if (text.includes("leadership")) eligibility.push("Leadership potential");
  if (text.includes("academic merit")) eligibility.push("Academic merit");
  const sourceEligibility = asArray(item.eligibility, []);
  const combined = [...eligibility, ...sourceEligibility]
    .filter((value) => clean(value, "") && clean(value, "").toLowerCase() !== "unknown");

  return combined.length >= 2 ? combined.slice(0, 4) : [...combined, "Check official criteria"].slice(0, 2);
}

function officialSource(item) {
  const sourceHost = host(item.source || item.applicationLink);

  return sourceHost.includes(".gov") ||
    sourceHost.includes(".edu") ||
    sourceHost.includes(".org") ||
    sourceHost.includes("chevening.org") ||
    sourceHost.includes("fulbrightonline.org") ||
    sourceHost.includes("cscuk.fcdo.gov.uk") ||
    sourceHost.includes("britishcouncil.org") ||
    sourceHost.includes("daad.") ||
    sourceHost.includes("hec.gov.pk") ||
    sourceHost.includes("dfat.gov.au") ||
    sourceHost.includes("education.gov.au") ||
    sourceHost.includes("worldbank.org") ||
    sourceHost.includes("adb.org") ||
    sourceHost.includes("vanier.gc.ca") ||
    sourceHost.includes("qu.edu.qa") ||
    sourceHost.includes("hbku.edu.qa") ||
    sourceHost.includes("dohainstitute.edu.qa");
}

function hasDeadline(item) {
  const deadline = clean(item.deadline, "Unknown").toLowerCase();
  return deadline !== "unknown" && deadline !== "n/a" && deadline !== "check source";
}

function cleanDescription(item, fallback) {
  const description = clean(item.description, "");
  const lower = description.toLowerCase();
  const cleaned = (description || fallback)
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");

  if (
    !description ||
    lower.includes("is a real scholarship program") ||
    lower.includes("real scholarship program for international students")
  ) {
    return fallback.length > 220 ? `${fallback.slice(0, 217).trim()}...` : fallback;
  }

  return sentences.length > 220 ? `${sentences.slice(0, 217).trim()}...` : sentences;
}

function score(item) {
  const amount = clean(item.amount, "").toLowerCase();
  const type = clean(item.type, "").toLowerCase();
  const fullyFunded = amount === "fully funded";
  const partial = amount === "partial";
  let value = 0;

  if (fullyFunded && item.isGovernment) value = 10;
  else if (fullyFunded && type === "university") value = officialSource(item) ? 9 : 8;
  else if (fullyFunded && type === "hybrid") value = officialSource(item) ? 8 : 7;
  else if (fullyFunded) value = officialSource(item) ? 7 : 6;
  else if (partial && item.isGovernment) value = officialSource(item) ? 7 : 6;
  else if (partial && type === "hybrid") value = officialSource(item) ? 6 : 5;
  else if (partial && type === "university") value = officialSource(item) ? 5 : 4;
  else if (partial) value = officialSource(item) ? 4 : 3;
  else {
    if (item.isGovernment) value += 3;
    if (officialSource(item)) value += 2;
    if (Array.isArray(item.eligibility) && item.eligibility.filter(Boolean).length > 1) value += 1;
  }

  if (!fullyFunded && hasDeadline(item)) value += 1;
  if (!fullyFunded && Array.isArray(item.eligibility) && item.eligibility.filter(Boolean).length > 1) value += 1;

  return Math.min(value, 10);
}

function specificEnough(item) {
  const title = clean(item.title, "").toLowerCase();
  return title.includes("scholarship") ||
    title.includes("scholars") ||
    title.includes("fellowship") ||
    title.includes("award") ||
    title.includes("burslari") ||
    title.includes("stipendium");
}

function genericTitle(title) {
  const value = clean(title, "").toLowerCase();

  return /^\d+\s+/.test(value) ||
    /^pakistan scholarship\b/.test(value) ||
    value.includes("scholarships for ") ||
    value.includes("scholarships in ") ||
    value.includes("fully funded scholarships for ") ||
    value.includes("what are ") ||
    value.includes("top ");
}

function normalize(item, country, domain, degreeLevel) {
  const found = matchCatalog(item);
  const provider = inferProvider(item);
  const inferredGovernment = Boolean(found?.[5]) || isGovernmentProvider(provider);
  const type =
    found?.[6] ||
    (!item.type || item.type === "General"
      ? inferredGovernment
        ? "Government"
        : "Private"
      : item.type);
  const normalized = {
    title: found ? found[0] : clean(item.title),
    provider,
    country: inferCountry(item, country),
    domain: clean(item.domain, domain),
    degreeLevel: inferDegree(item, degreeLevel),
    amount: inferAmount(item),
    deadline: inferDeadline(item),
    eligibility: inferEligibility(item),
    benefits: inferBenefits(item),
    applicationLink: found ? found[7] : clean(item.applicationLink || item.source),
    isGovernment: found
      ? Boolean(found[5])
      : typeof item.isGovernment === "boolean"
        ? item.isGovernment && type === "Government"
        : inferredGovernment,
    type,
    description: cleanDescription(
      item,
      `${found?.[0] || clean(item.title)} supports ${inferDegree(item, degreeLevel)} study with ${inferBenefits(item).join(", ")} support.`
    ),
    source: found ? found[7] : clean(item.source || item.applicationLink),
  };
  normalized.score = score(normalized);
  return normalized;
}

function dedupe(items) {
  const exactSeen = new Set();
  const result = [];

  for (const item of items) {
    const key = `${item.title}_${item.provider}_${item.applicationLink}`.toLowerCase().replace(/[^a-z0-9]+/g, " ");
    const duplicateIndex = result.findIndex((existing) => duplicateScholarship(existing, item));

    if (exactSeen.has(key) || duplicateIndex !== -1) {
      if (duplicateIndex !== -1 && score(item) > score(result[duplicateIndex])) {
        result[duplicateIndex] = item;
      }
      continue;
    }

    exactSeen.add(key);
    result.push(item);
  }

  return result;
}

function normalizeTitle(value) {
  return clean(value, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|program|programme|scholarships|scholarship|for|international|students|student)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSimilarity(a, b) {
  const aTokens = new Set(normalizeTitle(a).split(" ").filter(Boolean));
  const bTokens = new Set(normalizeTitle(b).split(" ").filter(Boolean));

  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return intersection / union;
}

function duplicateScholarship(a, b) {
  const aDomain = host(a.applicationLink || a.source);
  const bDomain = host(b.applicationLink || b.source);
  const similarity = tokenSimilarity(a.title, b.title);
  const sameDomain = aDomain && bDomain && aDomain === bDomain;
  const sameProvider = clean(a.provider, "").toLowerCase() === clean(b.provider, "").toLowerCase();

  return similarity >= 0.92 || (sameDomain && similarity >= 0.72) || (sameProvider && similarity >= 0.82);
}

function sortScholarships(items) {
  return [...items].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (Number(b.isGovernment) !== Number(a.isGovernment)) return Number(b.isGovernment) - Number(a.isGovernment);
    const bFullyFunded = clean(b.amount, "").toLowerCase() === "fully funded";
    const aFullyFunded = clean(a.amount, "").toLowerCase() === "fully funded";
    if (Number(bFullyFunded) !== Number(aFullyFunded)) return Number(bFullyFunded) - Number(aFullyFunded);
    return a.title.localeCompare(b.title);
  });
}

function qualityFilter(items) {
  const positive = items.filter((item) => item.score > 0);
  const lowScore = items.filter((item) => item.score <= 0).slice(0, 3);
  return [...positive, ...lowScore];
}

function countryLimit(country) {
  if (PRIORITY_COUNTRIES.includes(country)) return 8;
  return 0;
}

function fillerCountryPenalty(country) {
  if (PRIORITY_COUNTRIES.includes(country)) return 0;
  return 9;
}

function typeCounts(items) {
  return items.reduce(
    (counts, item) => {
      counts[item.type] = (counts[item.type] || 0) + 1;
      return counts;
    },
    {}
  );
}

function countryCounts(items) {
  return items.reduce(
    (counts, item) => {
      counts[item.country] = (counts[item.country] || 0) + 1;
      return counts;
    },
    {}
  );
}

function hasCoreDiversity(items) {
  const countries = new Set(items.map((item) => item.country));
  const counts = typeCounts(items);

  return PRIORITY_COUNTRIES.every((country) => countries.has(country)) &&
    (counts.Government || 0) > 0 &&
    (counts.University || 0) > 0 &&
    (counts.Private || 0) > 0;
}

function balanceDataset(items, minResults) {
  const sorted = sortScholarships(items);
  const selected = [];
  const skipped = [];
  const counts = {};

  for (const item of sorted) {
    const nextCount = (counts[item.country] || 0) + 1;

    if (nextCount > countryLimit(item.country)) {
      skipped.push(item);
      continue;
    }

    selected.push(item);
    counts[item.country] = nextCount;

    if (selected.length >= MAX_RESULTS) break;
  }

  const filler = [...skipped].sort(
    (a, b) =>
      fillerCountryPenalty(a.country) - fillerCountryPenalty(b.country) ||
      b.score - a.score ||
      a.title.localeCompare(b.title)
  );

  for (const item of filler) {
    if (selected.length >= minResults || selected.length >= MAX_RESULTS) break;
    selected.push(item);
  }

  return sortScholarships(selected);
}

function finalizeScholarships(items, country, domain, degreeLevel, options = {}) {
  const minResults = options.minResults || MIN_RESULTS;
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => normalize(item, country, domain, degreeLevel))
    .filter((item) => allowedCountry(item.country))
    .filter(specificEnough);
  const existingTitles = new Set(normalized.map((item) => item.title.toLowerCase()));

  for (const row of catalogRows()) {
    if (existingTitles.has(row[0].toLowerCase())) continue;
    normalized.push(normalize(catalogObject(row, domain), country, domain, row[3]));
    existingTitles.add(row[0].toLowerCase());
  }

  return balanceDataset(
    qualityFilter(dedupe(normalized).map((item) => ({ ...item, score: score(item) }))),
    minResults
  );
}

module.exports = { finalizeScholarships, score };
