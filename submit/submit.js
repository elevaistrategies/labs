// ====== CONFIG (edit these) ======
const N8N_WEBHOOK_URL = "https://YOUR-N8N-DOMAIN/webhook/idea-intake?key=YOUR_LONG_SECRET";
const INTAKE_BOARD_URL = "https://github.com/elevaistrategies/lab-intake/issues"; // public board
// =================================

const form = document.getElementById("intakeForm");
const statusBox = document.getElementById("statusBox");
const submitBtn = document.getElementById("submitBtn");
const boardLink = document.getElementById("boardLink");

boardLink.href = INTAKE_BOARD_URL;

const startedAt = Date.now();

function showStatus(kind, html){
  statusBox.className = `statusBox show ${kind}`;
  statusBox.innerHTML = html;
}

function disableForm(disabled){
  submitBtn.disabled = disabled;
  [...form.elements].forEach(el => {
    if (el.id === "company") return; // honeypot can stay
    el.disabled = disabled;
  });
}

function clean(s){ return String(s || "").trim(); }

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Honeypot trap
  const hp = clean(document.getElementById("company").value);
  if (hp) return; // silently drop bots

  // Basic time-on-page check (bots submit instantly)
  const secondsHere = (Date.now() - startedAt) / 1000;
  if (secondsHere < 1.2) {
    showStatus("bad", "❌ That was…fast. Try again in a second.");
    return;
  }

  // Required fields
  const title = clean(form.title.value);
  const category = clean(form.category.value);
  const problem = clean(form.problem.value);
  const ok = document.getElementById("ok").checked;

  if (!title || !category || !problem || !ok){
    showStatus("bad", "⚠️ Please fill the required fields and check the agreement box.");
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

    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json().catch(() => ({}));

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

    form.reset();
  } catch(err){
    console.error(err);
    showStatus("bad", "❌ Couldn’t submit right now. Try again in a minute.");
  } finally{
    disableForm(false);
  }
});
