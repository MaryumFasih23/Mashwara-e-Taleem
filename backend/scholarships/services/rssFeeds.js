const Parser = require("rss-parser");

const parser = new Parser({
  timeout: 10000,
});

const RSS_FEEDS = [
  "https://www.scholars4dev.com/feed/",
  "https://opportunitydesk.org/feed/",
  "https://scholarshipscorner.website/feed/",
  "https://www.afterschoolafrica.com/category/scholarship/feed/",
];

function matchesFilters(item, country, domain, degreeLevel) {
  const text = `${item.title || ""} ${item.contentSnippet || ""} ${item.content || ""}`.toLowerCase();
  const wantsCountry = country !== "Any";
  const wantsDomain = domain !== "Any";
  const wantsDegree = degreeLevel !== "Any";
  const countryValue = country.toLowerCase();
  const domainValue = domain.toLowerCase();
  const degreeValue = degreeLevel.toLowerCase();

  const hasCountry = wantsCountry && text.includes(countryValue);
  const hasDomain = wantsDomain && text.includes(domainValue);
  const hasDegree = wantsDegree && text.includes(degreeValue);

  if (wantsCountry || wantsDomain) {
    return hasCountry || hasDomain;
  }

  return !wantsDegree || hasDegree;
}

async function parseFeed(feedUrl) {
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve({ items: [] }), 12000);
  });

  return Promise.race([parser.parseURL(feedUrl), timeout]);
}

async function fetchRSSScholarships(country, domain, degreeLevel = "Any") {
  const results = [];

  for (const feedUrl of RSS_FEEDS) {
    try {
      const feed = await parseFeed(feedUrl);
      const items = Array.isArray(feed.items) ? feed.items : [];
      const filtered = items.filter((item) =>
        matchesFilters(item, country, domain, degreeLevel)
      );

      results.push(
        ...filtered.slice(0, 5).map((item) => ({
          title: item.title || "",
          link: item.link || "",
          snippet: (item.contentSnippet || item.content || "").slice(0, 500),
          pubDate: item.pubDate,
          sourceType: "rss",
          feedUrl,
        }))
      );
    } catch (err) {
      console.error(`RSS failed: ${feedUrl}`, err.message);
    }
  }

  return results;
}

module.exports = { RSS_FEEDS, fetchRSSScholarships };
