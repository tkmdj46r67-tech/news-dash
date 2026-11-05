import { TRENDING_URL, STORIES_PER_COUNTRY, REGIONS, COUNTRY_NAMES } from "./sources.js";

// A 48x20 ASCII map mapping to the 8 REGIONS
const MAP_LAYOUT = [
  "000000000000000000000000000000000000000000000000",
  "000001111111111100000000000000000000777777777777",
  "000001111111111100000000000000000000777777777777",
  "000001111111111100000333333333000000777777777777",
  "000001111111111100000333333333000000777777777777",
  "000001111111111100000333333333000000777777777777",
  "000001111111111100000333333333000000777777777777",
  "000000000222220000000044444440000000006666600000",
  "000000000222220000000044444440055555006666600000",
  "000000000222220000000044444440055555006666600000",
  "000000000222220000000044444440055555006666600000",
  "000000000222220000000044444440055555006666600000",
  "000000000222220000000044444440000000006666600000",
  "000000000222220000000000000000000000006666600000",
  "000000000000000000000000000000000000000000000000",
  "000000000000000000000000000000000000008888888000",
  "000000000000000000000000000000000000008888888000",
  "000000000000000000000000000000000000008888888000",
  "000000000000000000000000000000000000000000000000",
  "000000000000000000000000000000000000000000000000"
];

async function load() {
  const grid = document.getElementById("grid");
  const heatmap = document.getElementById("heatmap");
  grid.innerHTML = '<p class="loading">Loading world stories…</p>';
  heatmap.innerHTML = "";

  try {
    const res = await fetch(TRENDING_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const stories = data.stories || [];
    
    renderHeatmap(stories);
    render(stories);
  } catch (e) {
    grid.innerHTML = `<p class="empty">Could not load stories: ${e.message}</p>`;
  }
}

function renderHeatmap(stories) {
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
  const heatmap = document.getElementById("heatmap");
  let html = "";

  for (const row of MAP_LAYOUT) {
    for (const char of row) {
      const id = parseInt(char, 10);
      if (id === 0) {
        html += `<div class="dot empty"></div>`;
      } else {
        const count = counts[id];
        const opacity = count === 0 ? 0.15 : 0.3 + (count / max) * 0.7;
        const title = `${REGIONS[id].name}: ${count} stories`;
        html += `<div class="dot" style="opacity: ${opacity.toFixed(2)}" title="${title}"></div>`;
      }
    }
  }
  heatmap.innerHTML = html;
}

function render(stories) {
  const grid = document.getElementById("grid");
  let html = "";

  // 1. Loop through Regions
  for (const [regionId, region] of Object.entries(REGIONS)) {
    
    // 2. Find countries in this region that have stories
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

    // If no countries in this region have news, skip the whole region
    if (countriesWithStories.length === 0) continue;

    // 3. Render the Region Wrapper
    html += `<div class="region-group">`;
    html += `<h2 class="region-title">${escapeHtml(region.name)}</h2>`;
    html += `<div class="country-grid">`;

    // 4. Render the Country Cards
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

load();
setInterval(load, 30 * 60 * 1000);
