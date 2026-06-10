const businessParams = new URLSearchParams(window.location.search);
const businessId = businessParams.get("businessId");
const activeBusinessRole = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";
const businessEditForm = document.querySelector("#businessEditForm");
const businessEditButton = document.querySelector("#editBusinessButton");
const businessCancelEditButton = document.querySelector("#businessCancelEditButton");
const businessEditMessage = document.querySelector("#businessEditMessage");
let activeBusiness = null;

initBusinessProfile();

if (businessEditButton) {
  businessEditButton.addEventListener("click", startBusinessEdit);
}

if (businessCancelEditButton) {
  businessCancelEditButton.addEventListener("click", clearBusinessEditMode);
}

if (businessEditForm) {
  businessEditForm.addEventListener("submit", handleBusinessUpdate);
}

async function initBusinessProfile() {
  if (window.crmHasAnyPermission && !window.crmHasAnyPermission(["search_businesses", "search_employee_businesses"])) {
    showBusinessNotFound("Business account lookup is restricted for this role.");
    return;
  }

  const business = await window.crmApi.findBusiness("businessId", businessId);

  if (!business) {
    showBusinessNotFound("No matching business account was found.");
    return;
  }

  renderBusiness(business);
}

function renderBusiness(business) {
  activeBusiness = business;
  document.querySelector("#businessNotFoundState").classList.add("hidden");
  document.querySelector("#businessProfile").classList.remove("hidden");
  businessEditButton?.classList.toggle("hidden", window.crmHasPermission && !window.crmHasPermission("edit_businesses"));
  document.querySelector("#businessName").textContent = business.businessName;
  document.querySelector("#businessMeta").textContent = `${business.businessId} | ${business.ownerType} relationship`;
  document.querySelector("#businessStatus").textContent = business.status;
  document.querySelector("#businessValue").textContent = window.crmFormatCurrency(business.relationshipValue);
  document.querySelector("#businessOwnerType").textContent = business.ownerType;
  document.querySelector("#businessBanker").textContent = business.banker;
  document.querySelector("#businessId").textContent = business.businessId;
  document.querySelector("#businessOwner").textContent = business.ownerName;
  document.querySelector("#businessProducts").textContent = business.products;
  document.querySelector("#businessOpportunity").textContent = business.lendingOpportunity;

  renderLinkedRecord(business);
}

function startBusinessEdit() {
  if (!activeBusiness || (window.crmHasPermission && !window.crmHasPermission("edit_businesses"))) {
    showBusinessMessage("This role cannot edit business account fields.", "error");
    return;
  }

  businessEditForm.classList.remove("hidden");
  businessEditButton.classList.add("hidden");
  document.querySelector("#businessNameField").value = activeBusiness.businessName || "";
  document.querySelector("#businessOwnerField").value = activeBusiness.ownerName || "";
  document.querySelector("#businessOwnerTypeField").value = activeBusiness.ownerType || "";
  document.querySelector("#businessValueField").value = activeBusiness.relationshipValue || 0;
  document.querySelector("#businessStatusField").value = activeBusiness.status || "";
  document.querySelector("#businessBankerField").value = activeBusiness.banker || "";
  document.querySelector("#businessProductsField").value = activeBusiness.products || "";
  document.querySelector("#businessOpportunityField").value = activeBusiness.lendingOpportunity || "";
  showBusinessMessage("Editing business account. Save changes or cancel.", "info");
}

function clearBusinessEditMode() {
  businessEditForm?.classList.add("hidden");
  businessEditButton?.classList.remove("hidden");
  businessEditForm?.reset();
  clearBusinessErrors();
}

async function handleBusinessUpdate(event) {
  event.preventDefault();

  if (!activeBusiness) {
    return;
  }

  const validation = validateBusinessForm();
  if (!validation.valid) {
    showBusinessMessage("Fix the highlighted fields before saving.", "error");
    return;
  }

  setBusinessSubmitting(true);
  showBusinessMessage("Saving business edits...", "info");

  try {
    const result = await window.crmApi.updateBusiness({
      businessId: activeBusiness.businessId,
      ...validation.values
    });
    renderBusiness(result.record);
    clearBusinessEditMode();
    showBusinessMessage(result.message || "Business account updated.", "success");
  } catch (error) {
    applyBusinessErrors(error.fieldErrors || {});
    showBusinessMessage(error.message || "Business account could not be updated.", "error");
  } finally {
    setBusinessSubmitting(false);
  }
}

function validateBusinessForm() {
  const relationshipValue = Number(document.querySelector("#businessValueField")?.value || 0);
  const values = {
    businessName: document.querySelector("#businessNameField")?.value.trim() || "",
    ownerName: document.querySelector("#businessOwnerField")?.value.trim() || "",
    ownerType: document.querySelector("#businessOwnerTypeField")?.value.trim() || "",
    relationshipValue: Math.round(relationshipValue),
    status: document.querySelector("#businessStatusField")?.value.trim() || "",
    banker: document.querySelector("#businessBankerField")?.value.trim() || "",
    products: document.querySelector("#businessProductsField")?.value.trim() || "",
    lendingOpportunity: document.querySelector("#businessOpportunityField")?.value.trim() || ""
  };
  const errors = {};

  if (!values.businessName) errors.businessName = "Business name is required.";
  if (!values.ownerName) errors.businessOwner = "Owner is required.";
  if (!values.ownerType) errors.businessOwnerType = "Owner type is required.";
  if (!Number.isFinite(relationshipValue) || relationshipValue < 0) errors.businessValue = "Relationship value must be positive.";
  if (!values.status) errors.businessStatus = "Status is required.";
  if (!values.banker) errors.businessBanker = "Banker is required.";
  if (!values.products) errors.businessProducts = "Products are required.";
  if (!values.lendingOpportunity) errors.businessOpportunity = "Lending opportunity is required.";

  applyBusinessErrors(errors);
  return {
    valid: Object.keys(errors).length === 0,
    values,
    errors
  };
}

function applyBusinessErrors(errors) {
  clearBusinessErrors();
  Object.entries(errors).forEach(([field, message]) => {
    const error = document.querySelector(`[data-error-for="${field}"]`);
    const input = {
      businessName: document.querySelector("#businessNameField"),
      businessOwner: document.querySelector("#businessOwnerField"),
      businessOwnerType: document.querySelector("#businessOwnerTypeField"),
      businessValue: document.querySelector("#businessValueField"),
      businessStatus: document.querySelector("#businessStatusField"),
      businessBanker: document.querySelector("#businessBankerField"),
      businessProducts: document.querySelector("#businessProductsField"),
      businessOpportunity: document.querySelector("#businessOpportunityField")
    }[field];
    if (error) error.textContent = message;
    if (input) input.classList.add("field-invalid");
  });
}

function clearBusinessErrors() {
  document.querySelectorAll("[data-error-for^='business']").forEach((error) => {
    error.textContent = "";
  });
  [
    "#businessNameField",
    "#businessOwnerField",
    "#businessOwnerTypeField",
    "#businessValueField",
    "#businessStatusField",
    "#businessBankerField",
    "#businessProductsField",
    "#businessOpportunityField"
  ].forEach((selector) => document.querySelector(selector)?.classList.remove("field-invalid"));
}

function showBusinessMessage(message, type) {
  if (!businessEditMessage) {
    return;
  }

  businessEditMessage.textContent = message;
  businessEditMessage.className = `form-message ${type}`;
  businessEditMessage.classList.remove("hidden");
}

function setBusinessSubmitting(isSubmitting) {
  const button = document.querySelector("#businessSaveButton");
  if (button) {
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? "Saving..." : "Save business";
  }
}

async function renderLinkedRecord(business) {
  const container = document.querySelector("#businessLinkedRecord");
  const linkedCustomer = business.linkedAccountNumber ? await window.crmApi.findCustomer("accountNumber", business.linkedAccountNumber) : null;
  const linkedEmployee = business.linkedEmployeeId ? await window.crmApi.findEmployee("employeeId", business.linkedEmployeeId) : null;

  container.innerHTML = "";

  if (linkedCustomer) {
    const link = document.createElement("a");
    link.className = "pipeline-item";
    link.href = window.crmClientUrl(linkedCustomer.accountNumber);
    link.innerHTML = `
      <div>
        <strong>${linkedCustomer.name}</strong>
        <span>Customer account ${linkedCustomer.accountNumber}</span>
      </div>
      <div class="record-meta"><strong>${linkedCustomer.cif}</strong></div>
    `;
    container.appendChild(link);
    return;
  }

  if (linkedEmployee) {
    const item = document.createElement("section");
    item.className = "pipeline-item";
    item.innerHTML = `
      <div>
        <strong>${linkedEmployee.name}</strong>
        <span>Employee disclosure ${linkedEmployee.employeeId}</span>
      </div>
      <div class="record-meta"><strong>${linkedEmployee.department}</strong></div>
    `;
    container.appendChild(item);
    return;
  }

  const item = document.createElement("section");
  item.className = "pipeline-item";
  item.innerHTML = `
    <div>
      <strong>Standalone business client</strong>
      <span>No linked retail customer or employee record for this prototype account.</span>
    </div>
    <div class="record-meta"><strong>${business.ownerType}</strong></div>
  `;
  container.appendChild(item);
}

function showBusinessNotFound(message) {
  document.querySelector("#businessProfile").classList.add("hidden");
  document.querySelector("#businessNotFoundState").classList.remove("hidden");
  document.querySelector("#businessNotFoundState p").textContent = message;
}
