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

  renderDiscoverNeeds(discoverCustomer);
}

function renderDiscoverNeeds(customer) {
  document.querySelector("#discoverNotFoundState").classList.add("hidden");
  document.querySelector("#discoverProfile").classList.remove("hidden");

  document.querySelector("#backToClient").href = `client.html?type=accountNumber&value=${encodeURIComponent(customer.accountNumber)}`;
  document.querySelector("#discoverCustomerName").textContent = customer.name;
  document.querySelector("#discoverCustomerMeta").textContent = `Account ${customer.accountNumber} | ${customer.cif}`;
  document.querySelector("#recommendationCount").textContent = customer.discoverNeeds.length;
  document.querySelector("#discoverHouseholdBalance").textContent = window.crmFormatCurrency(customer.household);
  document.querySelector("#discoverInvestedBalance").textContent = window.crmFormatCurrency(customer.investedBalance);
  document.querySelector("#discoverAffluencyTier").textContent = `${customer.affluencyTier} of 3`;
  document.querySelector("#discoverPersonalBanker").textContent = customer.personalBanker;

  renderNextBestAction(customer.nextBestAction);
  renderRecommendations(customer.discoverNeeds);
}

function renderNextBestAction(action) {
  document.querySelector("#discoverActionPriority").textContent = `${action.priority} Priority`;
  document.querySelector("#discoverActionPriority").className = `priority-pill priority-${action.priority.toLowerCase()}`;
  document.querySelector("#discoverActionTitle").textContent = action.title;
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
    card.innerHTML = `
      <div class="recommendation-header">
        <div>
          <span>${need.priority} Priority</span>
          <h3>${need.product}</h3>
        </div>
        <strong>${need.status}</strong>
      </div>
      <p>${need.reason}</p>
      <div class="next-action">
        <span>Next action</span>
        <strong>${need.nextAction}</strong>
      </div>
    `;
    list.appendChild(card);
  });
}
