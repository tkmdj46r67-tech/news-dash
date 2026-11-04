export function dedupe(items, keyFn = a => a.url || a.title) {
  const seen = new Set(), out = [];
  for (const it of items) {
    const k = keyFn(it);
    const norm = (it.title || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
    if (seen.has(k) || (norm && seen.has(norm))) continue;
    seen.add(k);
    if (norm) seen.add(norm);
    out.push(it);
  }
  return out;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function relTime(iso) {
  if (!iso) return "";
  let d;
  if (/^\d{8}T\d{6}Z$/.test(iso)) {
    // GDELT format: 20240115T120000Z
    d = new Date(
      `${iso.slice(0,4)}-${iso.slice(4,6)}-${iso.slice(6,8)}T` +
      `${iso.slice(9,11)}:${iso.slice(11,13)}:${iso.slice(13,15)}Z`
    );
  } else {
    d = new Date(iso);
  }
  if (isNaN(d)) return "";
  const sec = (Date.now() - d.getTime()) / 1000;
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function renderPanel(el, items, limit = 15) {
  const ul = el.querySelector("ul");
  if (!items || !items.length) {
    ul.innerHTML = `<li class="empty">No items</li>`;
    return;
  }
  ul.innerHTML = items.slice(0, limit).map(a => {
    const title = escapeHtml(a.title || "(untitled)");
    const src = a.domain || a.subreddit || a.category || "";
    const t = relTime(a.seendate);
    const href = a.url && a.url.startsWith("http") ? a.url : "#";
    const meta = [src, t].filter(Boolean).join(" · ");
    return `<li><a href="${href}" target="_blank" rel="noopener">${title}</a>` +
           `<span class="meta">${escapeHtml(meta)}</span></li>`;
  }).join("");
}
