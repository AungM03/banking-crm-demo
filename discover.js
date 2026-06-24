const discoverParams = new URLSearchParams(window.location.search);
const discoverAccountNumber = discoverParams.get("accountNumber");
const activeDiscoverRole = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";

initDiscoverNeeds();

async function initDiscoverNeeds() {
  if (window.crmHasPermission && !window.crmHasPermission("view_discover_needs")) {
    document.querySelector("#discoverProfile").classList.add("hidden");
    document.querySelector("#discoverNotFoundState").classList.remove("hidden");
    document.querySelector("#discoverNotFoundState p").textContent = "Discover Needs is restricted for this role.";
    return;
  }

  const discoverCustomer = await window.crmApi.findCustomer("accountNumber", discoverAccountNumber);

  if (!discoverCustomer) {
    document.querySelector("#discoverProfile").classList.add("hidden");
    document.querySelector("#discoverNotFoundState").classList.remove("hidden");
    return;
  }

  const recommendationAnalysis = await window.crmApi.getRecommendations(discoverCustomer.accountNumber);

  renderDiscoverNeeds(discoverCustomer, recommendationAnalysis);
}

function renderDiscoverNeeds(customer, recommendationAnalysis = null) {
  const recommendations = recommendationAnalysis && recommendationAnalysis.recommendations
    ? recommendationAnalysis.recommendations
    : customer.discoverNeeds;
  const nextBestAction = recommendationAnalysis && recommendationAnalysis.nextBestAction
    ? {
        ...recommendationAnalysis.nextBestAction,
        banker: customer.personalBanker,
        due: customer.nextBestAction && customer.nextBestAction.due ? customer.nextBestAction.due : "Next outreach"
      }
    : customer.nextBestAction;

  document.querySelector("#discoverNotFoundState").classList.add("hidden");
  document.querySelector("#discoverProfile").classList.remove("hidden");

  document.querySelector("#backToClient").href = window.crmClientUrl(customer.accountNumber);
  document.querySelector("#discoverCustomerName").textContent = customer.name;
  document.querySelector("#discoverCustomerMeta").textContent = `Account ${customer.accountNumber} | ${customer.cif}`;
  document.querySelector("#recommendationCount").textContent = recommendations.length;
  document.querySelector("#discoverHouseholdBalance").textContent = window.crmFormatCurrency(customer.household);
  document.querySelector("#discoverInvestedBalance").textContent = window.crmFormatCurrency(customer.investedBalance);
  document.querySelector("#discoverAffluencyTier").textContent = `${customer.affluencyTier} of 3`;
  document.querySelector("#discoverPersonalBanker").textContent = customer.personalBanker;

  renderNextBestAction(nextBestAction);
  renderRecommendations(recommendations);
}

function renderNextBestAction(action) {
  if (!action) {
    document.querySelector("#discoverActionPriority").textContent = "No Priority";
    document.querySelector("#discoverActionTitle").textContent = "No recommendation available";
    document.querySelector("#discoverActionReason").textContent = "The CRM does not have enough information to recommend an action yet.";
    document.querySelector("#discoverActionBanker").textContent = "Banker";
    document.querySelector("#discoverActionDue").textContent = "Review later";
    return;
  }

  document.querySelector("#discoverActionPriority").textContent = `${action.priority} Priority`;
  document.querySelector("#discoverActionPriority").className = `priority-pill priority-${action.priority.toLowerCase()}`;
  document.querySelector("#discoverActionTitle").textContent = action.title || action.product;
  document.querySelector("#discoverActionReason").textContent = action.reason;
  document.querySelector("#discoverActionBanker").textContent = action.banker;
  document.querySelector("#discoverActionDue").textContent = action.due;
}

function renderRecommendations(needs) {
  const list = document.querySelector("#recommendationList");
  list.innerHTML = "";

  needs.forEach((need) => {
    const card = document.createElement("section");
    card.className = `recommendation-card priority-${need.priority.toLowerCase()}`;
    const hasMlScore = need.mlScore !== null && need.mlScore !== undefined;
    const scoreMarkup = need.score !== undefined ? `
      <div class="ai-score-grid recommendation-score-grid">
        <section>
          <span>Final score</span>
          <strong>${escapeHtml(need.score)} / 100</strong>
        </section>
        <section>
          <span>Rules</span>
          <strong>${escapeHtml(need.ruleScore !== undefined ? need.ruleScore : need.score)} / 100</strong>
        </section>
        <section>
          <span>ML model</span>
          <strong>${hasMlScore ? `${escapeHtml(need.mlScore)} / 100` : "N/A"}</strong>
        </section>
      </div>
    ` : "";
    const modelMarkup = hasMlScore ? `
      <p class="ml-explanation">${escapeHtml(need.scoringMethod)} - ${escapeHtml(need.mlExplanation)}</p>
      ${renderTopFactors(need.topFactors)}
    ` : "";

    card.innerHTML = `
      <div class="recommendation-header">
        <div>
          <span>${escapeHtml(need.priority)} Priority</span>
          <h3>${escapeHtml(need.product)}</h3>
        </div>
        <strong>${escapeHtml(need.status)}</strong>
      </div>
      <p>${escapeHtml(need.reason)}</p>
      ${scoreMarkup}
      ${modelMarkup}
      <div class="next-action">
        <span>Next action</span>
        <strong>${escapeHtml(need.nextAction)}</strong>
      </div>
    `;
    list.appendChild(card);
  });
}

function renderTopFactors(factors) {
  if (!Array.isArray(factors) || !factors.length) {
    return "";
  }

  const items = factors.slice(0, 3).map((factor) => {
    const direction = factor.direction === "negative" ? "reduces fit" : "supports fit";
    return `<li>${escapeHtml(formatFactorName(factor.feature))}: ${escapeHtml(direction)}</li>`;
  }).join("");

  return `<ul class="driver-list ml-factor-list">${items}</ul>`;
}

function formatFactorName(featureName) {
  return String(featureName || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
