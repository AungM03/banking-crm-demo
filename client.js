const params = new URLSearchParams(window.location.search);
const searchType = params.get("type");
const searchValue = params.get("value");
const config = window.crmSearchConfig[searchType];
const noteForm = document.querySelector("#noteForm");
const noteText = document.querySelector("#noteText");
const noteMessage = document.querySelector("#noteMessage");
const noteList = document.querySelector("#noteList");
const noteCancelEditButton = document.querySelector("#noteCancelEditButton");
const customerEditForm = document.querySelector("#customerEditForm");
const customerEditButton = document.querySelector("#editCustomerButton");
const customerCancelEditButton = document.querySelector("#customerCancelEditButton");
const customerEditMessage = document.querySelector("#customerEditMessage");
const activeClientRole = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";
let activeCustomer = null;
let noteEditTarget = null;

if (noteForm) {
  noteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!activeCustomer || !noteText.value.trim()) {
      showNoteMessage("Add a bank note before saving.", "error");
      return;
    }

    const text = noteText.value.trim();

    if (text.length > 500) {
      showNoteMessage("Bank notes must be 500 characters or fewer.", "error");
      return;
    }

    setNoteSubmitting(true);
    showNoteMessage(noteEditTarget ? "Saving bank note edits..." : "Saving bank note...", "info");

    try {
      const result = noteEditTarget
        ? await window.crmApi.updateBankNote({
            ...noteEditTarget,
            text
          })
        : await window.crmApi.createBankNote({
            accountNumber: activeCustomer.accountNumber,
            text
          });

      if (noteEditTarget) {
        activeCustomer.notes = activeCustomer.notes.map((note) => (
          note === noteEditTarget || note.dbId === noteEditTarget.dbId ? result.record : note
        ));
      } else {
        activeCustomer.notes.unshift(result.record);
      }

      noteText.value = "";
      clearNoteEditMode(false);
      renderNotes(activeCustomer.notes);
      showNoteMessage(result.message || "Bank note saved.", "success");
    } catch (error) {
      showNoteMessage(error.message || "Bank note could not be saved.", "error");
    } finally {
      setNoteSubmitting(false);
    }
  });
}

if (noteList) {
  noteList.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-note]");
    const removeButton = event.target.closest("[data-remove-note]");

    if ((!editButton && !removeButton) || !activeCustomer) {
      return;
    }

    const actionButton = editButton || removeButton;
    const dbId = actionButton.dataset.noteDbId ? Number(actionButton.dataset.noteDbId) : null;
    const localId = actionButton.dataset.noteLocalId || "";
    const note = activeCustomer.notes.find((item) => {
      return (localId && item.localId === localId) || (dbId && item.dbId === dbId);
    });

    if (editButton) {
      startNoteEdit(note);
      return;
    }

    if (!note || !canRemoveNote(note)) {
      showNoteMessage("Only notes added by the active user can be removed.", "error");
      return;
    }

    if (!window.confirm("Remove this bank note?")) {
      return;
    }

    removeButton.disabled = true;
    removeButton.textContent = "Removing...";

    try {
      const result = await window.crmApi.deleteBankNote(note);
      activeCustomer.notes = activeCustomer.notes.filter((item) => item !== note);
      renderNotes(activeCustomer.notes);
      showNoteMessage(result.message || "Bank note removed.", "success");
    } catch (error) {
      showNoteMessage(error.message || "Bank note could not be removed.", "error");
      removeButton.disabled = false;
      removeButton.textContent = "Remove";
    }
  });
}

if (noteCancelEditButton) {
  noteCancelEditButton.addEventListener("click", clearNoteEditMode);
}

if (customerEditButton) {
  customerEditButton.addEventListener("click", startCustomerEdit);
}

if (customerCancelEditButton) {
  customerCancelEditButton.addEventListener("click", clearCustomerEditMode);
}

if (customerEditForm) {
  customerEditForm.addEventListener("submit", handleCustomerUpdate);
}

initClientProfile();

async function initClientProfile() {
  if (window.crmHasAnyPermission && !window.crmHasAnyPermission(["search_customers", "search_wealth_customers", "search_loan_customers"])) {
    showRestrictedAccess("Customer profiles are restricted for this role.");
    return;
  }

  const customer = config ? await window.crmApi.findCustomer(searchType, searchValue) : null;

  if (!customer) {
    showNotFound();
    return;
  }

  renderClient(customer);
}

function renderClient(customer) {
  activeCustomer = customer;

  document.querySelector("#notFoundState").classList.add("hidden");
  document.querySelector("#clientProfile").classList.remove("hidden");
  customerEditButton?.classList.toggle("hidden", window.crmHasPermission && !window.crmHasPermission("edit_customers"));

  document.querySelector("#customerName").textContent = customer.name;
  document.querySelector("#customerMeta").textContent = `Account ${customer.accountNumber} | ${customer.cif}`;
  document.querySelector("#fraudScore").textContent = `${customer.fraudRiskScore} / 100`;
  renderFraudScoreCard(customer);
  document.querySelector("#discoverNeedsLink").href = window.crmUrlWithRole(`discover.html?accountNumber=${encodeURIComponent(customer.accountNumber)}`);
  document.querySelector("#discoverNeedsCount").textContent = `${customer.discoverNeeds.length} recommendations`;
  renderDepartmentLinks(customer);

  document.querySelector("#householdBalance").textContent = window.crmFormatCurrency(customer.household);
  document.querySelector("#checkingBalance").textContent = window.crmFormatCurrency(customer.checking);
  document.querySelector("#savingsBalance").textContent = window.crmFormatCurrency(customer.savings);
  document.querySelector("#totalLoans").textContent = window.crmFormatCurrency(getTotalLoanBalance(customer.loans));
  document.querySelector("#investedBalance").textContent = window.crmFormatCurrency(customer.investedBalance);
  document.querySelector("#affluencyTier").textContent = `Affluency Tier ${customer.affluencyTier} of 3`;
  document.querySelector("#profitabilityTier").textContent = customer.profitability.tier;
  document.querySelector("#annualContribution").textContent = `${window.crmFormatCurrency(customer.profitability.annualContribution)} annual contribution`;

  document.querySelector("#accountNumber").textContent = customer.accountNumber;
  document.querySelector("#accountOpened").textContent = customer.accounts[0].openDate;
  document.querySelector("#cif").textContent = customer.cif;
  document.querySelector("#ssn").textContent = window.crmMaskSsn(customer.ssn);
  document.querySelector("#dob").textContent = customer.dob;
  document.querySelector("#zip").textContent = customer.zip;
  document.querySelector("#address").textContent = customer.address;
  document.querySelector("#phone").textContent = customer.phone;
  document.querySelector("#email").textContent = customer.email;
  document.querySelector("#personalBanker").textContent = customer.personalBanker;
  document.querySelector("#wealthAdvisor").textContent = customer.wealthAdvisor;

  renderRoleRestrictions(customer);

  renderAccounts(customer.accounts);
  renderHousehold(customer.householdMembers);
  renderLoans(customer.loans);
  renderBusinessAccounts(customer.businessAccounts);
  renderProfitability(customer.profitability);
  renderAffluency(customer.affluencyTier);
  renderServiceWorkflow(customer);
}

function renderDepartmentLinks(customer) {
  const wealthLink = document.querySelector("#wealthProfileLink");
  const lendingLink = document.querySelector("#lendingProfileLink");
  const canOpenWealth = (!window.crmHasPermission || window.crmHasPermission("view_wealth_profile")) && window.crmIsWealthClient(customer);
  const canOpenLending = (!window.crmHasPermission || window.crmHasPermission("view_lending_profile")) && customer.loans.length > 0;

  if (wealthLink) {
    wealthLink.href = window.crmUrlWithRole(`wealth.html?accountNumber=${encodeURIComponent(customer.accountNumber)}`);
    wealthLink.classList.toggle("hidden", !canOpenWealth);
  }

  if (lendingLink) {
    lendingLink.href = window.crmUrlWithRole(`lending.html?accountNumber=${encodeURIComponent(customer.accountNumber)}`);
    lendingLink.classList.toggle("hidden", !canOpenLending);
  }
}

function renderRoleRestrictions(customer) {
  if (customer.wealthDataAccess === "restricted") {
    document.querySelector("#investedBalance").textContent = "Restricted";
    document.querySelector("#affluencyTier").textContent = "Wealth data hidden";
    document.querySelector("#wealthAdvisor").textContent = "Restricted to Wealth";
  }

  if (customer.limitedProfile) {
    document.querySelector("#householdBalance").textContent = window.crmFormatCurrency(getTotalLoanBalance(customer.loans));
    document.querySelector("#checkingBalance").textContent = "Limited";
    document.querySelector("#savingsBalance").textContent = "Limited";
  }
}

function renderFraudScoreCard(customer) {
  const fraudCard = document.querySelector("#fraudMatrixLink");
  const canOpenFraudDetails = activeClientRole === "admin";

  document.querySelector("#fraudTier").textContent = canOpenFraudDetails
    ? `${customer.fraudRiskTier} Risk`
    : `${customer.fraudRiskTier} Risk | Score only`;

  fraudCard.className = `profile-action-card fraud-matrix-card risk-${customer.fraudRiskTier.toLowerCase()}`;

  if (canOpenFraudDetails) {
    fraudCard.href = window.crmUrlWithRole(`fraud.html?accountNumber=${encodeURIComponent(customer.accountNumber)}`);
    fraudCard.removeAttribute("aria-disabled");
    fraudCard.removeAttribute("title");
    return;
  }

  fraudCard.removeAttribute("href");
  fraudCard.setAttribute("aria-disabled", "true");
  fraudCard.setAttribute("title", "Bankers and lending users can see the score summary only. Full fraud details are restricted to Admin and Fraud.");
  fraudCard.classList.add("score-only");
}

function renderAffluency(tier) {
  document.querySelectorAll("[data-tier-dot]").forEach((dot) => {
    dot.classList.toggle("active", Number(dot.dataset.tierDot) <= tier);
  });
}

function renderServiceWorkflow(customer) {
  renderAlerts(customer.alerts);
  renderNotes(customer.notes);
}

function renderAlerts(alerts) {
  const alertList = document.querySelector("#alertList");
  alertList.innerHTML = "";

  alerts.forEach((alert) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${alert.type}</strong><span>${alert.label}</span>`;
    alertList.appendChild(item);
  });
}

function renderNotes(notes) {
  const noteList = document.querySelector("#noteList");
  noteList.innerHTML = "";

  notes.forEach((note) => {
    const item = document.createElement("section");
    item.className = "note-item";
    item.innerHTML = `
      <div>
        <strong>${note.author}</strong>
        <span>${note.date}</span>
      </div>
      <p>${note.text}</p>
      ${canEditNote(note) || canRemoveNote(note) ? `
        <div class="table-actions">
          ${canEditNote(note) ? `<button class="secondary-button compact-button" type="button" data-edit-note data-note-db-id="${note.dbId || ""}" data-note-local-id="${note.localId || ""}">Edit</button>` : ""}
          ${canRemoveNote(note) ? `<button class="danger-button compact-button" type="button" data-remove-note data-note-db-id="${note.dbId || ""}" data-note-local-id="${note.localId || ""}">Remove</button>` : ""}
        </div>
      ` : ""}
    `;
    noteList.appendChild(item);
  });
}

function startNoteEdit(note) {
  if (!note || !canEditNote(note)) {
    showNoteMessage("Only notes added by the active user can be edited.", "error");
    return;
  }

  noteEditTarget = note;
  noteText.value = note.text || "";
  noteCancelEditButton.classList.remove("hidden");
  setNoteSubmitting(false);
  showNoteMessage("Editing bank note. Save changes or cancel.", "info");
  noteText.focus();
}

function clearNoteEditMode(resetInput = true) {
  noteEditTarget = null;
  if (resetInput) {
    noteText.value = "";
  }
  noteCancelEditButton?.classList.add("hidden");
  setNoteSubmitting(false);
}

function canEditNote(note) {
  return Boolean(note && note.author === getActiveNoteAuthor() && note.dbId && (!window.crmHasPermission || window.crmHasPermission("edit_bank_notes")));
}

function canRemoveNote(note) {
  return Boolean(note && note.author === getActiveNoteAuthor() && (note.dbId || note.localId));
}

function getActiveNoteAuthor() {
  const user = window.crmGetActiveUser ? window.crmGetActiveUser() : null;
  const role = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";
  const profile = window.crmRoleProfiles ? window.crmRoleProfiles[role] : null;

  return user?.name || profile?.name || "Current User";
}

function showNoteMessage(message, type) {
  if (!noteMessage) {
    return;
  }

  noteMessage.textContent = message;
  noteMessage.className = `form-message ${type}`;
  noteMessage.classList.remove("hidden");
}

function setNoteSubmitting(isSubmitting) {
  const button = noteForm.querySelector("button[type='submit']");

  if (button) {
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? "Saving..." : (noteEditTarget ? "Save" : "Add");
  }
}

function startCustomerEdit() {
  if (!activeCustomer || (window.crmHasPermission && !window.crmHasPermission("edit_customers"))) {
    showCustomerMessage("This role cannot edit customer profile fields.", "error");
    return;
  }

  customerEditForm.classList.remove("hidden");
  customerEditButton.classList.add("hidden");
  document.querySelector("#customerZipField").value = activeCustomer.zip || "";
  document.querySelector("#customerPhoneField").value = activeCustomer.phone || "";
  document.querySelector("#customerEmailField").value = activeCustomer.email || "";
  document.querySelector("#customerBranchField").value = activeCustomer.primaryBranch || "";
  document.querySelector("#customerBankerField").value = activeCustomer.personalBanker || "";
  document.querySelector("#customerWealthField").value = activeCustomer.wealthAdvisor || "";
  document.querySelector("#customerAddressField").value = activeCustomer.address || "";
  showCustomerMessage("Editing client details. Save changes or cancel.", "info");
}

function clearCustomerEditMode() {
  customerEditForm?.classList.add("hidden");
  customerEditButton?.classList.remove("hidden");
  customerEditForm?.reset();
  clearCustomerErrors();
}

async function handleCustomerUpdate(event) {
  event.preventDefault();

  if (!activeCustomer) {
    return;
  }

  const validation = validateCustomerForm();
  if (!validation.valid) {
    showCustomerMessage("Fix the highlighted fields before saving.", "error");
    return;
  }

  setCustomerSubmitting(true);
  showCustomerMessage("Saving customer edits...", "info");

  try {
    const result = await window.crmApi.updateCustomer({
      accountNumber: activeCustomer.accountNumber,
      ...validation.values
    });
    renderClient(result.record);
    clearCustomerEditMode();
    showCustomerMessage(result.message || "Customer updated.", "success");
  } catch (error) {
    applyCustomerErrors(error.fieldErrors || {});
    showCustomerMessage(error.message || "Customer could not be updated.", "error");
  } finally {
    setCustomerSubmitting(false);
  }
}

function validateCustomerForm() {
  const values = {
    zip: document.querySelector("#customerZipField")?.value.trim() || "",
    phone: document.querySelector("#customerPhoneField")?.value.trim() || "",
    email: document.querySelector("#customerEmailField")?.value.trim() || "",
    primaryBranch: document.querySelector("#customerBranchField")?.value.trim() || "",
    personalBanker: document.querySelector("#customerBankerField")?.value.trim() || "",
    wealthAdvisor: document.querySelector("#customerWealthField")?.value.trim() || "",
    address: document.querySelector("#customerAddressField")?.value.trim() || ""
  };
  const errors = {};

  if (!values.zip) errors.customerZip = "ZIP is required.";
  if (!values.phone) errors.customerPhone = "Phone is required.";
  if (!values.email || !values.email.includes("@")) errors.customerEmail = "Use a valid email address.";
  if (!values.primaryBranch) errors.customerBranch = "Primary branch is required.";
  if (!values.personalBanker) errors.customerBanker = "Personal banker is required.";
  if (!values.wealthAdvisor) errors.customerWealth = "Wealth advisor is required.";
  if (!values.address) errors.customerAddress = "Address is required.";

  applyCustomerErrors(errors);
  return {
    valid: Object.keys(errors).length === 0,
    values,
    errors
  };
}

function applyCustomerErrors(errors) {
  clearCustomerErrors();
  Object.entries(errors).forEach(([field, message]) => {
    const error = document.querySelector(`[data-error-for="${field}"]`);
    const input = {
      customerZip: document.querySelector("#customerZipField"),
      customerPhone: document.querySelector("#customerPhoneField"),
      customerEmail: document.querySelector("#customerEmailField"),
      customerBranch: document.querySelector("#customerBranchField"),
      customerBanker: document.querySelector("#customerBankerField"),
      customerWealth: document.querySelector("#customerWealthField"),
      customerAddress: document.querySelector("#customerAddressField")
    }[field];
    if (error) error.textContent = message;
    if (input) input.classList.add("field-invalid");
  });
}

function clearCustomerErrors() {
  document.querySelectorAll("[data-error-for^='customer']").forEach((error) => {
    error.textContent = "";
  });
  [
    "#customerZipField",
    "#customerPhoneField",
    "#customerEmailField",
    "#customerBranchField",
    "#customerBankerField",
    "#customerWealthField",
    "#customerAddressField"
  ].forEach((selector) => document.querySelector(selector)?.classList.remove("field-invalid"));
}

function showCustomerMessage(message, type) {
  if (!customerEditMessage) {
    return;
  }

  customerEditMessage.textContent = message;
  customerEditMessage.className = `form-message ${type}`;
  customerEditMessage.classList.remove("hidden");
}

function setCustomerSubmitting(isSubmitting) {
  const button = document.querySelector("#customerSaveButton");
  if (button) {
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? "Saving..." : "Save customer";
  }
}

function renderAccounts(accounts) {
  const accountList = document.querySelector("#accountList");
  accountList.innerHTML = "";

  accounts.forEach((account) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <div>
        <strong>${account.type}</strong>
        <span>${account.status} | Opened ${account.openDate}</span>
      </div>
      <div class="record-meta">
        <span>${account.account}</span>
        <strong>${window.crmFormatCurrency(account.balance)}</strong>
      </div>
    `;
    accountList.appendChild(item);
  });
}

function renderHousehold(members) {
  const householdList = document.querySelector("#householdList");
  householdList.innerHTML = "";

  members.forEach((member) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <div>
        <strong>${member.name}</strong>
        <span>${member.products}</span>
      </div>
      <div class="record-meta">
        <span>${member.relationship}</span>
      </div>
    `;
    householdList.appendChild(item);
  });
}

function renderLoans(loans) {
  const loanList = document.querySelector("#loanList");
  loanList.innerHTML = "";

  if (loans.length === 0) {
    const item = document.createElement("li");
    item.innerHTML = `
      <div>
        <strong>No active loans</strong>
        <span>This customer has no current lending products.</span>
      </div>
      <div class="record-meta">
        <strong>$0</strong>
      </div>
    `;
    loanList.appendChild(item);
    return;
  }

  loans.forEach((loan) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <div>
        <strong>${loan.type}</strong>
        <span>${loan.status} | ${loan.paymentStatus}</span>
      </div>
      <div class="record-meta">
        <strong>${window.crmFormatCurrency(loan.balance)}</strong>
      </div>
    `;
    loanList.appendChild(item);
  });
}

function renderBusinessAccounts(businessAccounts) {
  const businessList = document.querySelector("#businessList");
  businessList.innerHTML = "";

  if (businessAccounts.length === 0) {
    const item = document.createElement("li");
    item.innerHTML = `
      <div>
        <strong>No linked business accounts</strong>
        <span>No active commercial relationship on file.</span>
      </div>
      <div class="record-meta">
        <strong>$0</strong>
      </div>
    `;
    businessList.appendChild(item);
    return;
  }

  businessAccounts.forEach((business) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <div>
        <strong>${business.businessName}</strong>
        <span>${business.role} | ${business.products}</span>
      </div>
      <div class="record-meta">
        <span>Business value</span>
        <strong>${window.crmFormatCurrency(business.relationshipValue)}</strong>
      </div>
    `;
    businessList.appendChild(item);
  });
}

function renderProfitability(profitability) {
  document.querySelector("#profitabilityDetailTier").textContent = profitability.tier;
  document.querySelector("#profitabilityAnnual").textContent = window.crmFormatCurrency(profitability.annualContribution);
  document.querySelector("#profitabilityDriver").textContent = profitability.mainDriver;
  document.querySelector("#profitabilityWatchItem").textContent = profitability.watchItem;
}

function getTotalLoanBalance(loans) {
  return loans.reduce((total, loan) => total + loan.balance, 0);
}

function showNotFound(customMessage) {
  document.querySelector("#clientProfile").classList.add("hidden");
  document.querySelector("#notFoundState").classList.remove("hidden");
  document.querySelector("#notFoundTitle").textContent = "Client not found";

  const message = customMessage || (searchValue
    ? `No client matched "${searchValue}". Please return to lookup and try another test case.`
    : "No lookup value was provided. Please return to lookup and choose a search method.");

  document.querySelector("#notFoundMessage").textContent = message;
}

function showRestrictedAccess(message) {
  document.querySelector("#clientProfile").classList.add("hidden");
  document.querySelector("#notFoundState").classList.remove("hidden");
  document.querySelector("#notFoundTitle").textContent = "Restricted access";
  document.querySelector("#notFoundMessage").textContent = message || "This role cannot open this customer profile.";
}
