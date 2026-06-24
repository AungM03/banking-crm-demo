let activeMethod = null;
let cards = [];

const form = document.querySelector("#searchForm");
const input = document.querySelector("#searchInput");
const lookupEyebrow = document.querySelector("#lookupEyebrow");
const lookupTitle = document.querySelector("#lookupTitle");
const lookupNote = document.querySelector("#lookupNote");
const lookupAccessNotice = document.querySelector("#lookupAccessNotice");
const lookupAccessMessage = document.querySelector("#lookupAccessMessage");
const searchMethods = document.querySelector("#searchMethods");
const activeMethodLabel = document.querySelector("#activeMethodLabel");
const formTitle = document.querySelector("#formTitle");
const inputLabel = document.querySelector("#inputLabel");
const inputHint = document.querySelector("#inputHint");
const lookupPanel = document.querySelector("#lookupPanel");
const formError = document.querySelector("#formError");
const searchButton = document.querySelector("#searchButton");
const activeRole = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";
const lookupProfile = window.crmLookupProfiles[activeRole] || window.crmLookupProfiles.admin;

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const value = input.value.trim();
  searchButton.disabled = true;
  const record = activeMethod ? await window.crmApi.findLookupRecord(activeMethod.target, activeMethod.key, value) : null;
  searchButton.disabled = false;

  if (!record) {
    formError.textContent = window.crmLastApiError
      ? "Restricted Access: this role cannot open that data type."
      : `No ${getRecordLabel()} record found for "${value}". Try the sample value shown above.`;
    formError.classList.remove("hidden");
    return;
  }

  window.location.href = getResultUrl(record, value);
});

renderLookupProfile();

function renderLookupProfile() {
  lookupEyebrow.textContent = lookupProfile.eyebrow;
  lookupTitle.textContent = lookupProfile.title;
  lookupNote.textContent = lookupProfile.note;

  if (lookupProfile.methods.length === 0) {
    searchMethods.classList.add("hidden");
    lookupPanel.classList.add("hidden");
    lookupAccessMessage.textContent = lookupProfile.noAccessMessage;
    lookupAccessNotice.classList.remove("hidden");
    return;
  }

  lookupAccessNotice.classList.add("hidden");
  searchMethods.classList.remove("hidden");
  searchMethods.innerHTML = "";

  cards = lookupProfile.methods.map((method, index) => {
    const card = document.createElement("button");
    card.className = "search-card";
    card.type = "button";
    card.dataset.methodIndex = index;
    card.innerHTML = `
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong>${method.label}</strong>
    `;
    card.addEventListener("click", () => {
      setSearchMethod(index);
    });
    searchMethods.appendChild(card);
    return card;
  });

  setSearchMethod(0);
}

function setSearchMethod(index) {
  activeMethod = lookupProfile.methods[index];
  lookupPanel.classList.remove("hidden");
  formError.classList.add("hidden");

  cards.forEach((card) => {
    card.classList.toggle("active", Number(card.dataset.methodIndex) === index);
  });

  activeMethodLabel.textContent = activeMethod.methodLabel;
  formTitle.textContent = activeMethod.formTitle;
  inputLabel.textContent = activeMethod.inputLabel;
  inputHint.textContent = activeMethod.hint;
  input.value = activeMethod.example;
  input.focus();
  input.select();
}

function getResultUrl(record, value) {
  if (activeMethod.target === "employee") {
    return window.crmUrlWithRole(`employee.html?employeeId=${encodeURIComponent(record.employeeId)}`);
  }

  if (activeMethod.target === "business") {
    return window.crmUrlWithRole(`business.html?businessId=${encodeURIComponent(record.businessId)}`);
  }

  if (activeMethod.target === "wealth") {
    return window.crmUrlWithRole(`wealth.html?accountNumber=${encodeURIComponent(record.accountNumber)}`);
  }

  if (activeMethod.target === "loanCustomer") {
    return window.crmUrlWithRole(`lending.html?accountNumber=${encodeURIComponent(record.accountNumber)}`);
  }

  if (activeMethod.target === "segment" || activeMethod.target === "offer") {
    return `home.html?role=${encodeURIComponent(activeRole)}#opportunitiesPanel`;
  }

  if (activeMethod.target === "fraud") {
    return window.crmUrlWithRole(`fraud.html?accountNumber=${encodeURIComponent(record.accountNumber)}`);
  }

  const params = new URLSearchParams({
    type: activeMethod.key,
    value
  });

  return window.crmUrlWithRole(`client.html?${params.toString()}`);
}

function getRecordLabel() {
  if (!activeMethod) {
    return "lookup";
  }

  if (activeMethod.target === "loanCustomer") {
    return "loan customer";
  }

  return activeMethod.target === "fraud" ? "fraud" : activeMethod.target;
}
