// ElevAI Labs — molecules renderer (no frameworks, no build step)

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

function badge(status) {
  const s = (status || "").toLowerCase();
  const label = s || "live";
  return `<span class="status" data-status="${escapeHtml(label)}">${escapeHtml(label.toUpperCase())}</span>`;
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
    grid.innerHTML = `<div class="empty">No molecules match that filter. Try a different category or search.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(m => {
    const name = escapeHtml(m.name || "Untitled Molecule");
    const desc = escapeHtml(m.description || "");
    const cat = escapeHtml(m.category || "Unsorted");
    const url = m.url && m.url !== "#" ? m.url : "";
    const launch = url
      ? `<a class="button" href="${escapeHtml(url)}" target="_blank" rel="noopener">Launch</a>`
      : `<span class="button disabled" title="URL not set yet">Launch</span>`;

    return `
      <div class="card" id="${escapeHtml(m.id || slugify(m.name || ""))}">
        <div class="cardTop">
          <span class="tag">${cat}</span>
          ${badge(m.status)}
        </div>
        <h3>${name}</h3>
        <p>${desc}</p>
        <div class="cardActions">
          ${launch}
          ${m.repo ? `<a class="link" href="${escapeHtml(m.repo)}" target="_blank" rel="noopener">GitHub</a>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

async function init() {
  const statusEl = document.querySelector("#statusLine");
  try {
    statusEl.textContent = "Loading molecules…";
    const res = await fetch("molecules.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load molecules.json (${res.status})`);
    const molecules = await res.json();

    const categories = getCategories(molecules);
    renderFilters(categories);

    let currentCategory = "All";
    let currentQuery = "";

    const search = document.querySelector("#search");
    const filters = document.querySelector("#filters");

    renderCards(molecules, currentCategory, currentQuery);
    statusEl.textContent = `${molecules.length} molecule${molecules.length === 1 ? "" : "s"} loaded.`;

    filters.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-cat]");
      if (!btn) return;
      currentCategory = btn.getAttribute("data-cat") || "All";

      // toggle active
      document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      renderCards(molecules, currentCategory, currentQuery);
    });

    search.addEventListener("input", (e) => {
      currentQuery = e.target.value || "";
      renderCards(molecules, currentCategory, currentQuery);
    });

  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to load molecules. Check molecules.json path/format.";
    const grid = document.querySelector("#moleculeGrid");
    grid.innerHTML = `<div class="empty">Error: ${escapeHtml(err.message || err)}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
