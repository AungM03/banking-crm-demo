const wealthParams = new URLSearchParams(window.location.search);
const wealthAccountNumber = wealthParams.get("accountNumber");
const activeWealthRole = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";
const isStaticWealthDemo = window.location.protocol === "file:";
let activeWealthCustomer = null;
let activeWealthProfile = null;
let wealthInteractionEditTarget = null;

const wealthEditForm = document.querySelector("#wealthEditForm");
const wealthEditButton = document.querySelector("#wealthEditButton");
const wealthCancelEditButton = document.querySelector("#wealthCancelEditButton");
const wealthInteractionForm = document.querySelector("#wealthInteractionForm");
const wealthInteractionCancelButton = document.querySelector("#wealthInteractionCancelButton");
const wealthInteractionList = document.querySelector("#wealthInteractionList");

initWealthProfile();

if (wealthEditButton) {
  wealthEditButton.addEventListener("click", startWealthEdit);
}

if (wealthCancelEditButton) {
  wealthCancelEditButton.addEventListener("click", clearWealthEditMode);
}

if (wealthEditForm) {
  wealthEditForm.addEventListener("submit", handleWealthUpdate);
}

if (wealthInteractionForm) {
  wealthInteractionForm.addEventListener("submit", handleWealthInteractionSubmit);
}

if (wealthInteractionCancelButton) {
  wealthInteractionCancelButton.addEventListener("click", clearWealthInteractionEditMode);
}

if (wealthInteractionList) {
  wealthInteractionList.addEventListener("click", handleWealthInteractionAction);
}

async function initWealthProfile() {
  await window.crmApi.loadBootstrap();

  if (window.crmHasPermission && !window.crmHasPermission("view_wealth_profile")) {
    showWealthNotFound("Wealth profiles are restricted to Wealth and Admin in this prototype.");
    return;
  }

  const record = await window.crmApi.getWealthProfile(wealthAccountNumber);

  if (!record || !record.customer || !record.profile) {
    showWealthNotFound("No matching wealth client was found.");
    return;
  }

  activeWealthCustomer = record.customer;
  activeWealthProfile = record.profile;
  renderWealthProfile(record.customer, record.profile);
}

function renderWealthProfile(customer, profile) {
  document.querySelector("#wealthNotFoundState").classList.add("hidden");
  document.querySelector("#wealthProfile").classList.remove("hidden");
  wealthEditButton?.classList.toggle("hidden", isStaticWealthDemo || (window.crmHasPermission && !window.crmHasPermission("edit_wealth_profile")));
  wealthInteractionForm?.classList.toggle("hidden", isStaticWealthDemo || (window.crmHasPermission && !window.crmHasPermission("manage_wealth_notes")));

  document.querySelector("#wealthCustomerName").textContent = customer.name;
  document.querySelector("#wealthCustomerMeta").textContent = `Account ${customer.accountNumber} | ${customer.cif}`;
  document.querySelector("#wealthClient360Link").href = window.crmClientUrl(customer.accountNumber);
  document.querySelector("#wealthLendingLink").href = window.crmUrlWithRole(`lending.html?accountNumber=${encodeURIComponent(customer.accountNumber)}`);
  document.querySelector("#wealthLendingLink").classList.toggle("hidden", !customer.loans.length || (window.crmHasPermission && !window.crmHasPermission("view_lending_profile")));
  document.querySelector("#wealthFraudScore").textContent = `${customer.fraudRiskScore} / 100`;
  document.querySelector("#wealthFraudTier").textContent = `${customer.fraudRiskTier} Risk | Score only`;
  document.querySelector("#wealthHouseholdBalance").textContent = window.crmFormatCurrency(customer.household);
  document.querySelector("#wealthInvestedBalance").textContent = window.crmFormatCurrency(customer.investedBalance);
  document.querySelector("#wealthAffluencyTier").textContent = `${customer.affluencyTier} of 3`;
  document.querySelector("#wealthAdvisorName").textContent = customer.wealthAdvisor;
  document.querySelector("#wealthNextMeeting").textContent = profile.nextMeetingDate;
  document.querySelector("#wealthFollowUpSummary").textContent = getShortText(profile.followUp, 28);

  renderInvestmentProfile(profile);
  renderAccounts(profile.accounts);
  renderAllocation(customer);
  renderLifeEvents(profile.lifeEvents);
  renderInteractions(profile.interactions);
  renderRecommendations(customer.discoverNeeds);
}

function renderInvestmentProfile(profile) {
  const details = document.querySelector("#wealthProfileDetails");
  details.innerHTML = [
    ["Risk Tolerance", profile.riskTolerance],
    ["Liquidity Needs", profile.liquidityNeeds],
    ["Time Horizon", profile.timeHorizon],
    ["Tax Status", profile.taxStatus],
    ["Other Investments", profile.otherInvestments],
    ["Investment Experience", profile.investmentExperience],
    ["Investment Objectives", profile.investmentObjectives],
    ["Concentration Concerns", profile.concentrationConcerns],
    ["Income Needs", profile.incomeNeeds],
    ["Last Meeting", profile.lastMeetingDate],
    ["Last Call", profile.lastCallDate],
    ["Next Meeting", profile.nextMeetingDate],
    ["Follow-up", profile.followUp]
  ].map(([label, value]) => `
    <div>
      <dt>${label}</dt>
      <dd>${value}</dd>
    </div>
  `).join("");
}

function renderAccounts(accounts) {
  const list = document.querySelector("#wealthAccountList");
  list.innerHTML = "";

  accounts.forEach((account) => {
    const row = document.createElement("li");
    row.innerHTML = `
      <div>
        <strong>${account.name}</strong>
        <span>${account.group} | ${account.status} | ${account.accountId}</span>
      </div>
      <div class="record-meta">
        <strong>${window.crmFormatCurrency(account.balance)}</strong>
      </div>
    `;
    list.appendChild(row);
  });
}

function renderLifeEvents(events) {
  const list = document.querySelector("#wealthEventList");
  list.innerHTML = "";

  events.forEach((event) => {
    const row = document.createElement("li");
    row.innerHTML = `
      <div>
        <strong>${event.title}</strong>
        <span>Event ${event.date} | Alert ${event.alertDate}</span>
        <span>${event.note}</span>
      </div>
      <div class="record-meta">
        <strong>1 month</strong>
      </div>
    `;
    list.appendChild(row);
  });
}

function renderInteractions(interactions) {
  wealthInteractionList.innerHTML = "";

  interactions.forEach((interaction) => {
    const item = document.createElement("section");
    item.className = "note-item";
    item.innerHTML = `
      <div>
        <strong>${interaction.type} | ${interaction.owner}</strong>
        <span>${interaction.date}</span>
      </div>
      <p>${interaction.note}</p>
      ${canManageInteraction(interaction) ? `
        <div class="table-actions">
          <button class="secondary-button compact-button" type="button" data-edit-wealth-interaction="${interaction.dbId}">Edit</button>
          <button class="danger-button compact-button" type="button" data-remove-wealth-interaction="${interaction.dbId}">Remove</button>
        </div>
      ` : ""}
    `;
    wealthInteractionList.appendChild(item);
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

function startWealthEdit() {
  if (!activeWealthProfile || (window.crmHasPermission && !window.crmHasPermission("edit_wealth_profile"))) {
    showWealthEditMessage("This role cannot edit wealth profile fields.", "error");
    return;
  }

  wealthEditForm.classList.remove("hidden");
  wealthEditButton.classList.add("hidden");
  document.querySelector("#wealthRiskField").value = activeWealthProfile.riskTolerance;
  document.querySelector("#wealthHorizonField").value = activeWealthProfile.timeHorizon;
  document.querySelector("#wealthLiquidityField").value = activeWealthProfile.liquidityNeeds;
  document.querySelector("#wealthTaxField").value = activeWealthProfile.taxStatus;
  document.querySelector("#wealthOtherInvestmentsField").value = activeWealthProfile.otherInvestments;
  document.querySelector("#wealthExperienceField").value = activeWealthProfile.investmentExperience;
  document.querySelector("#wealthObjectivesField").value = activeWealthProfile.investmentObjectives;
  document.querySelector("#wealthConcentrationField").value = activeWealthProfile.concentrationConcerns;
  document.querySelector("#wealthIncomeNeedsField").value = activeWealthProfile.incomeNeeds;
  document.querySelector("#wealthLastMeetingField").value = activeWealthProfile.lastMeetingDate;
  document.querySelector("#wealthLastCallField").value = activeWealthProfile.lastCallDate;
  document.querySelector("#wealthNextMeetingField").value = activeWealthProfile.nextMeetingDate;
  document.querySelector("#wealthFollowUpField").value = activeWealthProfile.followUp;
  showWealthEditMessage("Editing wealth profile. Save changes or cancel.", "info");
}

function clearWealthEditMode() {
  wealthEditForm?.classList.add("hidden");
  wealthEditButton?.classList.remove("hidden");
  wealthEditForm?.reset();
}

async function handleWealthUpdate(event) {
  event.preventDefault();

  const values = {
    accountNumber: activeWealthProfile.accountNumber,
    riskTolerance: document.querySelector("#wealthRiskField").value.trim(),
    timeHorizon: document.querySelector("#wealthHorizonField").value.trim(),
    liquidityNeeds: document.querySelector("#wealthLiquidityField").value.trim(),
    taxStatus: document.querySelector("#wealthTaxField").value.trim(),
    otherInvestments: document.querySelector("#wealthOtherInvestmentsField").value.trim(),
    investmentExperience: document.querySelector("#wealthExperienceField").value.trim(),
    investmentObjectives: document.querySelector("#wealthObjectivesField").value.trim(),
    concentrationConcerns: document.querySelector("#wealthConcentrationField").value.trim(),
    incomeNeeds: document.querySelector("#wealthIncomeNeedsField").value.trim(),
    lastMeetingDate: document.querySelector("#wealthLastMeetingField").value.trim(),
    lastCallDate: document.querySelector("#wealthLastCallField").value.trim(),
    nextMeetingDate: document.querySelector("#wealthNextMeetingField").value.trim(),
    followUp: document.querySelector("#wealthFollowUpField").value.trim()
  };

  if (Object.values(values).some((value) => !String(value).trim())) {
    showWealthEditMessage("All wealth profile fields are required for this prototype.", "error");
    return;
  }

  setWealthSaving(true);
  showWealthEditMessage("Saving wealth profile...", "info");

  try {
    const result = await window.crmApi.updateWealthProfile(values);
    activeWealthProfile = result.record;
    renderWealthProfile(activeWealthCustomer, activeWealthProfile);
    clearWealthEditMode();
    showWealthEditMessage(result.message || "Wealth profile updated.", "success");
  } catch (error) {
    showWealthEditMessage(error.message || "Wealth profile could not be saved.", "error");
  } finally {
    setWealthSaving(false);
  }
}

async function handleWealthInteractionSubmit(event) {
  event.preventDefault();

  const payload = {
    id: wealthInteractionEditTarget?.dbId,
    accountNumber: activeWealthProfile.accountNumber,
    type: document.querySelector("#wealthInteractionType").value,
    date: document.querySelector("#wealthInteractionDate").value.trim(),
    note: document.querySelector("#wealthInteractionNote").value.trim()
  };

  if (!payload.date || !payload.note) {
    showWealthInteractionMessage("Date and note are required.", "error");
    return;
  }

  setWealthInteractionSaving(true);
  showWealthInteractionMessage(wealthInteractionEditTarget ? "Updating interaction..." : "Saving interaction...", "info");

  try {
    const result = wealthInteractionEditTarget
      ? await window.crmApi.updateWealthInteraction(payload)
      : await window.crmApi.createWealthInteraction(payload);

    activeWealthProfile.interactions = wealthInteractionEditTarget
      ? activeWealthProfile.interactions.map((interaction) => interaction.dbId === wealthInteractionEditTarget.dbId ? result.record : interaction)
      : [result.record, ...activeWealthProfile.interactions];

    clearWealthInteractionEditMode();
    renderInteractions(activeWealthProfile.interactions);
    showWealthInteractionMessage(result.message || "Wealth interaction saved.", "success");
  } catch (error) {
    showWealthInteractionMessage(error.message || "Wealth interaction could not be saved.", "error");
  } finally {
    setWealthInteractionSaving(false);
  }
}

async function handleWealthInteractionAction(event) {
  const editButton = event.target.closest("[data-edit-wealth-interaction]");
  const removeButton = event.target.closest("[data-remove-wealth-interaction]");

  if (!editButton && !removeButton) {
    return;
  }

  const id = Number((editButton || removeButton).dataset.editWealthInteraction || (editButton || removeButton).dataset.removeWealthInteraction);
  const interaction = activeWealthProfile.interactions.find((item) => item.dbId === id);

  if (editButton) {
    startWealthInteractionEdit(interaction);
    return;
  }

  if (!interaction || !canManageInteraction(interaction)) {
    showWealthInteractionMessage("Only prototype-created interactions can be removed.", "error");
    return;
  }

  if (!window.confirm("Remove this wealth interaction note?")) {
    return;
  }

  try {
    const result = await window.crmApi.deleteWealthInteraction(interaction);
    activeWealthProfile.interactions = activeWealthProfile.interactions.filter((item) => item !== interaction);
    renderInteractions(activeWealthProfile.interactions);
    showWealthInteractionMessage(result.message || "Wealth interaction removed.", "success");
  } catch (error) {
    showWealthInteractionMessage(error.message || "Wealth interaction could not be removed.", "error");
  }
}

function startWealthInteractionEdit(interaction) {
  if (!interaction || !canManageInteraction(interaction)) {
    showWealthInteractionMessage("Only prototype-created interactions can be edited.", "error");
    return;
  }

  wealthInteractionEditTarget = interaction;
  document.querySelector("#wealthInteractionType").value = interaction.type;
  document.querySelector("#wealthInteractionDate").value = interaction.date;
  document.querySelector("#wealthInteractionNote").value = interaction.note;
  wealthInteractionCancelButton.classList.remove("hidden");
  setWealthInteractionSaving(false);
  showWealthInteractionMessage("Editing interaction note. Save changes or cancel.", "info");
}

function clearWealthInteractionEditMode() {
  wealthInteractionEditTarget = null;
  wealthInteractionForm?.reset();
  wealthInteractionCancelButton?.classList.add("hidden");
  setWealthInteractionSaving(false);
}

function canManageInteraction(interaction) {
  return Boolean(interaction && interaction.userCreated && (!window.crmHasPermission || window.crmHasPermission("manage_wealth_notes")));
}

function setWealthSaving(isSaving) {
  const button = document.querySelector("#wealthSaveButton");
  if (button) {
    button.disabled = isSaving;
    button.textContent = isSaving ? "Saving..." : "Save profile";
  }
}

function setWealthInteractionSaving(isSaving) {
  const button = document.querySelector("#wealthInteractionSaveButton");
  if (button) {
    button.disabled = isSaving;
    button.textContent = isSaving ? "Saving..." : (wealthInteractionEditTarget ? "Save note" : "Add note");
  }
}

function showWealthEditMessage(message, type) {
  showMessage("#wealthEditMessage", message, type);
}

function showWealthInteractionMessage(message, type) {
  showMessage("#wealthInteractionMessage", message, type);
}

function showMessage(selector, message, type) {
  const element = document.querySelector(selector);
  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = `form-message ${type}`;
  element.classList.remove("hidden");
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

function getShortText(text, maxLength) {
  const normalizedText = String(text || "");
  return normalizedText.length > maxLength ? `${normalizedText.slice(0, maxLength - 3)}...` : normalizedText;
}

function showWealthNotFound(message) {
  document.querySelector("#wealthProfile").classList.add("hidden");
  document.querySelector("#wealthNotFoundState").classList.remove("hidden");
  document.querySelector("#wealthNotFoundMessage").textContent = message;
}
