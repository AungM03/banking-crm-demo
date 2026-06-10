const wealthParams = new URLSearchParams(window.location.search);
const wealthAccountNumber = wealthParams.get("accountNumber");
const activeWealthRole = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";

initWealthProfile();

async function initWealthProfile() {
  if (window.crmHasAnyPermission && !window.crmHasAnyPermission(["search_customers", "search_wealth_customers"])) {
    showWealthNotFound("Wealth profiles are restricted to Wealth and Admin in this prototype.");
    return;
  }

  const customer = await window.crmApi.findCustomer("accountNumber", wealthAccountNumber);

  if (!customer || !window.crmIsWealthClient(customer)) {
    showWealthNotFound("No matching wealth client was found.");
    return;
  }

  renderWealthProfile(customer);
}

function renderWealthProfile(customer) {
  document.querySelector("#wealthNotFoundState").classList.add("hidden");
  document.querySelector("#wealthProfile").classList.remove("hidden");
  document.querySelector("#wealthCustomerName").textContent = customer.name;
  document.querySelector("#wealthCustomerMeta").textContent = `Account ${customer.accountNumber} | ${customer.cif}`;
  document.querySelector("#wealthClient360Link").href = window.crmClientUrl(customer.accountNumber);
  document.querySelector("#wealthFraudScore").textContent = `${customer.fraudRiskScore} / 100`;
  document.querySelector("#wealthFraudTier").textContent = `${customer.fraudRiskTier} Risk | Score only`;
  document.querySelector("#wealthHouseholdBalance").textContent = window.crmFormatCurrency(customer.household);
  document.querySelector("#wealthInvestedBalance").textContent = window.crmFormatCurrency(customer.investedBalance);
  document.querySelector("#wealthAffluencyTier").textContent = `${customer.affluencyTier} of 3`;
  document.querySelector("#wealthAdvisorName").textContent = customer.wealthAdvisor;

  renderPortfolio(customer);
  renderAllocation(customer);
  renderAccounts(customer.accounts);
  renderRecommendations(customer.discoverNeeds);
}

function renderPortfolio(customer) {
  const list = document.querySelector("#portfolioList");
  list.innerHTML = "";

  const items = [
    { label: "Advisory Portfolio", detail: "Managed investment relationship", value: customer.investedBalance },
    { label: "Deposit Strategy", detail: `${customer.savings > 100000 ? "High savings balance" : "Cash reserve"}`, value: customer.savings },
    { label: "CD / Fixed Income", detail: "Rate and maturity planning", value: customer.accounts.filter((account) => account.type.includes("CD")).reduce((total, account) => total + account.balance, 0) }
  ];

  items.forEach((item) => {
    const row = document.createElement("li");
    row.innerHTML = `
      <div>
        <strong>${item.label}</strong>
        <span>${item.detail}</span>
      </div>
      <div class="record-meta">
        <strong>${window.crmFormatCurrency(item.value)}</strong>
      </div>
    `;
    list.appendChild(row);
  });
}

function renderAllocation(customer) {
  const list = document.querySelector("#allocationList");
  const allocations = getAllocation(customer);
  list.innerHTML = "";

  allocations.forEach((allocation) => {
    const row = document.createElement("section");
    row.className = "profitability-row";
    row.innerHTML = `
      <div class="profitability-label">
        <strong>${allocation.label}</strong>
        <span>${allocation.percent}% target mix</span>
      </div>
      <div class="profitability-track" aria-hidden="true">
        <i style="width: ${allocation.percent}%"></i>
      </div>
      <strong>${window.crmFormatCurrency(Math.round(customer.investedBalance * allocation.percent / 100))}</strong>
    `;
    list.appendChild(row);
  });
}

function renderAccounts(accounts) {
  const list = document.querySelector("#wealthAccountList");
  list.innerHTML = "";

  accounts.forEach((account) => {
    const row = document.createElement("li");
    row.innerHTML = `
      <div>
        <strong>${account.type}</strong>
        <span>${account.status} | Opened ${account.openDate}</span>
      </div>
      <div class="record-meta">
        <strong>${window.crmFormatCurrency(account.balance)}</strong>
      </div>
    `;
    list.appendChild(row);
  });
}

function renderRecommendations(recommendations) {
  const list = document.querySelector("#wealthRecommendationList");
  list.innerHTML = "";

  recommendations.slice(0, 3).forEach((recommendation) => {
    const row = document.createElement("li");
    row.innerHTML = `
      <div>
        <strong>${recommendation.product}</strong>
        <span>${recommendation.reason}</span>
      </div>
      <div class="record-meta">
        <strong>${recommendation.priority}</strong>
      </div>
    `;
    list.appendChild(row);
  });
}

function getAllocation(customer) {
  if (customer.investedBalance > 500000) {
    return [
      { label: "Equities", percent: 45 },
      { label: "Fixed Income", percent: 25 },
      { label: "Cash Reserve", percent: 15 },
      { label: "Alternatives", percent: 15 }
    ];
  }

  return [
    { label: "Equities", percent: 40 },
    { label: "Fixed Income", percent: 30 },
    { label: "Cash Reserve", percent: 20 },
    { label: "Alternatives", percent: 10 }
  ];
}

function showWealthNotFound(message) {
  document.querySelector("#wealthProfile").classList.add("hidden");
  document.querySelector("#wealthNotFoundState").classList.remove("hidden");
  document.querySelector("#wealthNotFoundMessage").textContent = message;
}
