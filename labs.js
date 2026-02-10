// ElevAI Labs — molecules renderer (no frameworks, no build step)
// Upgrade: particles background + toast + card tilt/glow (keeps your exact HTML IDs)

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

function toast(msg) {
  const el = document.querySelector(".toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1100);
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

function enableCardTilt() {
  document.querySelectorAll(".card").forEach(card => {
    let raf = null;

    function onMove(e) {
      const r = card.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty("--mx", `${mx}%`);
      card.style.setProperty("--my", `${my}%`);

      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;

      const rx = (-dy * 7).toFixed(2);
      const ry = (dx * 9).toFixed(2);

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
      });
    }

    function onLeave() {
      if (raf) cancelAnimationFrame(raf);
      card.style.transform = "";
      card.style.removeProperty("--mx");
      card.style.removeProperty("--my");
    }

    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
  });
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
          ${copyBtn}
        </div>
      </div>
    `;
  }).join("");

  enableCardTilt();
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

// ---- Ambient background: particles canvas ----
function startParticles() {
  const c = document.getElementById("bg");
  if (!c) return;
  const ctx = c.getContext("2d");

  let w = 0, h = 0, dpr = 1;
  const particles = [];
  const N = 70;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = c.width = Math.floor(innerWidth * dpr);
    h = c.height = Math.floor(innerHeight * dpr);
    c.style.width = innerWidth + "px";
    c.style.height = innerHeight + "px";
  }

  function init() {
    particles.length = 0;
    for (let i = 0; i < N; i++) {
      particles.push({
        x: rnd(0, w),
        y: rnd(0, h),
        r: rnd(1.2, 3.2) * dpr,
        vx: rnd(-0.18, 0.18) * dpr,
        vy: rnd(-0.10, 0.10) * dpr,
        a: rnd(0.10, 0.35)
      });
    }
  }

  let t = 0;
  function tick() {
    t += 0.006;
    ctx.clearRect(0, 0, w, h);

    // drifting cyan-ish fog
    const gx = (Math.sin(t * 0.9) * 0.18 + 0.5) * w;
    const gy = (Math.cos(t * 0.7) * 0.18 + 0.5) * h;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.7);
    g.addColorStop(0, "rgba(125,211,252,0.10)");
    g.addColorStop(0.55, "rgba(22,32,54,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -30) p.x = w + 30;
      if (p.x > w + 30) p.x = -30;
      if (p.y < -30) p.y = h + 30;
      if (p.y > h + 30) p.y = -30;

      ctx.beginPath();
      ctx.fillStyle = `rgba(230,232,235,${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", () => { resize(); init(); });
  resize();
  init();
  tick();
}

async function init() {
  const statusEl = document.querySelector("#statusLine");
  const search = document.querySelector("#search");
  const filters = document.querySelector("#filters");

  // footer year
  const y = document.querySelector("#year");
  if (y) y.textContent = new Date().getFullYear();

  startParticles();

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

      pulseElement(document.querySelector(".card"));
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
        toast("Link copied ✅");
        setTimeout(() => (a.textContent = "Copy 🔗"), 900);
      } catch {
        a.textContent = "Copy failed ❌";
        toast("Copy failed ❌");
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
