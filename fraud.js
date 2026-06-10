const fraudParams = new URLSearchParams(window.location.search);
const fraudAccountNumber = fraudParams.get("accountNumber");
const activeFraudRole = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";

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
  document.querySelector("#fraudNotFoundState").classList.add("hidden");
  document.querySelector("#fraudProfile").classList.remove("hidden");

  document.querySelector("#backToClient").href = activeFraudRole === "admin"
    ? `client.html?type=accountNumber&value=${encodeURIComponent(customer.accountNumber)}`
    : "index.html";
  document.querySelector("#backToClient").textContent = activeFraudRole === "admin"
    ? "Back to client profile"
    : "Back to fraud lookup";
  document.querySelector("#fraudCustomerName").textContent = customer.name;
  document.querySelector("#fraudCustomerMeta").textContent = `Account ${customer.accountNumber} | ${customer.cif}`;
  document.querySelector("#fraudDetailScore").textContent = `${customer.fraudRiskScore} / 100`;
  document.querySelector("#fraudDetailTier").textContent = `${customer.fraudRiskTier} Risk`;
  document.querySelector("#fraudScorePanel").className = `fraud-score-panel risk-${customer.fraudRiskTier.toLowerCase()}`;

  document.querySelector("#fraudCases").textContent = customer.fraudCases;
  document.querySelector("#frontlineNotes").textContent = customer.frontlineNotes;
  document.querySelector("#lastReviewed").textContent = customer.lastReviewed;

  renderFraudGraph(customer.fraudHistory);
  renderDrivers(customer.fraudDrivers);
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
        <strong>${item.type}</strong>
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
