const MIN_GAP = 5200;   // GDELT: 1 request / 5 seconds
let lastGdelt = 0;

export async function cachedFetch(url, key, ttlMs = 15 * 60_000) {
  try {
    const hit = JSON.parse(localStorage.getItem(key) || "null");
    if (hit && Date.now() - hit.t < ttlMs) return hit.d;
  } catch { /* corrupt cache, ignore */ }

  if (url.includes("gdeltproject")) {
    const wait = MIN_GAP - (Date.now() - lastGdelt);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastGdelt = Date.now();
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const d = await res.json();
  try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch {}
  return d;
}

export function readBaked() {
  return fetch("data/latest.json", { cache: "no-store" })
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null);
}
