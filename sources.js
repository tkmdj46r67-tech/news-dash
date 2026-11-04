// Query design is the whole product. Validate each one in the GDELT DOC 2
// web UI before tweaking: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
export const QUERIES = {
  politics:  '(election OR legislation OR "head of state" OR summit OR sanctions OR coalition OR parliament)',
  opinion:   '(poll OR "public opinion" OR protest OR backlash OR referendum)',
  security:  '(cyberattack OR espionage OR "intelligence agency" OR sabotage OR terrorism OR coup)',
  conflict:  '("armed clash" OR airstrike OR offensive OR ceasefire OR mobilization OR invasion)',
  economics: '(inflation OR "central bank" OR "interest rate" OR default OR tariff OR IMF OR recession)',
};

export const GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

export function gdeltUrl(q, { timespan = "1d", max = 25 } = {}) {
  const p = new URLSearchParams({
    query: q, mode: "artlist", maxrecords: String(max),
    format: "json", timespan, sort: "hybridrel",
  });
  return `${GDELT_BASE}?${p}`;
}

export const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=7";
export const USGS_URL  = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson";
