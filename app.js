// app.js
import { TRENDING_URL, STORIES_PER_COUNTRY, COUNTRIES, REGIONS } from "./sources.js";

// A 24x12 ASCII map where each number maps to a region in REGIONS
const MAP_LAYOUT = [
  "000000000000000000000000",
  "001111110000007777770000",
  "011111111000007777777000",
  "011111111033333377777770",
  "002222220033333355666600",
  "002222220044444444400000",
  "000222200044444444400000",
  "000022200000444444000000",
  "000000000000000000000000",
  "000000000000000000888000",
  "000000000000000008888880",
  "000000000000000000888000",
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
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

  // Calculate total stories per region
  stories.forEach((s) => {
    if (!s.countries) return;
    for (const [id, region] of Object.entries(REGIONS)) {
      if (s.countries.some((c) => region.codes.includes(c))) {
        counts[id]++;
      }
    }
  });

  const max = Math.max(1, ...Object.values(counts)); // Avoid divide by zero
  const heatmap = document.getElementById("heatmap");
  let html = "";

  // Draw the grid
  for (const row of MAP_LAYOUT) {
    for (const char of row) {
      const id = parseInt(char, 10);
      if (id === 0) {
        html += `<div class="dot empty"></div>`;
      } else {
        const count = counts[id];
        // Normalize opacity: minimum 0.15 so the region shape remains visible
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

  // For each country, find stories whose `countries` array includes its code.
  const cards = COUNTRIES.map(({ code, name }) => {
    const matching = stories.filter(
      (s) => Array.isArray(s.countries) && s.countries.includes(code)
    );
    return { code, name, stories: matching.slice(0, STORIES_PER_COUNTRY) };
  }).filter((c) => c.stories.length > 0);

  if (cards.length === 0) {
    grid.innerHTML = '<p class="empty">No stories returned.</p>';
    return;
  }

  grid.innerHTML = cards
    .map(
      (card) => `
    <section class="panel">
      <h2>${escapeHtml(card.name)}</h2>
      <ul>
        ${card.stories
          .map(
            (s) => `
          <li>
            <a href="${escapeAttr(s.url)}" target="_blank" rel="noopener">
              ${escapeHtml(s.title)}
            </a>
            <span class="meta">
              ${s.sources_count || 0} outlets ·
              score ${typeof s.score === "number" ? s.score.toFixed(1) : "—"}
            </span>
          </li>`
          )
          .join("")}
      </ul>
    </section>`
    )
    .join("");
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
// Refresh every 30 minutes, matching FreeNews's update cadence
setInterval(load, 30 * 60 * 1000);
