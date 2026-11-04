import { EONET_URL, USGS_URL } from "./sources.js";
import { cachedFetch, readBaked } from "./store.js";
import { dedupe, renderPanel } from "./render.js";

const state = { baked: null, eonet: [], usgs: [], region: "" };

async function boot() {
  wireControls();

  // 1. Paint instantly from the baked snapshot
  state.baked = await readBaked();
  if (state.baked) {
    renderAll();
    const gen = new Date(state.baked.generated);
    document.getElementById("asof").textContent =
      isNaN(gen) ? "" : `as of ${gen.toLocaleString()}`;
  } else {
    document.getElementById("asof").textContent = "no snapshot yet";
  }

  // 2. Live-refresh the CORS-safe sources (EONET + USGS)
  await refreshLive();
}

async function refreshLive() {
  const btn = document.getElementById("refresh");
  btn.disabled = true;
  try {
    const [eonet, usgs] = await Promise.allSettled([
      cachedFetch(EONET_URL, "eonet"),
      cachedFetch(USGS_URL, "usgs"),
    ]);
    if (eonet.status === "fulfilled") state.eonet = mapEonet(eonet.value);
    if (usgs.status === "fulfilled") state.usgs = mapUsgs(usgs.value);
    renderAll();
  } finally {
    btn.disabled = false;
  }
}

function mapEonet(data) {
  return (data.events || []).map(e => ({
    title: e.title,
    url: (e.sources?.[0]?.url) || e.link || "",
    seendate: e.geometry?.[0]?.date || "",
    category: e.categories?.[0]?.title || "",
  }));
}

function mapUsgs(data) {
  return (data.features || []).map(f => ({
    title: `M${f.properties.mag} — ${f.properties.place}`,
    url: f.properties.url,
    seendate: new Date(f.properties.time).toISOString(),
    category: "Earthquake",
  }));
}

function applyRegion(items) {
  if (!state.region) return items;
  const r = state.region.toLowerCase();
  return items.filter(a => (a.sourcecountry || "").toLowerCase().includes(r));
}

function renderAll() {
  const b = state.baked || {};
  for (const key of ["politics", "opinion", "security", "conflict", "economics"]) {
    renderPanel(
      document.getElementById(`panel-${key}`),
      dedupe(applyRegion(b[key] || []))
    );
  }

  const climate = dedupe([...state.eonet, ...state.usgs]);
  renderPanel(document.getElementById("panel-climate"), climate);

  renderPanel(document.getElementById("panel-social"), dedupe(b.social || []), 25);
}

function wireControls() {
  document.getElementById("region").addEventListener("change", e => {
    state.region = e.target.value;
    renderAll();
  });
  document.getElementById("refresh").addEventListener("click", refreshLive);
}

boot();
