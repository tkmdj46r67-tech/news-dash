import { mkdir, writeFile } from "node:fs/promises";
import { EONET_URL, USGS_URL } from "../sources.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const UA =
  "worldmonitor-lite/1.0 (+https://github.com/tkmdj46r67-tech/news-dash)";

const GDELT_GAP_MS      = 15_000; // gap between the 3 GDELT calls
const GDELT_RETRIES     = 3;      // 4 total attempts per call
const GDELT_BASE_DELAY  = 15_000; // 15s, 30s, 60s backoff

const REDDIT_GAP_MS     = 2_000;
const REDDIT_RETRIES    = 2;
const REDDIT_BASE_DELAY = 5_000;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RATE_LIMIT_RE = /limit requests|too many|rate.?limit|429|throttl/i;
const looksJson = (s) => s.startsWith("{") || s.startsWith("[");

/**
 * Fetch that tolerates GDELT's plain-text rate-limit body and retries with
 * exponential backoff. Throws only after the retry budget is exhausted.
 */
async function fetchJsonWithRetry(url, { label, retries, baseDelay }) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = (await res.text()).trim();

      if (!looksJson(text)) {
        if (RATE_LIMIT_RE.test(text)) {
          throw new Error(`rate limited: ${text.slice(0, 120).replace(/\s+/g, " ")}`);
        }
        throw new Error(`non-JSON: ${text.slice(0, 120).replace(/\s+/g, " ")}`);
      }

      return JSON.parse(text);
    } catch (e) {
      if (attempt === retries) {
        console.error(`[${label}] gave up after ${attempt + 1} attempts: ${e.message}`);
        throw e;
      }
      const delay = baseDelay * 2 ** attempt;
      console.warn(
        `[${label}] attempt ${attempt + 1}/${retries + 1} failed (${e.message}); ` +
        `retrying in ${delay / 1000}s`
      );
      await sleep(delay);
    }
  }
}

// ---------------------------------------------------------------------------
// GDELT: 3 combined queries, split into 5 buckets by keyword
// ---------------------------------------------------------------------------
const GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

const COMBINED_QUERIES = {
  politics_and_opinion:
    `(election OR legislation OR "head of state" OR summit OR sanctions ` +
    `OR coalition OR parliament OR poll OR "public opinion" OR protest ` +
    `OR backlash OR referendum)`,
  security_and_conflict:
    `(cyberattack OR espionage OR "intelligence agency" OR sabotage ` +
    `OR terrorism OR coup OR "armed clash" OR airstrike OR offensive ` +
    `OR ceasefire OR mobilization OR invasion)`,
  economics:
    `(inflation OR "central bank" OR "interest rate" OR default ` +
    `OR tariff OR IMF OR recession)`,
};

const OPINION_RE  = /\b(poll|opinion|protest|backlash|referendum)\b/i;
const CONFLICT_RE = /\b(clash|airstrike|offensive|ceasefire|mobilization|invasion)\b/i;

function buildGdeltUrl(query, { timespan = "1d", max = 25 } = {}) {
  const p = new URLSearchParams({
    query,
    mode: "artlist",
    maxrecords: String(max),
    format: "json",
    timespan,
    sort: "hybridrel",
  });
  return `${GDELT_BASE}?${p}`;
}

async function gdelt(name, query) {
  try {
    const data = await fetchJsonWithRetry(buildGdeltUrl(query), {
      label: `gdelt/${name}`,
      retries: GDELT_RETRIES,
      baseDelay: GDELT_BASE_DELAY,
    });
    const articles = (data.articles || []).map((a) => ({
      title: a.title,
      url: a.url,
      domain: a.domain,
      seendate: a.seendate,
      sourcecountry: a.sourcecountry,
    }));
    console.log(`[gdelt/${name}] ${articles.length} articles`);
    return articles;
  } catch {
    return [];
  }
}

function splitByKeyword(items, re) {
  const yes = [];
  const no = [];
  for (const it of items) (re.test(it.title || "") ? yes : no).push(it);
  return { yes, no };
}

// ---------------------------------------------------------------------------
// Climate / hazards (parallel; no rate limit; keep offline via fast retry)
// ---------------------------------------------------------------------------
async function eonet() {
  try {
    const data = await fetchJsonWithRetry(EONET_URL, {
      label: "eonet", retries: 2, baseDelay: 3_000,
    });
    const out = (data.events || []).map((e) => ({
      title: e.title,
      url: (e.sources?.[0]?.url) || e.link || "",
      seendate: e.geometry?.[0]?.date || "",
      category: e.categories?.[0]?.title || "",
    }));
    console.log(`[eonet] ${out.length} events`);
    return out;
  } catch {
    return [];
  }
}

async function usgs() {
  try {
    const data = await fetchJsonWithRetry(USGS_URL, {
      label: "usgs", retries: 2, baseDelay: 3_000,
    });
    const out = (data.features || []).map((f) => ({
      title: `M${f.properties.mag} — ${f.properties.place}`,
      url: f.properties.url,
      seendate: new Date(f.properties.time).toISOString(),
      category: "Earthquake",
    }));
    console.log(`[usgs] ${out.length} events`);
    return out;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Reddit (best-effort; often blocked from GitHub Actions IPs — logged clearly)
// ---------------------------------------------------------------------------
async function reddit(sub, limit = 20) {
  const url = `https://www.reddit.com/r/${sub}/top.json?t=day&limit=${limit}`;
  try {
    const data = await fetchJsonWithRetry(url, {
      label: `reddit/${sub}`, retries: REDDIT_RETRIES, baseDelay: REDDIT_BASE_DELAY,
    });
    const out = (data.data?.children || []).map((c) => ({
      title: c.data.title,
      url: `https://reddit.com${c.data.permalink}`,
      subreddit: c.data.subreddit,
      seendate: new Date(c.data.created_utc * 1000).toISOString(),
    }));
    console.log(`[reddit/${sub}] ${out.length} posts`);
    return out;
  } catch (e) {
    console.warn(`[reddit/${sub}] unavailable: ${e.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`snapshot starting at ${new Date().toISOString()}`);
  const snapshot = { generated: new Date().toISOString() };

  // GDELT — 3 calls, split into 5 buckets
  const gdeltKeys = Object.keys(COMBINED_QUERIES);
  const gdeltResults = {};
  for (let i = 0; i < gdeltKeys.length; i++) {
    const key = gdeltKeys[i];
    gdeltResults[key] = await gdelt(key, COMBINED_QUERIES[key]);
    if (i < gdeltKeys.length - 1) await sleep(GDELT_GAP_MS);
  }

  const politicsSplit = splitByKeyword(
    gdeltResults.politics_and_opinion, OPINION_RE
  );
  const securitySplit = splitByKeyword(
    gdeltResults.security_and_conflict, CONFLICT_RE
  );

  snapshot.politics  = politicsSplit.no;   // non-opinion political items
  snapshot.opinion   = politicsSplit.yes;  // poll/protest/referendum items
  snapshot.security  = securitySplit.no;   // non-conflict security items
  snapshot.conflict  = securitySplit.yes;  // armed-clash items
  snapshot.economics = gdeltResults.economics;

  // Climate — parallel, no rate limit
  const [eon, eq] = await Promise.all([eonet(), usgs()]);
  snapshot.climate = [...eon, ...eq];

  // Social — best-effort
  snapshot.social = [];
  const subs = ["worldnews", "geopolitics", "economics", "ClimateChange"];
  for (let i = 0; i < subs.length; i++) {
    snapshot.social.push(...(await reddit(subs[i])));
    if (i < subs.length - 1) await sleep(REDDIT_GAP_MS);
  }

  // ---- summary ----
  const counts = Object.fromEntries(
    Object.entries(snapshot).map(([k, v]) =>
      [k, Array.isArray(v) ? v.length : "-"]
    )
  );
  console.log("counts:", counts);

  const totalItems = Object.values(snapshot)
    .filter(Array.isArray)
    .reduce((n, arr) => n + arr.length, 0);

  const gdeltTotal =
    snapshot.politics.length +
    snapshot.opinion.length +
    snapshot.security.length +
    snapshot.conflict.length +
    snapshot.economics.length;

  if (totalItems === 0) {
    // Workflow will fail (green→red) and the previous good data/latest.json
    // will NOT be overwritten, because the commit step never runs.
    console.error("ALL sources returned 0 items — refusing to overwrite previous snapshot");
    process.exit(1);
  }

  await mkdir("data", { recursive: true });
  await writeFile("data/latest.json", JSON.stringify(snapshot, null, 2));
  console.log(`wrote data/latest.json (${totalItems} items total)`);

  if (gdeltTotal === 0) {
    console.error(
      "WARNING: all GDELT queries returned 0 items — IP likely still rate-limited. " +
      "If this persists across runs, switch to GDELT's 15-min bulk CSV exports."
    );
    // Don't fail the workflow — climate data may still be useful.
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
