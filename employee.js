const employeeParams = new URLSearchParams(window.location.search);
const employeeId = employeeParams.get("employeeId");
const role = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";
const employeeEditForm = document.querySelector("#employeeEditForm");
const employeeEditButton = document.querySelector("#editEmployeeButton");
const employeeCancelEditButton = document.querySelector("#employeeCancelEditButton");
const employeeEditMessage = document.querySelector("#employeeEditMessage");
let activeEmployee = null;

initEmployeeProfile();

if (employeeEditButton) {
  employeeEditButton.addEventListener("click", startEmployeeEdit);
}

if (employeeCancelEditButton) {
  employeeCancelEditButton.addEventListener("click", clearEmployeeEditMode);
}

if (employeeEditForm) {
  employeeEditForm.addEventListener("submit", handleEmployeeUpdate);
}

async function initEmployeeProfile() {
  if (window.crmHasPermission && !window.crmHasPermission("search_employees")) {
    showEmployeeNotFound("Employee accounts are restricted to HR and Admin in this prototype.");
    return;
  }

  const employee = await window.crmApi.findEmployee("employeeId", employeeId);

  if (!employee) {
    showEmployeeNotFound("No matching employee account was found.");
    return;
  }

  renderEmployee(employee);
}

async function renderEmployee(employee) {
  activeEmployee = employee;
  const linkedBusiness = employee.linkedBusinessId ? await window.crmApi.findBusiness("businessId", employee.linkedBusinessId) : null;

  document.querySelector("#employeeNotFoundState").classList.add("hidden");
  document.querySelector("#employeeProfile").classList.remove("hidden");
  employeeEditButton?.classList.toggle("hidden", window.crmHasPermission && !window.crmHasPermission("edit_employees"));
  document.querySelector("#employeeName").textContent = employee.name;
  document.querySelector("#employeeMeta").textContent = `${employee.employeeId} | ${employee.department}`;
  document.querySelector("#employeeStatus").textContent = employee.status;
  document.querySelector("#employeeId").textContent = employee.employeeId;
  document.querySelector("#employeeEmail").textContent = employee.email;
  document.querySelector("#employeeDepartment").textContent = employee.department;
  document.querySelector("#employeeRole").textContent = employee.role;
  document.querySelector("#employeeBranch").textContent = employee.branch;
  document.querySelector("#employeeManager").textContent = employee.manager;
  document.querySelector("#employeeHireDate").textContent = employee.hireDate;
  document.querySelector("#employeeAccessLevel").textContent = employee.accessLevel;
  document.querySelector("#employeeTrainingStatus").textContent = employee.trainingStatus;
  document.querySelector("#employeeDisclosures").textContent = employee.disclosures;
  document.querySelector("#employeeLinkedBusiness").textContent = linkedBusiness
    ? `${linkedBusiness.businessName} (${linkedBusiness.businessId})`
    : "None";
}

function startEmployeeEdit() {
  if (!activeEmployee || (window.crmHasPermission && !window.crmHasPermission("edit_employees"))) {
    showEmployeeMessage("This role cannot edit employee records.", "error");
    return;
  }

  employeeEditForm.classList.remove("hidden");
  employeeEditButton.classList.add("hidden");
  document.querySelector("#employeeNameField").value = activeEmployee.name || "";
  document.querySelector("#employeeEmailField").value = activeEmployee.email || "";
  document.querySelector("#employeeDepartmentField").value = activeEmployee.department || "";
  document.querySelector("#employeeRoleField").value = activeEmployee.role || "";
  document.querySelector("#employeeBranchField").value = activeEmployee.branch || "";
  document.querySelector("#employeeManagerField").value = activeEmployee.manager || "";
  document.querySelector("#employeeStatusField").value = activeEmployee.status || "";
  document.querySelector("#employeeTrainingField").value = activeEmployee.trainingStatus || "";
  document.querySelector("#employeeAccessField").value = activeEmployee.accessLevel || "";
  document.querySelector("#employeeDisclosuresField").value = activeEmployee.disclosures || "";
  showEmployeeMessage("Editing employee record. Save changes or cancel.", "info");
}

function clearEmployeeEditMode() {
  employeeEditForm?.classList.add("hidden");
  employeeEditButton?.classList.remove("hidden");
  employeeEditForm?.reset();
  clearEmployeeErrors();
}

async function handleEmployeeUpdate(event) {
  event.preventDefault();

  if (!activeEmployee) {
    return;
  }

  const validation = validateEmployeeForm();
  if (!validation.valid) {
    showEmployeeMessage("Fix the highlighted fields before saving.", "error");
    return;
  }

  setEmployeeSubmitting(true);
  showEmployeeMessage("Saving employee edits...", "info");

  try {
    const result = await window.crmApi.updateEmployee({
      employeeId: activeEmployee.employeeId,
      ...validation.values
    });
    await renderEmployee(result.record);
    clearEmployeeEditMode();
    showEmployeeMessage(result.message || "Employee record updated.", "success");
  } catch (error) {
    applyEmployeeErrors(error.fieldErrors || {});
    showEmployeeMessage(error.message || "Employee record could not be updated.", "error");
  } finally {
    setEmployeeSubmitting(false);
  }
}

function validateEmployeeForm() {
  const values = {
    name: document.querySelector("#employeeNameField")?.value.trim() || "",
    email: document.querySelector("#employeeEmailField")?.value.trim() || "",
    department: document.querySelector("#employeeDepartmentField")?.value.trim() || "",
    role: document.querySelector("#employeeRoleField")?.value.trim() || "",
    branch: document.querySelector("#employeeBranchField")?.value.trim() || "",
    manager: document.querySelector("#employeeManagerField")?.value.trim() || "",
    status: document.querySelector("#employeeStatusField")?.value.trim() || "",
    trainingStatus: document.querySelector("#employeeTrainingField")?.value.trim() || "",
    accessLevel: document.querySelector("#employeeAccessField")?.value.trim() || "",
    disclosures: document.querySelector("#employeeDisclosuresField")?.value.trim() || ""
  };
  const errors = {};

  if (!values.name) errors.employeeName = "Name is required.";
  if (!values.email || !values.email.includes("@")) errors.employeeEmail = "Use a valid email address.";
  if (!values.department) errors.employeeDepartment = "Department is required.";
  if (!values.role) errors.employeeRole = "Role is required.";
  if (!values.branch) errors.employeeBranch = "Branch is required.";
  if (!values.manager) errors.employeeManager = "Manager is required.";
  if (!values.status) errors.employeeStatus = "Status is required.";
  if (!values.trainingStatus) errors.employeeTraining = "Training status is required.";
  if (!values.accessLevel) errors.employeeAccess = "Access level is required.";
  if (!values.disclosures) errors.employeeDisclosures = "Disclosures are required.";

  applyEmployeeErrors(errors);
  return {
    valid: Object.keys(errors).length === 0,
    values,
    errors
  };
}

function applyEmployeeErrors(errors) {
  clearEmployeeErrors();
  Object.entries(errors).forEach(([field, message]) => {
    const error = document.querySelector(`[data-error-for="${field}"]`);
    const input = {
      employeeName: document.querySelector("#employeeNameField"),
      employeeEmail: document.querySelector("#employeeEmailField"),
      employeeDepartment: document.querySelector("#employeeDepartmentField"),
      employeeRole: document.querySelector("#employeeRoleField"),
      employeeBranch: document.querySelector("#employeeBranchField"),
      employeeManager: document.querySelector("#employeeManagerField"),
      employeeStatus: document.querySelector("#employeeStatusField"),
      employeeTraining: document.querySelector("#employeeTrainingField"),
      employeeAccess: document.querySelector("#employeeAccessField"),
      employeeDisclosures: document.querySelector("#employeeDisclosuresField")
    }[field];
    if (error) error.textContent = message;
    if (input) input.classList.add("field-invalid");
  });
}

function clearEmployeeErrors() {
  document.querySelectorAll("[data-error-for^='employee']").forEach((error) => {
    error.textContent = "";
  });
  [
    "#employeeNameField",
    "#employeeEmailField",
    "#employeeDepartmentField",
    "#employeeRoleField",
    "#employeeBranchField",
    "#employeeManagerField",
    "#employeeStatusField",
    "#employeeTrainingField",
    "#employeeAccessField",
    "#employeeDisclosuresField"
  ].forEach((selector) => document.querySelector(selector)?.classList.remove("field-invalid"));
}

function showEmployeeMessage(message, type) {
  if (!employeeEditMessage) {
    return;
  }

  employeeEditMessage.textContent = message;
  employeeEditMessage.className = `form-message ${type}`;
  employeeEditMessage.classList.remove("hidden");
}

function setEmployeeSubmitting(isSubmitting) {
  const button = document.querySelector("#employeeSaveButton");
  if (button) {
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? "Saving..." : "Save employee";
  }
}

function showEmployeeNotFound(message) {
  document.querySelector("#employeeProfile").classList.add("hidden");
  document.querySelector("#employeeNotFoundState").classList.remove("hidden");
  document.querySelector("#employeeNotFoundState p").textContent = message;
}
