// ====== CONFIG (edit these) ======
const N8N_WEBHOOK_URL = "https://YOUR-N8N-DOMAIN/webhook/idea-intake?key=YOUR_LONG_SECRET";
const INTAKE_BOARD_URL = "../board/"; // public board
// =================================

const form = document.getElementById("intakeForm");
const statusBox = document.getElementById("statusBox");
const submitBtn = document.getElementById("submitBtn");
const boardLink = document.getElementById("boardLink");
const fxLayer = document.getElementById("fxLayer");
const meterRow = document.getElementById("meterRow");

boardLink.href = INTAKE_BOARD_URL;

const startedAt = Date.now();

function showStatus(kind, html){
  statusBox.className = `statusBox show ${kind}`;
  statusBox.innerHTML = html;
}

function disableForm(disabled){
  submitBtn.disabled = disabled;
  submitBtn.classList.toggle("loading", disabled);
  [...form.elements].forEach(el => {
    if (el.id === "company") return; // honeypot can stay
    el.disabled = disabled;
  });
}

function clean(s){ return String(s || "").trim(); }

function prefersReducedMotion(){
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ===== Background particles (idea incubator) ===== */
function rand(min, max){ return Math.random() * (max - min) + min; }

function spawnParticles(){
  if (!fxLayer || prefersReducedMotion()) return;

  const emojis = ["💡","🧬","⚙️","🧠","✍️","✨","🧪"];
  const count = Math.min(26, Math.max(14, Math.floor(window.innerWidth / 65)));

  fxLayer.innerHTML = "";
  for (let i=0;i<count;i++){ 
    const el = document.createElement("span");
    el.className = "fxParticle";
    el.textContent = emojis[Math.floor(Math.random()*emojis.length)];

    const x = rand(6, 94).toFixed(2) + "vw";
    const y = rand(8, 92).toFixed(2) + "vh";
    const s = rand(14, 26).toFixed(0) + "px";
    const o = rand(0.10, 0.22).toFixed(2);
    const b = rand(0, 1.8).toFixed(1) + "px";
    const d = rand(6.5, 13.5).toFixed(1) + "s";
    const dx = rand(10, 42).toFixed(0) + "px";
    const dy = rand(10, 42).toFixed(0) + "px";

    el.style.setProperty("--x", x);
    el.style.setProperty("--y", y);
    el.style.setProperty("--s", s);
    el.style.setProperty("--o", o);
    el.style.setProperty("--b", b);
    el.style.setProperty("--d", d);
    el.style.setProperty("--dx", dx);
    el.style.setProperty("--dy", dy);

    fxLayer.appendChild(el);
  }
}

window.addEventListener("resize", () => {
  clearTimeout(window.__fxResize);
  window.__fxResize = setTimeout(spawnParticles, 140);
});
spawnParticles();

/* ===== Micro FX helpers ===== */
function burstAt(x, y, opts = {}){
  if (prefersReducedMotion()) return;
  const {
    count = 10,
    spread = 26,
    emojis = ["✨","🧬","💡","🧪","⚙️"]
  } = opts;

  for (let i=0;i<count;i++) {
    const p = document.createElement("span");
    p.className = "fxParticle";
    p.textContent = emojis[Math.floor(Math.random()*emojis.length)];

    // Position in px
    const px = x + rand(-spread, spread);
    const py = y + rand(-spread, spread);

    p.style.setProperty("--x", px + "px");
    p.style.setProperty("--y", py + "px");
    p.style.setProperty("--s", rand(16, 24).toFixed(0) + "px");
    p.style.setProperty("--o", rand(0.18, 0.32).toFixed(2));
    p.style.setProperty("--b", rand(0, 1.2).toFixed(1) + "px");
    p.style.setProperty("--d", rand(0.9, 1.6).toFixed(1) + "s");
    p.style.setProperty("--dx", rand(20, 70).toFixed(0) + "px");
    p.style.setProperty("--dy", rand(20, 70).toFixed(0) + "px");

    fxLayer?.appendChild(p);
    setTimeout(() => p.remove(), 1600);
  }
}

function rippleAt(x, y){
  if (prefersReducedMotion()) return;
  const r = document.createElement("div");
  r.className = "ripple";
  r.style.left = x + "px";
  r.style.top = y + "px";
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 650);
}

function pulseSubmittedPill(){
  const pill = meterRow?.querySelector(".pill");
  if (!pill) return;
  pill.classList.remove("pulse");
  // force reflow
  void pill.offsetWidth;
  pill.classList.add("pulse");
}

/* ===== Board link animation ===== */
boardLink?.addEventListener("click", (e) => {
  const href = boardLink.getAttribute("href");
  if (!href) return;
  e.preventDefault();

  const rect = boardLink.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;

  rippleAt(cx, cy);
  burstAt(cx, cy, { count: 8, emojis: ["🛰️","✨","🧬","💡"] });

  setTimeout(() => {
    window.location.href = href;
  }, prefersReducedMotion() ? 0 : 420);
});

/* ===== Submit handler ===== */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Quick click reaction (only if human interaction is real)
  const btnRect = submitBtn.getBoundingClientRect();
  const bx = btnRect.left + btnRect.width/2;
  const by = btnRect.top + btnRect.height/2;

  submitBtn.classList.remove("success","fail");
  submitBtn.classList.add("reacting");
  setTimeout(() => submitBtn.classList.remove("reacting"), 560);

  // Honeypot trap
  const hp = clean(document.getElementById("company").value);
  if (hp) return; // silently drop bots

  // Basic time-on-page check (bots submit instantly)
  const secondsHere = (Date.now() - startedAt) / 1000;
  if (secondsHere < 1.2) {
    showStatus("bad", "❌ That was…fast. Try again in a second.");
    burstAt(bx, by, { count: 8, emojis: ["⚠️","🕳️","👀","✨"] });
    submitBtn.classList.add("fail");
    return;
  }

  // Required fields
  const title = clean(form.title.value);
  const category = clean(form.category.value);
  const problem = clean(form.problem.value);
  const ok = document.getElementById("ok").checked;

  if (!title || !category || !problem || !ok){
    showStatus("bad", "⚠️ Please fill the required fields and check the agreement box.");
    burstAt(bx, by, { count: 8, emojis: ["⚠️","🧠","✍️","✨"] });
    submitBtn.classList.add("fail");
    return;
  }

  const payload = {
    title,
    category,
    problem,
    features: clean(form.features.value),
    audience: clean(form.audience.value),
    contact: clean(form.contact.value),
    source: "elevai-labs-submit",
    userAgent: navigator.userAgent,
    page: location.href
  };

  try{
    disableForm(true);
    showStatus("ok", "Submitting… 🧪");
    burstAt(bx, by, { count: 10, emojis: ["🧪","✨","🧬","💡","⚙️"] });

    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });

    let data = {};
    try { data = await res.json(); } catch (e) { data = {}; }

    if (!res.ok) {
      const reason = data.reason || data.message || `HTTP ${res.status}`;
      throw new Error(reason);
    }


    // If your n8n returns issueUrl / issueNumber, we’ll show it
    const issueUrl = data.issueUrl || data.url || "";
    const ticket = issueUrl
      ? `Tracking link: <a href="${issueUrl}" target="_blank" rel="noopener">view ticket</a>`
      : `Track progress on the public idea board.`;

    showStatus("ok", `
      ✅ Submitted!<br/>
      <span class="muted">${ticket}</span><br/><br/>
      <a href="${INTAKE_BOARD_URL}" target="_blank" rel="noopener">Open idea board →</a>
    `);

    submitBtn.classList.add("success");
    pulseSubmittedPill();
    burstAt(bx, by - 6, { count: 14, emojis: ["✅","✨","🧬","💡"] });

    form.reset();
  } catch(err){
    console.error(err);
    showStatus("bad", `❌ Couldn’t submit right now.<br/><span class="muted">${(err && err.message) ? err.message : "Please try again in a minute."}</span>`);
    submitBtn.classList.add("fail");
    burstAt(bx, by, { count: 12, emojis: ["❌","⚠️","🧯","✨"] });
  } finally{
    disableForm(false);
    // keep success/fail color for a beat
    setTimeout(() => submitBtn.classList.remove("success","fail"), 1400);
  }
});
