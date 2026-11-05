// app.js
import { TRENDING_URL, STORIES_PER_COUNTRY, COUNTRIES } from "./sources.js";

async function load() {
  const grid = document.getElementById("grid");
  grid.innerHTML = '<p class="loading">Loading world stories…</p>';

  try {
    const res = await fetch(TRENDING_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    render(data.stories || []);
  } catch (e) {
    grid.innerHTML = `<p class="empty">Could not load stories: ${e.message}</p>`;
  }
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
