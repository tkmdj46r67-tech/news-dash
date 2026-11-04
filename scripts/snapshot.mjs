import { mkdir, writeFile } from "node:fs/promises";
import { QUERIES, gdeltUrl, EONET_URL, USGS_URL } from "../sources.js";

const UA = "worldmonitor-lite/1.0 (github actions snapshot)";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const text = await res.text();
  const head = text.trim().slice(0, 1);
  if (head !== "{" && head !== "[") {
    throw new Error(`non-JSON response: ${text.slice(0, 160).replace(/\s+/g, " ")}`);
  }
  return JSON.parse(text);
}

async function gdelt(name, q) {
  try {
    const data = await getJson(gdeltUrl(q, { timespan: "1d", max: 25 }));
    return (data.articles || []).map(a => ({
      title: a.title, url: a.url, domain: a.domain,
      seendate: a.seendate, sourcecountry: a.sourcecountry,
    }));
  } catch (e) {
    console.error(`[gdelt/${name}] ${e.message}`);
    return [];
  }
}

async function eonet() {
  try {
    const data = await getJson(EONET_URL);
    return (data.events || []).map(e => ({
      title: e.title,
      url: (e.sources?.[0]?.url) || e.link || "",
      seendate: e.geometry?.[0]?.date || "",
      category: e.categories?.[0]?.title || "",
    }));
  } catch (e) { console.error(`[eonet] ${e.message}`); return []; }
}

async function usgs() {
  try {
    const data = await getJson(USGS_URL);
    return (data.features || []).map(f => ({
      title: `M${f.properties.mag} — ${f.properties.place}`,
      url: f.properties.url,
      seendate: new Date(f.properties.time).toISOString(),
      category: "Earthquake",
    }));
  } catch (e) { console.error(`[usgs] ${e.message}`); return []; }
}

async function reddit(sub, limit = 20) {
  try {
    const data = await getJson(
      `https://www.reddit.com/r/${sub}/top.json?t=day&limit=${limit}`
    );
    return (data.data?.children || []).map(c => ({
      title: c.data.title,
      url: `https://reddit.com${c.data.permalink}`,
      subreddit: c.data.subreddit,
      seendate: new Date(c.data.created_utc * 1000).toISOString(),
    }));
  } catch (e) { console.error(`[reddit/${sub}] ${e.message}`); return []; }
}

// --- build snapshot ---------------------------------------------------------
const snapshot = { generated: new Date().toISOString(), social: [] };

for (const key of ["politics", "opinion", "security", "conflict", "economics"]) {
  snapshot[key] = await gdelt(key, QUERIES[key]);
  await sleep(5500); // respect GDELT: 1 req / 5s
}

snapshot.climate = [...await eonet(), ...await usgs()];

for (const sub of ["worldnews", "geopolitics", "economics", "ClimateChange"]) {
  snapshot.social.push(...await reddit(sub));
  await sleep(1000);
}

await mkdir("data", { recursive: true });
await writeFile("data/latest.json", JSON.stringify(snapshot, null, 2));

console.log("counts:", Object.fromEntries(
  Object.entries(snapshot).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])
));
