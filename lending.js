const lendingParams = new URLSearchParams(window.location.search);
const lendingAccountNumber = lendingParams.get("accountNumber");
const isStaticLendingDemo = window.location.protocol === "file:";
let activeLendingCustomer = null;
let activeLendingProfile = null;
let lendingContactEditTarget = null;

const lendingEditForm = document.querySelector("#lendingEditForm");
const lendingEditButton = document.querySelector("#lendingEditButton");
const lendingCancelEditButton = document.querySelector("#lendingCancelEditButton");
const lendingContactForm = document.querySelector("#lendingContactForm");
const lendingContactList = document.querySelector("#lendingContactList");
const lendingContactCancelButton = document.querySelector("#lendingContactCancelButton");
const lendingDocumentList = document.querySelector("#lendingDocumentList");

initLendingProfile();

if (lendingEditButton) {
  lendingEditButton.addEventListener("click", startLendingEdit);
}

if (lendingCancelEditButton) {
  lendingCancelEditButton.addEventListener("click", clearLendingEditMode);
}

if (lendingEditForm) {
  lendingEditForm.addEventListener("submit", handleLendingUpdate);
}

if (lendingContactForm) {
  lendingContactForm.addEventListener("submit", handleLendingContactSubmit);
}

if (lendingContactCancelButton) {
  lendingContactCancelButton.addEventListener("click", clearLendingContactEditMode);
}

if (lendingContactList) {
  lendingContactList.addEventListener("click", handleLendingContactAction);
}

if (lendingDocumentList) {
  lendingDocumentList.addEventListener("change", handleDocumentStatusChange);
}

async function initLendingProfile() {
  await window.crmApi.loadBootstrap();

  if (window.crmHasPermission && !window.crmHasPermission("view_lending_profile")) {
    showLendingNotFound("Lending profiles are restricted to Banker, Loans, and Admin in this prototype.");
    return;
  }

  const record = await window.crmApi.getLendingProfile(lendingAccountNumber);

  if (!record || !record.customer || !record.profile) {
    showLendingNotFound("No matching lending client was found.");
    return;
  }

  activeLendingCustomer = record.customer;
  activeLendingProfile = record.profile;
  renderLendingProfile(record.customer, record.profile);
}

function renderLendingProfile(customer, profile) {
  document.querySelector("#lendingNotFoundState").classList.add("hidden");
  document.querySelector("#lendingProfile").classList.remove("hidden");
  lendingEditButton?.classList.toggle("hidden", isStaticLendingDemo || (window.crmHasPermission && !window.crmHasPermission("edit_lending_profile")));
  lendingContactForm?.classList.toggle("hidden", isStaticLendingDemo || (window.crmHasPermission && !window.crmHasPermission("manage_lending_notes")));

  document.querySelector("#lendingCustomerName").textContent = customer.name;
  document.querySelector("#lendingCustomerMeta").textContent = `Account ${customer.accountNumber} | ${customer.cif}`;
  document.querySelector("#lendingClient360Link").href = window.crmClientUrl(customer.accountNumber);
  document.querySelector("#lendingFraudScore").textContent = `${customer.fraudRiskScore} / 100`;
  document.querySelector("#lendingFraudTier").textContent = `${customer.fraudRiskTier} Risk | Score only`;
  document.querySelector("#lendingLoanStatus").textContent = profile.loanStatus;
  document.querySelector("#lendingMonthlyPayment").textContent = window.crmFormatCurrency(profile.monthlyPayment);
  document.querySelector("#lendingYearlyPayment").textContent = window.crmFormatCurrency(profile.yearlyPayment);
  document.querySelector("#lendingMonthlyIncome").textContent = window.crmFormatCurrency(profile.monthlyIncome);
  document.querySelector("#lendingPastDue").textContent = window.crmFormatCurrency(profile.pastDueAmount);
  document.querySelector("#lendingCreditScore").textContent = profile.creditScore;

  renderLendingDetails(profile);
  renderLoanProducts(customer.loans);
  renderPaymentSnapshot(profile);
  renderDocuments(profile.documents);
  renderContacts(profile.contactHistory);
  renderRecommendations(profile);
}

function renderLendingDetails(profile) {
  const details = document.querySelector("#lendingProfileDetails");
  details.innerHTML = [
    ["Loan Status", profile.loanStatus],
    ["Interest Rate", profile.interestRate],
    ["Monthly Payment", window.crmFormatCurrency(profile.monthlyPayment)],
    ["Yearly Payment", window.crmFormatCurrency(profile.yearlyPayment)],
    ["Monthly Income", window.crmFormatCurrency(profile.monthlyIncome)],
    ["PMI Status", profile.pmiStatus],
    ["PMI Recommendation", profile.pmiRecommendation],
    ["Home Equity", window.crmFormatCurrency(profile.homeEquity)],
    ["HELOC Status", profile.helocStatus],
    ["Bill Amount Owed", window.crmFormatCurrency(profile.billAmountOwed)],
    ["Past Due Amount", window.crmFormatCurrency(profile.pastDueAmount)],
    ["Maturity Date", profile.maturityDate],
    ["Closing Status", profile.closingStatus],
    ["Split Payment", profile.splitPaymentStructure],
    ["Available Products", profile.availableLoanProducts]
  ].map(([label, value]) => `
    <div>
      <dt>${label}</dt>
      <dd>${value}</dd>
    </div>
  `).join("");
}

function renderLoanProducts(loans) {
  const list = document.querySelector("#lendingLoanList");
  list.innerHTML = "";

  loans.forEach((loan) => {
    const row = document.createElement("li");
    row.innerHTML = `
      <div>
        <strong>${loan.type}</strong>
        <span>${loan.status} | ${loan.paymentStatus}</span>
      </div>
      <div class="record-meta">
        <strong>${window.crmFormatCurrency(loan.balance)}</strong>
      </div>
    `;
    list.appendChild(row);
  });
}

function renderPaymentSnapshot(profile) {
  const list = document.querySelector("#lendingPaymentSnapshot");
  const yearlyIncome = profile.monthlyIncome * 12;
  const debtRatio = yearlyIncome ? Math.round((profile.yearlyPayment / yearlyIncome) * 100) : 0;
  const rows = [
    { label: "Annual payment load", value: profile.yearlyPayment, percent: Math.min(debtRatio, 100), helper: `${debtRatio}% of yearly income` },
    { label: "Home equity / collateral", value: profile.homeEquity, percent: Math.min(Math.round(profile.homeEquity / 250000 * 100), 100), helper: "Estimated available equity context" },
    { label: "Past due exposure", value: profile.pastDueAmount, percent: profile.billAmountOwed ? Math.min(Math.round(profile.pastDueAmount / profile.billAmountOwed * 100), 100) : 0, helper: "Amount currently past due" }
  ];

  list.innerHTML = "";
  rows.forEach((row) => {
    const item = document.createElement("section");
    item.className = "profitability-row";
    item.innerHTML = `
      <div class="profitability-label">
        <strong>${row.label}</strong>
        <span>${row.helper}</span>
      </div>
      <div class="profitability-track" aria-hidden="true">
        <i style="width: ${row.percent}%"></i>
      </div>
      <strong>${window.crmFormatCurrency(row.value)}</strong>
    `;
    list.appendChild(item);
  });
}

function renderDocuments(documents) {
  lendingDocumentList.innerHTML = "";

  documents.forEach((documentRecord) => {
    const card = document.createElement("section");
    card.className = "list-card";
    card.innerHTML = `
      <header>
        <div>
          <strong>${documentRecord.name}</strong>
          <p>Last updated ${documentRecord.lastUpdated}</p>
        </div>
        <label class="inline-select">
          <span>Status</span>
          <select data-document-id="${documentRecord.dbId}" ${isStaticLendingDemo || (window.crmHasPermission && !window.crmHasPermission("edit_lending_profile")) ? "disabled" : ""}>
            ${["On file", "Needs refresh", "Verified", "Pending lender review", "Updated"].map((status) => `
              <option ${status === documentRecord.status ? "selected" : ""}>${status}</option>
            `).join("")}
          </select>
        </label>
      </header>
    `;
    lendingDocumentList.appendChild(card);
  });
}

function renderContacts(contacts) {
  lendingContactList.innerHTML = "";

  contacts.forEach((contact) => {
    const item = document.createElement("section");
    item.className = "note-item";
    item.innerHTML = `
      <div>
        <strong>${contact.type} | ${contact.owner}</strong>
        <span>${contact.date}</span>
      </div>
      <p><a class="primary-link compact-link" href="${contact.type === "Email" ? `mailto:${contact.value}` : `tel:${contact.value}`}">${contact.value}</a> ${contact.note}</p>
      ${canManageContact(contact) ? `
        <div class="table-actions">
          <button class="secondary-button compact-button" type="button" data-edit-lending-contact="${contact.dbId}">Edit</button>
          <button class="danger-button compact-button" type="button" data-remove-lending-contact="${contact.dbId}">Remove</button>
        </div>
      ` : ""}
    `;
    lendingContactList.appendChild(item);
  });
}

function renderRecommendations(profile) {
  const list = document.querySelector("#lendingRecommendationList");
  const recommendations = [
    { title: "Available products", detail: profile.availableLoanProducts, value: "Open" },
    { title: "PMI review", detail: profile.pmiRecommendation, value: profile.pmiStatus },
    { title: "HELOC / home equity", detail: profile.helocStatus, value: window.crmFormatCurrency(profile.homeEquity) }
  ];

  list.innerHTML = "";
  recommendations.forEach((recommendation) => {
    const row = document.createElement("li");
    row.innerHTML = `
      <div>
        <strong>${recommendation.title}</strong>
        <span>${recommendation.detail}</span>
      </div>
      <div class="record-meta">
        <strong>${recommendation.value}</strong>
      </div>
    `;
    list.appendChild(row);
  });
}

function startLendingEdit() {
  if (!activeLendingProfile || (window.crmHasPermission && !window.crmHasPermission("edit_lending_profile"))) {
    showLendingEditMessage("This role cannot edit lending profile fields.", "error");
    return;
  }

  lendingEditForm.classList.remove("hidden");
  lendingEditButton.classList.add("hidden");
  document.querySelector("#lendingStatusField").value = activeLendingProfile.loanStatus;
  document.querySelector("#lendingRateField").value = activeLendingProfile.interestRate;
  document.querySelector("#lendingMonthlyPaymentField").value = activeLendingProfile.monthlyPayment;
  document.querySelector("#lendingYearlyPaymentField").value = activeLendingProfile.yearlyPayment;
  document.querySelector("#lendingIncomeField").value = activeLendingProfile.monthlyIncome;
  document.querySelector("#lendingCreditField").value = activeLendingProfile.creditScore;
  document.querySelector("#lendingPmiStatusField").value = activeLendingProfile.pmiStatus;
  document.querySelector("#lendingPmiRecommendationField").value = activeLendingProfile.pmiRecommendation;
  document.querySelector("#lendingHomeEquityField").value = activeLendingProfile.homeEquity;
  document.querySelector("#lendingHelocField").value = activeLendingProfile.helocStatus;
  document.querySelector("#lendingOwedField").value = activeLendingProfile.billAmountOwed;
  document.querySelector("#lendingPastDueField").value = activeLendingProfile.pastDueAmount;
  document.querySelector("#lendingMaturityField").value = activeLendingProfile.maturityDate;
  document.querySelector("#lendingClosingField").value = activeLendingProfile.closingStatus;
  document.querySelector("#lendingSplitPaymentField").value = activeLendingProfile.splitPaymentStructure;
  document.querySelector("#lendingAvailableProductsField").value = activeLendingProfile.availableLoanProducts;
  showLendingEditMessage("Editing lending profile. Save changes or cancel.", "info");
}

function clearLendingEditMode() {
  lendingEditForm?.classList.add("hidden");
  lendingEditButton?.classList.remove("hidden");
  lendingEditForm?.reset();
}

async function handleLendingUpdate(event) {
  event.preventDefault();

  const values = {
    accountNumber: activeLendingProfile.accountNumber,
    loanStatus: document.querySelector("#lendingStatusField").value.trim(),
    interestRate: document.querySelector("#lendingRateField").value.trim(),
    monthlyPayment: Number(document.querySelector("#lendingMonthlyPaymentField").value),
    yearlyPayment: Number(document.querySelector("#lendingYearlyPaymentField").value),
    monthlyIncome: Number(document.querySelector("#lendingIncomeField").value),
    creditScore: Number(document.querySelector("#lendingCreditField").value),
    pmiStatus: document.querySelector("#lendingPmiStatusField").value.trim(),
    pmiRecommendation: document.querySelector("#lendingPmiRecommendationField").value.trim(),
    homeEquity: Number(document.querySelector("#lendingHomeEquityField").value),
    helocStatus: document.querySelector("#lendingHelocField").value.trim(),
    billAmountOwed: Number(document.querySelector("#lendingOwedField").value),
    pastDueAmount: Number(document.querySelector("#lendingPastDueField").value),
    maturityDate: document.querySelector("#lendingMaturityField").value.trim(),
    closingStatus: document.querySelector("#lendingClosingField").value.trim(),
    splitPaymentStructure: document.querySelector("#lendingSplitPaymentField").value.trim(),
    availableLoanProducts: document.querySelector("#lendingAvailableProductsField").value.trim()
  };

  if (!values.loanStatus || !values.interestRate || !values.pmiStatus || !values.maturityDate || !values.availableLoanProducts) {
    showLendingEditMessage("Required lending fields cannot be blank.", "error");
    return;
  }

  setLendingSaving(true);
  showLendingEditMessage("Saving lending profile...", "info");

  try {
    const result = await window.crmApi.updateLendingProfile(values);
    activeLendingProfile = result.record;
    renderLendingProfile(activeLendingCustomer, activeLendingProfile);
    clearLendingEditMode();
    showLendingEditMessage(result.message || "Lending profile updated.", "success");
  } catch (error) {
    showLendingEditMessage(error.message || "Lending profile could not be saved.", "error");
  } finally {
    setLendingSaving(false);
  }
}

async function handleDocumentStatusChange(event) {
  const select = event.target.closest("[data-document-id]");

  if (!select) {
    return;
  }

  const documentRecord = activeLendingProfile.documents.find((item) => item.dbId === Number(select.dataset.documentId));

  if (!documentRecord) {
    return;
  }

  try {
    const result = await window.crmApi.updateLendingDocument({
      id: documentRecord.dbId,
      status: select.value,
      lastUpdated: "Today"
    });
    activeLendingProfile.documents = activeLendingProfile.documents.map((item) => item.dbId === documentRecord.dbId ? result.record : item);
    renderDocuments(activeLendingProfile.documents);
    showDocumentMessage(result.message || "Document status updated.", "success");
  } catch (error) {
    select.value = documentRecord.status;
    showDocumentMessage(error.message || "Document status could not be updated.", "error");
  }
}

async function handleLendingContactSubmit(event) {
  event.preventDefault();

  const payload = {
    id: lendingContactEditTarget?.dbId,
    accountNumber: activeLendingProfile.accountNumber,
    type: document.querySelector("#lendingContactType").value,
    date: document.querySelector("#lendingContactDate").value.trim(),
    value: document.querySelector("#lendingContactValue").value.trim(),
    note: document.querySelector("#lendingContactNote").value.trim()
  };

  if (!payload.date || !payload.value || !payload.note) {
    showLendingContactMessage("Date, contact value, and note are required.", "error");
    return;
  }

  setLendingContactSaving(true);
  showLendingContactMessage(lendingContactEditTarget ? "Updating contact note..." : "Saving contact note...", "info");

  try {
    const result = lendingContactEditTarget
      ? await window.crmApi.updateLendingContact(payload)
      : await window.crmApi.createLendingContact(payload);

    activeLendingProfile.contactHistory = lendingContactEditTarget
      ? activeLendingProfile.contactHistory.map((contact) => contact.dbId === lendingContactEditTarget.dbId ? result.record : contact)
      : [result.record, ...activeLendingProfile.contactHistory];

    clearLendingContactEditMode();
    renderContacts(activeLendingProfile.contactHistory);
    showLendingContactMessage(result.message || "Lending contact note saved.", "success");
  } catch (error) {
    showLendingContactMessage(error.message || "Lending contact note could not be saved.", "error");
  } finally {
    setLendingContactSaving(false);
  }
}

async function handleLendingContactAction(event) {
  const editButton = event.target.closest("[data-edit-lending-contact]");
  const removeButton = event.target.closest("[data-remove-lending-contact]");

  if (!editButton && !removeButton) {
    return;
  }

  const id = Number((editButton || removeButton).dataset.editLendingContact || (editButton || removeButton).dataset.removeLendingContact);
  const contact = activeLendingProfile.contactHistory.find((item) => item.dbId === id);

  if (editButton) {
    startLendingContactEdit(contact);
    return;
  }

  if (!contact || !canManageContact(contact)) {
    showLendingContactMessage("Only prototype-created contact notes can be removed.", "error");
    return;
  }

  if (!window.confirm("Remove this lending contact note?")) {
    return;
  }

  try {
    const result = await window.crmApi.deleteLendingContact(contact);
    activeLendingProfile.contactHistory = activeLendingProfile.contactHistory.filter((item) => item !== contact);
    renderContacts(activeLendingProfile.contactHistory);
    showLendingContactMessage(result.message || "Lending contact note removed.", "success");
  } catch (error) {
    showLendingContactMessage(error.message || "Lending contact note could not be removed.", "error");
  }
}

function startLendingContactEdit(contact) {
  if (!contact || !canManageContact(contact)) {
    showLendingContactMessage("Only prototype-created contact notes can be edited.", "error");
    return;
  }

  lendingContactEditTarget = contact;
  document.querySelector("#lendingContactType").value = contact.type;
  document.querySelector("#lendingContactDate").value = contact.date;
  document.querySelector("#lendingContactValue").value = contact.value;
  document.querySelector("#lendingContactNote").value = contact.note;
  lendingContactCancelButton.classList.remove("hidden");
  setLendingContactSaving(false);
  showLendingContactMessage("Editing contact note. Save changes or cancel.", "info");
}

function clearLendingContactEditMode() {
  lendingContactEditTarget = null;
  lendingContactForm?.reset();
  lendingContactCancelButton?.classList.add("hidden");
  setLendingContactSaving(false);
}

function canManageContact(contact) {
  return Boolean(contact && contact.userCreated && (!window.crmHasPermission || window.crmHasPermission("manage_lending_notes")));
}

function setLendingSaving(isSaving) {
  const button = document.querySelector("#lendingSaveButton");
  if (button) {
    button.disabled = isSaving;
    button.textContent = isSaving ? "Saving..." : "Save profile";
  }
}

function setLendingContactSaving(isSaving) {
  const button = document.querySelector("#lendingContactSaveButton");
  if (button) {
    button.disabled = isSaving;
    button.textContent = isSaving ? "Saving..." : (lendingContactEditTarget ? "Save contact note" : "Add contact note");
  }
}

function showLendingEditMessage(message, type) {
  showMessage("#lendingEditMessage", message, type);
}

function showLendingContactMessage(message, type) {
  showMessage("#lendingContactMessage", message, type);
}

function showDocumentMessage(message, type) {
  showMessage("#lendingDocumentMessage", message, type);
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

function showLendingNotFound(message) {
  document.querySelector("#lendingProfile").classList.add("hidden");
  document.querySelector("#lendingNotFoundState").classList.remove("hidden");
  document.querySelector("#lendingNotFoundMessage").textContent = message;
}
