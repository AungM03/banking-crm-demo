const fraudParams = new URLSearchParams(window.location.search);
const fraudAccountNumber = fraudParams.get("accountNumber");
const activeFraudRole = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";
const fraudNoteForm = document.querySelector("#fraudNoteForm");
const fraudNoteText = document.querySelector("#fraudNoteText");
const fraudNoteMessage = document.querySelector("#fraudNoteMessage");
const fraudNoteList = document.querySelector("#fraudNoteList");
let activeFraudCustomer = null;

if (fraudNoteForm) {
  fraudNoteForm.addEventListener("submit", handleFraudNoteCreate);
}

if (fraudNoteList) {
  fraudNoteList.addEventListener("click", handleFraudNoteRemove);
}

initFraudDetails();

async function initFraudDetails() {
  if (window.crmHasPermission && !window.crmHasPermission("view_fraud_detail")) {
    document.querySelector("#fraudProfile").classList.add("hidden");
    document.querySelector("#fraudNotFoundState").classList.remove("hidden");
    document.querySelector("#fraudNotFoundState p").textContent = "Detailed fraud matrix access is restricted for this role.";
    return;
  }

  const fraudCustomer = await window.crmApi.findCustomer("accountNumber", fraudAccountNumber);

  if (!fraudCustomer) {
    document.querySelector("#fraudProfile").classList.add("hidden");
    document.querySelector("#fraudNotFoundState").classList.remove("hidden");
    return;
  }

  renderFraudDetails(fraudCustomer);
}

function renderFraudDetails(customer) {
  activeFraudCustomer = {
    ...customer,
    fraudNotes: customer.fraudNotes || []
  };

  document.querySelector("#fraudNotFoundState").classList.add("hidden");
  document.querySelector("#fraudProfile").classList.remove("hidden");

  const analysis = getFraudAnalysis(activeFraudCustomer);

  document.querySelector("#backToClient").href = activeFraudRole === "admin"
    ? window.crmClientUrl(activeFraudCustomer.accountNumber)
    : window.crmUrlWithRole("index.html", activeFraudRole);
  document.querySelector("#backToClient").textContent = activeFraudRole === "admin"
    ? "Back to client profile"
    : "Back to fraud lookup";
  document.querySelector("#fraudCustomerName").textContent = activeFraudCustomer.name;
  document.querySelector("#fraudCustomerMeta").textContent = `Account ${activeFraudCustomer.accountNumber} | ${activeFraudCustomer.cif}`;
  renderFraudScore(analysis);

  document.querySelector("#fraudCases").textContent = activeFraudCustomer.fraudCases;
  document.querySelector("#frontlineNotes").textContent = activeFraudCustomer.frontlineNotes;
  document.querySelector("#lastReviewed").textContent = activeFraudCustomer.lastReviewed;

  renderAiInsights(analysis);
  renderFraudNotes(activeFraudCustomer.fraudNotes);
  renderFraudGraph(activeFraudCustomer.fraudHistory);
  renderDrivers(activeFraudCustomer.fraudDrivers);
}

function getFraudAnalysis(customer) {
  if (window.crmAnalyzeFraudSignals) {
    return window.crmAnalyzeFraudSignals(customer);
  }

  const score = Number(customer.fraudRiskScore || 0);
  return {
    baseScore: score,
    adjustedScore: score,
    scoreLift: 0,
    tier: customer.fraudRiskTier || "Medium",
    topCategory: "Rule engine unavailable",
    action: "Continue standard monitoring.",
    matches: []
  };
}

function renderFraudScore(analysis) {
  document.querySelector("#fraudDetailScore").textContent = `${analysis.adjustedScore} / 100`;
  document.querySelector("#fraudDetailTier").textContent = `${analysis.tier} Risk`;
  document.querySelector("#fraudScorePanel").className = `fraud-score-panel risk-${analysis.tier.toLowerCase()}`;
}

function renderAiInsights(analysis) {
  const liftBadge = document.querySelector("#fraudAiLift");
  const liftPrefix = analysis.scoreLift > 0 ? "+" : "";
  const liftClass = getNoteImpactClass(analysis.scoreLift, analysis.tier);

  liftBadge.textContent = `${liftPrefix}${analysis.scoreLift} note impact`;
  liftBadge.className = `status-badge ${liftClass}`;
  document.querySelector("#fraudTopCategory").textContent = analysis.topCategory;
  document.querySelector("#fraudAiAction").textContent = analysis.action;

  const list = document.querySelector("#fraudAiInsightList");
  list.innerHTML = "";

  if (!analysis.matches.length) {
    const empty = document.createElement("li");
    empty.className = "ai-insight-item empty-state";
    empty.textContent = analysis.scoreLift
      ? "No suspicious phrase family matched, but de-risking language in active Fraud Notes changed the score."
      : "No active Fraud Notes matched the phrase library. The score remains at its stored matrix value.";
    list.appendChild(empty);
    return;
  }

  analysis.matches.forEach((match) => {
    const item = document.createElement("li");
    item.className = "ai-insight-item";
    const aiBadge = match.detectedBy === "llm"
      ? ' <span class="ai-tag">AI&nbsp;detected</span>'
      : "";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(match.label)}</strong>${aiBadge}
        <span>${escapeHtml(match.category)} | ${escapeHtml(match.confidence)} confidence | +${match.scoreLift}</span>
      </div>
      <p>${escapeHtml(match.why)}</p>
      <small>Matched "${escapeHtml(match.matchedPhrase)}" from ${escapeHtml(match.sourceLabel)}.</small>
    `;
    list.appendChild(item);
  });
}

function renderFraudNotes(notes) {
  document.querySelector("#fraudNoteCount").textContent = `${notes.length} active`;
  fraudNoteList.innerHTML = "";

  if (!notes.length) {
    const empty = document.createElement("section");
    empty.className = "note-item empty-state";
    empty.textContent = "No Fraud Notes are active. Add an observation to let the rule engine update the score.";
    fraudNoteList.appendChild(empty);
    return;
  }

  notes.forEach((note) => {
    const matches = window.crmAnalyzeFraudText ? window.crmAnalyzeFraudText(note.text) : [];
    const item = document.createElement("section");
    item.className = "note-item fraud-note-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(note.author)}</strong>
        <span>${escapeHtml(note.date)}</span>
      </div>
      <p>${escapeHtml(note.text)}</p>
      ${matches.length ? `
        <div class="fraud-tag-row">
          <span>Score phrases</span>
          ${matches.slice(0, 3).map((match) => `<strong class="fraud-tag">${escapeHtml(match.label)} +${match.scoreLift}</strong>`).join("")}
        </div>
      ` : ""}
      ${canRemoveFraudNote(note) ? `
        <div class="table-actions">
          <button class="danger-button compact-button" type="button" data-remove-fraud-note data-note-db-id="${note.dbId || ""}" data-note-local-id="${note.localId || ""}">Remove</button>
        </div>
      ` : ""}
    `;
    fraudNoteList.appendChild(item);
  });
}

async function handleFraudNoteCreate(event) {
  event.preventDefault();

  if (!activeFraudCustomer || !canManageFraudNotes()) {
    showFraudNoteMessage("This role cannot add Fraud Notes.", "error");
    return;
  }

  const text = fraudNoteText.value.trim();

  if (!text) {
    showFraudNoteMessage("Add a Fraud Note before saving.", "error");
    return;
  }

  if (text.length > 500) {
    showFraudNoteMessage("Fraud Notes must be 500 characters or fewer.", "error");
    return;
  }

  setFraudNoteSubmitting(true);
  showFraudNoteMessage("Saving Fraud Note and recalculating score...", "info");

  try {
    const result = await window.crmApi.createFraudNote({
      accountNumber: activeFraudCustomer.accountNumber,
      text
    });
    fraudNoteText.value = "";
    renderFraudDetails(result.customer || {
      ...activeFraudCustomer,
      fraudNotes: [result.record].concat(activeFraudCustomer.fraudNotes || [])
    });
    showFraudNoteMessage(result.message || "Fraud Note saved.", "success");
  } catch (error) {
    showFraudNoteMessage(error.message || "Fraud Note could not be saved.", "error");
  } finally {
    setFraudNoteSubmitting(false);
  }
}

async function handleFraudNoteRemove(event) {
  const removeButton = event.target.closest("[data-remove-fraud-note]");

  if (!removeButton || !activeFraudCustomer || !canManageFraudNotes()) {
    return;
  }

  const dbId = removeButton.dataset.noteDbId ? Number(removeButton.dataset.noteDbId) : null;
  const localId = removeButton.dataset.noteLocalId || "";
  const note = activeFraudCustomer.fraudNotes.find((item) => {
    return (localId && item.localId === localId) || (dbId && item.dbId === dbId);
  });

  if (!note) {
    showFraudNoteMessage("Fraud Note could not be found.", "error");
    return;
  }

  removeButton.disabled = true;
  removeButton.textContent = "Removing...";

  try {
    const result = await window.crmApi.deleteFraudNote(note);
    renderFraudDetails(result.customer || {
      ...activeFraudCustomer,
      fraudNotes: activeFraudCustomer.fraudNotes.filter((item) => item !== note)
    });
    showFraudNoteMessage(result.message || "Fraud Note removed.", "success");
  } catch (error) {
    removeButton.disabled = false;
    removeButton.textContent = "Remove";
    showFraudNoteMessage(error.message || "Fraud Note could not be removed.", "error");
  }
}

function renderFraudGraph(history) {
  const graph = document.querySelector("#fraudGraph");
  graph.innerHTML = "";

  history.forEach((item) => {
    const row = document.createElement("div");
    const width = Math.max(item.impact, 4);

    row.className = "fraud-bar-row";
    row.innerHTML = `
      <div class="fraud-bar-label">
        <strong>${escapeHtml(item.type)}</strong>
        <span>${item.count} event${item.count === 1 ? "" : "s"} | ${item.impact} impact pts</span>
      </div>
      <div class="fraud-bar-track">
        <span class="fraud-bar-fill" style="width: ${width}%"></span>
      </div>
    `;

    graph.appendChild(row);
  });
}

function renderDrivers(drivers) {
  const list = document.querySelector("#fraudDriverList");
  list.innerHTML = "";

  drivers.forEach((driver) => {
    const item = document.createElement("li");
    item.textContent = driver;
    list.appendChild(item);
  });
}

function canManageFraudNotes() {
  return !window.crmHasPermission || window.crmHasPermission("manage_fraud_notes");
}

function canRemoveFraudNote(note) {
  if (!canManageFraudNotes() || !note) {
    return false;
  }

  const user = window.crmGetActiveUser ? window.crmGetActiveUser() : null;
  const role = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";
  const profile = window.crmRoleProfiles ? window.crmRoleProfiles[role] : null;
  const activeAuthor = user?.name || profile?.name || "Fraud Team";

  return note.author === activeAuthor;
}

function getNoteImpactClass(scoreLift, tier) {
  if (scoreLift < 0) return "status-low";
  if (scoreLift === 0) return "status-open";
  return `status-${tier.toLowerCase()}`;
}

function showFraudNoteMessage(message, type) {
  if (!fraudNoteMessage) {
    return;
  }

  fraudNoteMessage.textContent = message;
  fraudNoteMessage.className = `form-message ${type}`;
  fraudNoteMessage.classList.remove("hidden");
}

function setFraudNoteSubmitting(isSubmitting) {
  const button = fraudNoteForm.querySelector("button[type='submit']");

  if (button) {
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? "Saving..." : "Add";
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
