// ===== CONFIG =====
// This reads your queue data from GitHub Issues behind the scenes.
// Nothing in the UI mentions GitHub or links to it.
const OWNER = "elevaistrategies";
const REPO = "lab-intake";
const MAX_ITEMS = 60;
// ==================

const statusOrder = ["submitted","reviewing","accepted","building","beta","shipped","declined"];

// Status styling + emoji system (matches your GitHub label colors)
const statusMeta = {
  submitted: { label: "Submitted",  color: "#c5def5", emoji: "❄️" },
  reviewing: { label: "Reviewing",  color: "#0052cc", emoji: "🧪" },
  accepted:  { label: "Accepted",   color: "#8b5cf6", emoji: "🧬" },
  building:  { label: "Building",   color: "#fbca04", emoji: "☢️" },
  beta:      { label: "Beta",       color: "#f97316", emoji: "🧫" },
  shipped:   { label: "Shipped",    color: "#0e8a16", emoji: "🚀" },
  declined:  { label: "Declined",   color: "#b60205", emoji: "🛑" },
};

function metaForStatus(s){
  return statusMeta[s] || { label: (s||"").toString(), color: "#7dd3fc", emoji: "🧷" };
}

function pickStatus(labels){
  const s = labels.find(l => l.startsWith("status:"));
  return s ? s.replace("status:","") : "submitted";
}
function pickCategory(labels){
  const c = labels.find(l => l.startsWith("cat:"));
  return c ? c.replace("cat:","") : "Other";
}
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

async function fetchIssues(){
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=all&per_page=100`;
  const res = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
  if(!res.ok) throw new Error(`Failed to load board (${res.status})`);
  const items = await res.json();

  // filter out PRs + keep only idea issues
  return items
    .filter(x => !x.pull_request)
    .filter(x => (x.labels || []).some(l => (l.name || l).toString() === "idea"))
    .map(x => {
      const labels = (x.labels || []).map(l => (l.name || l).toString());
      return {
        title: x.title.replace(/^Idea:\s*/i,"").trim() || x.title,
        body: (x.body || "").trim(),
        created: x.created_at,
        updated: x.updated_at,
        status: pickStatus(labels),
        category: pickCategory(labels)
      };
    });
}

function summarize(text){
  if(!text) return "";
  const cleaned = text.replace(/\r/g,"").trim();
  const firstLine = cleaned.split("\n").find(l => l.trim()) || "";
  return firstLine.length > 140 ? firstLine.slice(0,140) + "…" : firstLine;
}

function renderCounts(items){
  const counts = {};
  statusOrder.forEach(s => counts[s]=0);
  items.forEach(i => counts[i.status] = (counts[i.status]||0)+1);

  const el = document.getElementById("counts");
  el.innerHTML = statusOrder.map(s => {
    const meta = metaForStatus(s);

    // ✅ Emoji AFTER the word (COUNT • Label • Emoji)
    return `<span class="chip chip--${s}" style="--chip:${meta.color}">
      <strong>${counts[s]||0}</strong> ${escapeHtml(meta.label)} ${escapeHtml(meta.emoji)}
    </span>`;
  }).join("");
}

function renderList(items, q, status){
  const list = document.getElementById("list");
  const query = (q||"").toLowerCase().trim();

  const filtered = items
    .filter(i => status === "all" ? true : i.status === status)
    .filter(i => !query ? true : `${i.title} ${i.body} ${i.category}`.toLowerCase().includes(query))
    .slice(0, MAX_ITEMS);

  if(!filtered.length){
    list.innerHTML = `<div class="empty">No ideas match that filter. Try a different status or search.</div>`;
    return;
  }

  list.innerHTML = filtered.map(i => {
      const meta = metaForStatus(i.status);
      const idx = Math.max(0, statusOrder.indexOf(i.status));
      const pct = Math.round((idx / (statusOrder.length - 1)) * 100);

      return `
      <div class="card status-${escapeHtml(i.status)}" style="--glow:${meta.color}">
        <div class="top">
          <span class="tag">${escapeHtml(i.category)}</span>
          <span class="status status--${escapeHtml(i.status)}" style="--st:${meta.color}">
            ${escapeHtml(meta.emoji)} ${escapeHtml(i.status.toUpperCase())}
          </span>
        </div>

        <h3>${escapeHtml(i.title)}</h3>
        <p>${escapeHtml(summarize(i.body) || "No description provided.")}</p>

        <div class="prog" aria-hidden="true" title="${escapeHtml(meta.label)}">
          <span style="width:${pct}%; background:${meta.color}"></span>
        </div>
      </div>
    `;
  }).join("");
}

(async function init(){
  const foot = document.getElementById("footnote");
  const search = document.getElementById("search");
  const statusSel = document.getElementById("status");

  try{
    foot.textContent = "Loading…";
    const items = await fetchIssues();

    // sort: most recently updated first
    items.sort((a,b) => new Date(b.updated) - new Date(a.updated));

    renderCounts(items);
    renderList(items, "", "all");
    foot.textContent = `Showing up to ${MAX_ITEMS} ideas. Updated automatically.`;

    function rerender(){
      renderList(items, search.value, statusSel.value);
    }
    search.addEventListener("input", rerender);
    statusSel.addEventListener("change", rerender);

  } catch(err){
    console.error(err);
    foot.textContent = "Couldn’t load the idea board right now.";
    document.getElementById("list").innerHTML =
      `<div class="empty">Error loading board. Please try again later.</div>`;
  }
})();
