// ElevAI Labs — planet upgrade (no frameworks, no build step)

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

// ---- 1) Molecules data (EDIT THIS) ----
// Tip: link is the full URL or relative path to your app
// status: "live" | "wip"
const MOLECULES = [
  {
    title: "Snack → Workout Converter",
    category: "Fitness",
    status: "live",
    description: "Convert snack calories into equivalent workouts.",
    link: "./molecules/snack-workout-converter/",
  },
  {
    title: "Shower Thought Generator",
    category: "Mindset",
    status: "wip",
    description: "Random thoughts that range from funny to philosophical.",
    link: "./molecules/shower-thought-generator/",
  },
];

// ---- 2) UI state ----
const state = {
  q: "",
  category: "All",
};

const grid = document.getElementById("grid");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");
const chipRow = document.getElementById("chipRow");
const countLabel = document.getElementById("countLabel");
const randomBtn = document.getElementById("randomMolecule");

// ---- 3) Category chips ----
function getCategories(items) {
  const set = new Set(items.map(m => m.category).filter(Boolean));
  return ["All", ...Array.from(set).sort((a,b)=>a.localeCompare(b))];
}

function renderChips() {
  const cats = getCategories(MOLECULES);
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

// ---- 4) Card renderer ----
function badge(status) {
  const s = (status || "").toLowerCase();
  const label = s || "live";
  return `<span class="status" data-status="${escapeHtml(label)}">${escapeHtml(label.toUpperCase())}</span>`;
}

function canLaunch(m) {
  return (m.status || "").toLowerCase() === "live" && !!m.link;
}

function cardHTML(m) {
  const launchDisabled = canLaunch(m) ? "" : "disabled";
  const launchText = canLaunch(m) ? "Launch 🚀" : "Launch ⏳";
  const urlToCopy = m.link || "";

  return `
  <article class="card" data-title="${escapeHtml(m.title)}" data-cat="${escapeHtml(m.category)}">
    <div class="card-inner">
      <div class="kicker">
        <div class="cat">${escapeHtml(m.category || "Unsorted")}</div>
        ${badge(m.status)}
      </div>

      <h3 class="title">${escapeHtml(m.title)}</h3>
      <p class="desc">${escapeHtml(m.description || "")}</p>

      <div class="actions">
        ${
          canLaunch(m)
            ? `<a class="action link" href="${escapeHtml(m.link)}">Launch 🚀</a>`
            : `<button class="action ${launchDisabled}" type="button" disabled>${launchText}</button>`
        }
        <button class="action" type="button" data-copy="${escapeHtml(urlToCopy)}">Copy 🔗</button>
      </div>
    </div>
  </article>
  `;
}

function filtered() {
  const q = state.q.trim().toLowerCase();
  return MOLECULES.filter(m => {
    const inCat = state.category === "All" || (m.category || "") === state.category;
    const text = `${m.title} ${m.description} ${m.category}`.toLowerCase();
    const inSearch = !q || text.includes(q);
    return inCat && inSearch;
  });
}

function renderGrid() {
  const items = filtered();
  grid.innerHTML = items.map(cardHTML).join("");
  countLabel.textContent = `${items.length} molecule${items.length === 1 ? "" : "s"} loaded 🧬`;

  // Copy handlers
  grid.querySelectorAll("[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const val = btn.getAttribute("data-copy") || "";
      if (!val) {
        toast("No link set for this molecule yet 🧪");
        return;
      }
      try {
        await navigator.clipboard.writeText(new URL(val, location.href).toString());
        toast("Copied. Go cause problems (productive ones) ✅");
      } catch {
        toast("Copy failed. Blame the browser gremlins 🧟");
      }
    });
  });

  // Tilt + glow tracking
  grid.querySelectorAll(".card").forEach(card => {
    const inner = card.querySelector(".card-inner");
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
        inner.style.transform = `translateZ(0px)`;
        card.style.borderColor = "rgba(106,215,255,.22)";
      });
    }

    function onLeave() {
      if (raf) cancelAnimationFrame(raf);
      card.style.transform = "";
      card.style.borderColor = "rgba(255,255,255,.10)";
      card.style.removeProperty("--mx");
      card.style.removeProperty("--my");
    }

    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
  });
}

// ---- 5) Search wiring ----
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

// ---- 6) Random molecule ----
randomBtn.addEventListener("click", () => {
  const items = filtered().filter(canLaunch);
  if (!items.length) {
    toast("No launchable molecules in this filter 🧬");
    return;
  }
  const pick = items[Math.floor(Math.random() * items.length)];
  toast(`Warping to: ${pick.title} 🌀`);
  setTimeout(() => (location.href = pick.link), 450);
});

// ---- 7) Ambient background canvas (particles) ----
(function bg() {
  const c = document.getElementById("bg");
  const ctx = c.getContext("2d");
  let w = 0, h = 0, dpr = 1;

  const particles = [];
  const N = 70;

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
        r: rnd(1.2, 3.2) * dpr,
        vx: rnd(-.18,.18) * dpr,
        vy: rnd(-.10,.10) * dpr,
        a: rnd(.10,.35)
      });
    }
  }

  let t = 0;
  function tick() {
    t += 0.006;

    ctx.clearRect(0,0,w,h);

    // drifting gradient fog
    const gx = (Math.sin(t*0.9)*0.18 + 0.5) * w;
    const gy = (Math.cos(t*0.7)*0.18 + 0.5) * h;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w,h)*0.7);
    g.addColorStop(0, "rgba(106,215,255,0.12)");
    g.addColorStop(0.45, "rgba(167,139,250,0.09)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    // particles
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      // wrap
      if (p.x < -30) p.x = w + 30;
      if (p.x > w + 30) p.x = -30;
      if (p.y < -30) p.y = h + 30;
      if (p.y > h + 30) p.y = -30;

      ctx.beginPath();
      ctx.fillStyle = `rgba(233,238,252,${p.a})`;
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

// ---- boot ----
renderChips();
renderGrid();
