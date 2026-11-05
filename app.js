// API Endpoint
const TRENDING_URL = "https://ethos6.github.io/free-news-api/v1/trending.json";
const STORIES_PER_COUNTRY = 5;

// Regional Groupings and Country Names
const REGIONS = {
  1: { name: "North America", codes: ["us", "ca", "mx"] },
  2: { name: "South America", codes: ["br", "ar", "cl", "co", "pe", "ve"] },
  3: { name: "Europe", codes: ["gb", "de", "fr", "it", "es", "nl", "se", "pl", "ua", "ru"] },
  4: { name: "Africa", codes: ["za", "ng", "eg", "ke", "et", "ma", "gh"] },
  5: { name: "Middle East", codes: ["il", "ir", "sa", "ae", "tr", "qa", "kw", "om"] },
  6: { name: "South Asia", codes: ["in", "pk", "bd", "lk", "np"] },
  7: { name: "East Asia", codes: ["cn", "jp", "kr", "tw", "vn", "th", "id", "my", "ph"] },
  8: { name: "Oceania", codes: ["au", "nz"] },
};

const COUNTRY_NAMES = {
  us: "United States", gb: "United Kingdom", cn: "China", ru: "Russia",
  in: "India", de: "Germany", fr: "France", jp: "Japan", br: "Brazil",
  au: "Australia", ca: "Canada", mx: "Mexico", ar: "Argentina", cl: "Chile",
  co: "Colombia", pe: "Peru", ve: "Venezuela", it: "Italy", es: "Spain",
  nl: "Netherlands", se: "Sweden", pl: "Poland", ua: "Ukraine", za: "South Africa",
  ng: "Nigeria", eg: "Egypt", ke: "Kenya", et: "Ethiopia", ma: "Morocco",
  gh: "Ghana", il: "Israel", ir: "Iran", sa: "Saudi Arabia", ae: "UAE",
  tr: "Turkey", qa: "Qatar", kw: "Kuwait", om: "Oman", pk: "Pakistan",
  bd: "Bangladesh", lk: "Sri Lanka", np: "Nepal", kr: "South Korea",
  tw: "Taiwan", vn: "Vietnam", th: "Thailand", id: "Indonesia", my: "Malaysia",
  ph: "Philippines", nz: "New Zealand"
};

// Mapping Numeric ISO IDs (from TopoJSON) to Alpha-2 Codes
const isoNumericToAlpha2 = {
  "840": "us", "124": "ca", "484": "mx", 
  "76": "br", "32": "ar", "152": "cl", "170": "co", "604": "pe", "862": "ve",
  "826": "gb", "276": "de", "250": "fr", "380": "it", "724": "es", "528": "nl", "752": "se", "616": "pl", "804": "ua", "643": "ru",
  "710": "za", "566": "ng", "818": "eg", "404": "ke", "231": "et", "504": "ma", "288": "gh",
  "376": "il", "364": "ir", "682": "sa", "784": "ae", "792": "tr", "634": "qa", "414": "kw", "512": "om",
  "356": "in", "586": "pk", "50": "bd", "144": "lk", "524": "np",
  "156": "cn", "392": "jp", "410": "kr", "158": "tw", "704": "vn", "764": "th", "360": "id", "458": "my", "608": "ph",
  "36": "au", "554": "nz"
};

async function load() {
  const grid = document.getElementById("grid");
  document.getElementById("map-container").innerHTML = "";
  grid.innerHTML = '<p class="loading">Loading world stories…</p>';

  try {
    // 1. Fetch News Data
    const res = await fetch(TRENDING_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const stories = data.stories || [];
    
    // 2. Render Map
    await renderMap(stories);
    
    // 3. Render Lists
    renderLists(stories);
  } catch (e) {
    grid.innerHTML = `<p class="empty">Could not load stories: ${e.message}</p>`;
  }
}

async function renderMap(stories) {
  // Calculate story counts per region
  const counts = {};
  Object.keys(REGIONS).forEach(id => counts[id] = 0);

  stories.forEach((s) => {
    if (!s.countries) return;
    for (const [id, region] of Object.entries(REGIONS)) {
      if (s.countries.some((c) => region.codes.includes(c))) {
        counts[id]++;
      }
    }
  });

  const max = Math.max(1, ...Object.values(counts));

  // Fetch TopoJSON world map
  const topoData = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    .then(res => res.json());
  
  const geoData = topojson.feature(topoData, topoData.objects.countries);

  // Set up D3 Map
  const width = 960;
  const height = 500;
  const projection = d3.geoNaturalEarth1().fitSize([width, height], geoData);
  const path = d3.geoPath().projection(projection);

  const svg = d3.select("#map-container")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  // Draw Countries
  svg.append("g")
    .selectAll("path")
    .data(geoData.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const alpha2 = isoNumericToAlpha2[String(d.id)];
      if (!alpha2) return "#161b22"; // Unmapped countries get dark gray

      // Find which region this country belongs to
      let regionId = null;
      for (const [id, region] of Object.entries(REGIONS)) {
        if (region.codes.includes(alpha2)) {
          regionId = id;
          break;
        }
      }
      if (!regionId) return "#161b22";

      const count = counts[regionId] || 0;
      const opacity = count === 0 ? 0.15 : 0.3 + (count / max) * 0.7;
      return `rgba(255, 123, 0, ${opacity})`;
    })
    .append("title")
    .text(d => {
      const alpha2 = isoNumericToAlpha2[String(d.id)];
      const name = (alpha2 && COUNTRY_NAMES[alpha2]) ? COUNTRY_NAMES[alpha2] : d.properties.name;
      
      if (!alpha2) return name;
      
      let regionId = null;
      for (const [id, region] of Object.entries(REGIONS)) {
        if (region.codes.includes(alpha2)) { regionId = id; break; }
      }
      
      return regionId ? `${REGIONS[regionId].name}: ${counts[regionId]} stories` : name;
    });
}

function renderLists(stories) {
  const grid = document.getElementById("grid");
  let html = "";

  for (const [regionId, region] of Object.entries(REGIONS)) {
    // Find countries in this region that have stories
    const countriesWithStories = region.codes.map(code => {
      const countryStories = stories.filter(
        (s) => Array.isArray(s.countries) && s.countries.includes(code)
      ).slice(0, STORIES_PER_COUNTRY);
      
      return { 
        code, 
        name: COUNTRY_NAMES[code] || code.toUpperCase(), 
        stories: countryStories 
      };
    }).filter(c => c.stories.length > 0);

    // Skip empty regions entirely
    if (countriesWithStories.length === 0) continue;

    html += `<div class="region-group">`;
    html += `<h2 class="region-title">${escapeHtml(region.name)}</h2>`;
    html += `<div class="country-grid">`;

    for (const country of countriesWithStories) {
      html += `
        <section class="panel">
          <h3>${escapeHtml(country.name)}</h3>
          <ul>
            ${country.stories.map(s => `
              <li>
                <a href="${escapeAttr(s.url)}" target="_blank" rel="noopener">
                  ${escapeHtml(s.title)}
                </a>
                <span class="meta">
                  ${s.sources_count || 0} outlets · 
                  score ${typeof s.score === "number" ? s.score.toFixed(1) : "—"}
                </span>
              </li>
            `).join("")}
          </ul>
        </section>
      `;
    }

    html += `</div></div>`;
  }

  if (!html) {
    grid.innerHTML = '<p class="empty">No stories returned.</p>';
    return;
  }

  grid.innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

// Initialize
load();
// Refresh every 30 minutes
setInterval(load, 30 * 60 * 1000);
