// ElevAI Labs — JSON-powered molecules renderer (no frameworks, no build step)

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove("show"), 1100);
}

function badge(status) {
  const s = String(status || "").toLowerCase().trim() || "live";
  return `<span class="status" data-status="${escapeHtml(s)}">${escapeHtml(s.toUpperCase())}</span>`;
}

function canLaunch(m) {
  const live = String(m.status || "").toLowerCase().trim() === "live";
  const url = String(m.url || "").trim();
  return live && url && url !== "#";
}

function getCategories(items) {
  const set = new Set(items.map(m => m.category).filter(Boolean));
  return ["All", ...Array.from(set).sort((a,b)=>a.localeCompare(b))];
}

// ---- DOM ----
const grid = document.getElementById("grid");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");
const chipRow = document.getElementById("chipRow");
const countLabel = document.getElementById("countLabel");
const randomBtn = document.getElementById("randomMolecule");

// ---- State ----
const state = {
  q: "",
  category: "All",
  molecules: []
};

// ---- Render chips ----
function renderChips() {
  const cats = getCategories(state.molecules);
  chipRow.innerHTML = cats.map(c => {
    const active = c === state.category ? "active" : "";
    return `<button class="chip ${active}" data-cat="${escapeHtml(c)}" type="button">${escapeHtml(c)}</button>`;
  }).join("");

  chipRow.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      state.category = btn.dataset.cat;
      renderChips();
      renderGrid();
    });
  });
}

// ---- Card renderer ----
function cardHTML(m) {
  const title = m.name || "Untitled Molecule";
  const cat = m.category || "Unsorted";
  const desc = m.description || "";
  const url = String(m.url || "").trim();

  return `
  <article class="card" data-title="${escapeHtml(title)}" data-cat="${escapeHtml(cat)}">
    <div class="card-inner">
      <div class="kicker">
        <div class="cat">${escapeHtml(cat)}</div>
        ${badge(m.status)}
      </div>

      <h3 class="title">${escapeHtml(title)}</h3>
      <p class="desc">${escapeHtml(desc)}</p>

      <div class="actions">
        ${
          canLaunch(m)
            ? `<a class="action link" href="${escapeHtml(url)}" target="_blank" rel="noopener">Launch 🚀</a>`
            : `<button class="action disabled" type="button" disabled>Launch ⏳</button>`
        }
        <button class="action" type="button" data-copy="${escapeHtml(url)}">Copy 🔗</button>
      </div>
    </div>
  </article>
  `;
}

function filtered() {
  const q = state.q.trim().toLowerCase();
  return state.molecules.filter(m => {
    const inCat = state.category === "All" || (m.category || "") === state.category;
    const text = `${m.name || ""} ${m.description || ""} ${m.category || ""}`.toLowerCase();
    const inSearch = !q || text.includes(q);
    return inCat && inSearch;
  });
}

function enableCardTilt() {
  grid.querySelectorAll(".card").forEach(card => {
    let raf = null;

    function onMove(e) {
      const r = card.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;

      card.style.setProperty("--mx", `${mx}%`);
      card.style.setProperty("--my", `${my}%`);

      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;

      const rx = (-dy * 8).toFixed(2);
      const ry = (dx * 10).toFixed(2);

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

function renderGrid() {
  const items = filtered();
  grid.innerHTML = items.map(cardHTML).join("");
  countLabel.textContent = `${items.length} molecule${items.length === 1 ? "" : "s"} loaded 🧬`;

  grid.querySelectorAll("[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const val = btn.getAttribute("data-copy") || "";
      if (!val || val === "#") {
        toast("No link set for this molecule yet 🧪");
        return;
      }
      try {
        await navigator.clipboard.writeText(val);
        toast("Copied ✅");
      } catch {
        toast("Copy failed. Browser gremlins won this round 🧟");
      }
    });
  });

  enableCardTilt();
}

// ---- Search wiring ----
searchInput.addEventListener("input", (e) => {
  state.q = e.target.value || "";
  renderGrid();
});

clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  state.q = "";
  searchInput.focus();
  renderGrid();
});

// ---- Random molecule ----
randomBtn.addEventListener("click", () => {
  const items = filtered().filter(canLaunch);
  if (!items.length) {
    toast("No launchable molecules in this filter 🧬");
    return;
  }
  const pick = items[Math.floor(Math.random() * items.length)];
  toast(`Warping to: ${pick.name} 🌀`);
  setTimeout(() => window.open(pick.url, "_blank", "noopener"), 380);
});

// ---- Ambient background canvas (particles) ----
(function bg() {
  const c = document.getElementById("bg");
  const ctx = c.getContext("2d");
  let w = 0, h = 0, dpr = 1;

  const particles = [];
  const N = 85;

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = c.width = Math.floor(innerWidth * dpr);
    h = c.height = Math.floor(innerHeight * dpr);
    c.style.width = innerWidth + "px";
    c.style.height = innerHeight + "px";
  }

  function rnd(a,b){return a + Math.random()*(b-a);}

  function init() {
    particles.length = 0;
    for (let i=0;i<N;i++){
      particles.push({
        x: rnd(0,w),
        y: rnd(0,h),
        r: rnd(1.0, 3.2) * dpr,
        vx: rnd(-.16,.16) * dpr,
        vy: rnd(-.10,.10) * dpr,
        a: rnd(.08,.30),
        hue: rnd(180, 330) // color spread
      });
    }
  }

  let t = 0;
  function tick() {
    t += 0.006;
    ctx.clearRect(0,0,w,h);

    // drifting gradient fog — now more colorful
    const gx = (Math.sin(t*0.9)*0.18 + 0.5) * w;
    const gy = (Math.cos(t*0.7)*0.18 + 0.5) * h;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w,h)*0.7);
    g.addColorStop(0, "rgba(106,215,255,0.10)");
    g.addColorStop(0.35, "rgba(255,91,214,0.06)");
    g.addColorStop(0.62, "rgba(251,191,36,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    // particles
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -30) p.x = w + 30;
      if (p.x > w + 30) p.x = -30;
      if (p.y < -30) p.y = h + 30;
      if (p.y > h + 30) p.y = -30;

      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 90%, 80%, ${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", () => { resize(); init(); });
  resize();
  init();
  tick();
})();

// ---- Load molecules.json ----
async function loadMolecules() {
  try {
    countLabel.textContent = "Loading molecules… 🧬";
    const res = await fetch("./molecules.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`molecules.json HTTP ${res.status}`);
    const data = await res.json();
    state.molecules = Array.isArray(data) ? data : [];
    renderChips();
    renderGrid();
  } catch (err) {
    console.error(err);
    countLabel.textContent = "Failed to load molecules.json ⚠️";
    toast("Couldn’t load molecules.json");
  }
}

loadMolecules();
