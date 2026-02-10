// ElevAI Labs — molecules renderer (no frameworks, no build step)
// Enhanced: status classes + emoji labels + highlight search + deep links + copy link + URL params + polished UX

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function normStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  if (!s) return { key: "live", label: "LIVE", emoji: "✅" };

  if (["live", "launched", "shipped", "public"].includes(s))
    return { key: "live", label: "LIVE", emoji: "✅" };

  if (["wip", "work in progress", "in progress", "building"].includes(s))
    return { key: "wip", label: "WIP", emoji: "🛠️" };

  if (["beta", "testing", "test"].includes(s))
    return { key: "beta", label: "BETA", emoji: "🧪" };

  if (["paused", "on hold", "hold"].includes(s))
    return { key: "paused", label: "PAUSED", emoji: "⏸️" };

  if (["archived", "dead", "retired"].includes(s))
    return { key: "archived", label: "ARCHIVED", emoji: "🧊" };

  return { key: s.replace(/\s+/g, "-"), label: s.toUpperCase(), emoji: "⚙️" };
}

function badge(status) {
  const s = normStatus(status);
  return `<span class="status ${escapeHtml(s.key)}" data-status="${escapeHtml(s.key)}">${escapeHtml(s.emoji)} ${escapeHtml(s.label)}</span>`;
}

function getCategories(molecules) {
  const set = new Set(molecules.map(m => m.category).filter(Boolean));
  return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
}

function renderFilters(categories) {
  const wrap = document.querySelector("#filters");
  wrap.innerHTML = categories.map((c, i) => {
    const active = i === 0 ? "active" : "";
    return `<button class="filter ${active}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`;
  }).join("");
}

function highlight(text, query) {
  const t = String(text || "");
  const q = String(query || "").trim();
  if (!q) return escapeHtml(t);

  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(safe, "ig");

  return escapeHtml(t).replace(re, (m) => `<mark style="
    background: rgba(125,211,252,0.20);
    color: inherit;
    padding: 0.05rem 0.15rem;
    border-radius: 6px;
    border: 1px solid rgba(125,211,252,0.25);
  ">${escapeHtml(m)}</mark>`);
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error("Copy failed"));
    } catch (e) { reject(e); }
  });
}

function pulseElement(el) {
  if (!el) return;
  el.animate(
    [
      { transform: "translateY(0)", boxShadow: "0 0 0 rgba(0,0,0,0)" },
      { transform: "translateY(-2px)", boxShadow: "0 18px 44px rgba(0,0,0,0.40)" },
      { transform: "translateY(0)", boxShadow: "0 0 0 rgba(0,0,0,0)" }
    ],
    { duration: 520, easing: "ease-out" }
  );
}

function renderCards(molecules, category, query) {
  const grid = document.querySelector("#moleculeGrid");
  const q = (query || "").toLowerCase().trim();

  const filtered = molecules.filter(m => {
    const catOk = category === "All" || m.category === category;
    const text = `${m.name || ""} ${m.description || ""} ${m.category || ""}`.toLowerCase();
    const qOk = !q || text.includes(q);
    return catOk && qOk;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty">No molecules match that filter. Try a different category or search. 🧬</div>`;
    return;
  }

  grid.innerHTML = filtered.map(m => {
    const id = escapeHtml(m.id || slugify(m.name || ""));
    const nameRaw = m.name || "Untitled Molecule";
    const descRaw = m.description || "";
    const catRaw = m.category || "Unsorted";

    const name = highlight(nameRaw, query);
    const desc = highlight(descRaw, query);
    const cat = escapeHtml(catRaw);

    const url = m.url && m.url !== "#" ? m.url : "";
    const launch = url
      ? `<a class="button" href="${escapeHtml(url)}" target="_blank" rel="noopener">Launch 🚀</a>`
      : `<span class="button disabled" title="URL not set yet">Launch ⏳</span>`;

    const repoLink = m.repo
      ? `<a class="link" href="${escapeHtml(m.repo)}" target="_blank" rel="noopener">GitHub 🧾</a>`
      : "";

    const ideaLink = m.idea
      ? `<a class="link" href="${escapeHtml(m.idea)}" target="_blank" rel="noopener">Idea 🧠</a>`
      : "";

    const copyBtn = `<a class="link" href="#${id}" data-copylink="${id}" title="Copy link">Copy 🔗</a>`;

    return `
      <div class="card" id="${id}">
        <div class="cardTop">
          <span class="tag">${cat}</span>
          ${badge(m.status)}
        </div>
        <h3>${name}</h3>
        <p>${desc}</p>
        <div class="cardActions">
          ${launch}
          ${repoLink}
          ${ideaLink}
          ${copyBtn}
        </div>
      </div>
    `;
  }).join("");
}

function getQueryParams() {
  const sp = new URLSearchParams(window.location.search);
  return {
    cat: sp.get("cat") || "",
    q: sp.get("q") || ""
  };
}

function setQueryParams({ cat, q }) {
  const url = new URL(window.location.href);
  if (cat && cat !== "All") url.searchParams.set("cat", cat);
  else url.searchParams.delete("cat");

  if (q && q.trim()) url.searchParams.set("q", q.trim());
  else url.searchParams.delete("q");

  history.replaceState(null, "", url.toString());
}

function scrollToHashAndPulse() {
  const hash = (window.location.hash || "").slice(1);
  if (!hash) return;
  const el = document.getElementById(hash);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => pulseElement(el), 240);
}

async function init() {
  const statusEl = document.querySelector("#statusLine");
  const search = document.querySelector("#search");
  const filters = document.querySelector("#filters");

  try {
    statusEl.textContent = "Loading molecules… 🔬";
    const res = await fetch("molecules.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load molecules.json (${res.status})`);
    const molecules = await res.json();

    const categories = getCategories(molecules);
    renderFilters(categories);

    const qp = getQueryParams();
    let currentCategory = qp.cat && categories.includes(qp.cat) ? qp.cat : "All";
    let currentQuery = qp.q || "";

    search.value = currentQuery;

    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    const btn = Array.from(document.querySelectorAll("button[data-cat]"))
      .find(b => (b.getAttribute("data-cat") || "") === currentCategory);
    if (btn) btn.classList.add("active");
    else document.querySelector(".filter")?.classList.add("active");

    renderCards(molecules, currentCategory, currentQuery);
    statusEl.textContent = `${molecules.length} molecule${molecules.length === 1 ? "" : "s"} loaded. 🧬`;

    scrollToHashAndPulse();

    filters.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-cat]");
      if (!btn) return;

      currentCategory = btn.getAttribute("data-cat") || "All";

      document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      renderCards(molecules, currentCategory, currentQuery);
      setQueryParams({ cat: currentCategory, q: currentQuery });

      const firstCard = document.querySelector(".card");
      pulseElement(firstCard);
    });

    let searchTimer = null;
    search.addEventListener("input", (e) => {
      currentQuery = e.target.value || "";
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        renderCards(molecules, currentCategory, currentQuery);
        setQueryParams({ cat: currentCategory, q: currentQuery });
      }, 80);
    });

    document.querySelector("#moleculeGrid").addEventListener("click", async (e) => {
      const a = e.target.closest("a[data-copylink]");
      if (!a) return;

      e.preventDefault();
      const id = a.getAttribute("data-copylink");
      const url = new URL(window.location.href);
      url.hash = `#${id}`;

      try {
        await copyToClipboard(url.toString());
        a.textContent = "Copied ✅";
        setTimeout(() => (a.textContent = "Copy 🔗"), 900);
      } catch {
        a.textContent = "Copy failed ❌";
        setTimeout(() => (a.textContent = "Copy 🔗"), 900);
      }
    });

    window.addEventListener("hashchange", scrollToHashAndPulse);

  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to load molecules. Check molecules.json path/format. 💥";
    const grid = document.querySelector("#moleculeGrid");
    grid.innerHTML = `<div class="empty">Error: ${escapeHtml(err.message || err)}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
