(function attachCrmApi() {
  const API_TIMEOUT_MS = 1200;
  const LOCAL_LEADS_KEY = "crmSavedLeads";
  const LOCAL_NOTES_KEY = "crmSavedBankNotes";
  const LOCAL_MEETINGS_KEY = "crmSavedMeetings";
  const baseLeads = window.crmLeads ? window.crmLeads.slice() : [];
  const baseMeetings = window.crmMeetings ? window.crmMeetings.slice() : [];
  const CUSTOMER_SEARCH_PERMISSIONS = ["search_customers", "search_wealth_customers", "search_loan_customers", "search_fraud_risk"];
  const BUSINESS_SEARCH_PERMISSIONS = ["search_businesses", "search_employee_businesses"];

  window.crmDataSource = "static";
  window.crmLastApiError = "";

  window.crmApi = {
    login,
    getCurrentSession,
    loadBootstrap,
    getPagedCustomers,
    getPagedBusinesses,
    getPagedLeads,
    getPagedOffers,
    getPagedMeetings,
    findCustomer,
    findEmployee,
    findBusiness,
    findLookupRecord,
    createLead,
    updateLead,
    deleteLead,
    createBankNote,
    updateBankNote,
    deleteBankNote,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    updateCustomer,
    updateOffer,
    updateBusiness,
    updateEmployee
  };

  async function login(credentials) {
    if (window.location.protocol === "file:") {
      throw new Error("Secure login requires running the local CRM server.");
    }

    const response = await fetch("api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(credentials)
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error((payload && payload.error) || "Login failed.");
    }

    return payload;
  }

  async function getCurrentSession() {
    return getJson("api/auth/me");
  }

  async function loadBootstrap() {
    if (requiresServerAuth() && !getSessionToken()) {
      handleAuthFailure();
      return false;
    }

    const payload = await getJson("api/bootstrap");

    if (payload && payload.authRequired) {
      return false;
    }

    if (!payload || payload.source !== "sqlite") {
      applyLocalLeads();
      applyLocalMeetings();
      return false;
    }

    if (payload.user && window.crmSetActiveUser) {
      window.crmSetActiveUser({
        ...payload.user,
        permissions: payload.permissions || []
      });
    }

    window.crmCustomers = payload.customers;
    window.crmEmployees = payload.employees;
    window.crmBusinessRecords = payload.businessRecords;
    window.crmLeads = payload.leads;
    window.crmOffers = payload.offers;
    window.crmMeetings = payload.meetings;
    window.crmDataSource = "sqlite";
    return true;
  }

  async function getPagedCustomers(params = {}) {
    if (!canCallApi(CUSTOMER_SEARCH_PERMISSIONS, "customer records")) {
      return null;
    }

    return getJson(`api/customers?${toQuery(withPagingDefaults(params))}`);
  }

  async function getPagedBusinesses(params = {}) {
    if (!canCallApi(BUSINESS_SEARCH_PERMISSIONS, "business records")) {
      return null;
    }

    return getJson(`api/businesses?${toQuery(withPagingDefaults(params))}`);
  }

  async function getPagedLeads(params = {}) {
    if (!canCallApi("view_leads", "lead records")) {
      return null;
    }

    return getJson(`api/leads?${toQuery(withPagingDefaults(params))}`);
  }

  async function getPagedOffers(params = {}) {
    if (!canCallApi("view_offers", "offer records")) {
      return null;
    }

    return getJson(`api/offers?${toQuery(withPagingDefaults(params))}`);
  }

  async function getPagedMeetings(params = {}) {
    if (!canCallApi("view_meetings", "meeting records")) {
      return null;
    }

    return getJson(`api/meetings?${toQuery(withPagingDefaults(params))}`);
  }

  async function findLookupRecord(target, type, value) {
    if (["segment", "offer"].includes(target)) {
      const permission = target === "segment" ? "search_segments" : "search_offers";

      if (!canCallApi(permission, `${target} records`)) {
        return null;
      }

      return window.crmFindLookupRecord(target, type, value);
    }

    if (target === "employee") {
      return findEmployee(type, value);
    }

    if (target === "business") {
      return findBusiness(type, value);
    }

    if (target === "wealth") {
      const customer = await findCustomer(type, value);
      return window.crmIsWealthClient(customer) ? customer : null;
    }

    if (target === "loanCustomer") {
      const customer = await findCustomer(type, value);
      return customer && customer.loans.length > 0 ? customer : null;
    }

    return findCustomer(type, value);
  }

  async function findCustomer(type, value) {
    if (!canCallApi(CUSTOMER_SEARCH_PERMISSIONS, "customer records")) {
      return null;
    }

    const payload = await getJson(`api/customers/find?${toQuery({ type, value })}`);
    if (isRestricted(payload)) {
      return null;
    }

    const customer = payload && payload.record ? payload.record : window.crmFindCustomer(type, value);
    return mergeLocalNotes(customer);
  }

  async function findEmployee(type, value) {
    if (!canCallApi("search_employees", "employee records")) {
      return null;
    }

    const payload = await getJson(`api/employees/find?${toQuery({ type, value })}`);
    if (isRestricted(payload)) {
      return null;
    }

    return payload && payload.record ? payload.record : window.crmFindEmployee(type, value);
  }

  async function findBusiness(type, value) {
    if (!canCallApi(BUSINESS_SEARCH_PERMISSIONS, "business records")) {
      return null;
    }

    const payload = await getJson(`api/businesses/find?${toQuery({ type, value })}`);
    if (isRestricted(payload)) {
      return null;
    }

    return payload && payload.record ? payload.record : window.crmFindBusiness(type, value);
  }

  async function createLead(lead) {
    requireClientPermission("manage_leads", "lead creation");

    const payload = await postJson("api/leads/create", lead);

    if (!payload) {
      const record = {
        localId: `local-${Date.now()}`,
        type: lead.type,
        title: lead.title || `${lead.type === "BL" ? "Business loan" : "Personal loan"} conversation`,
        accountNumber: lead.accountNumber,
        amount: Math.round(Number(lead.amount)),
        priority: lead.priority,
        status: "New lead",
        reason: lead.reason || "Prototype lead entered in browser save mode.",
        visibleTo: lead.type === "BL" ? ["admin", "banker", "loans", "marketing"] : ["admin", "banker", "loans"]
      };

      saveLocalLead(record);

      return {
        source: "static",
        record,
        message: "Lead saved in this browser."
      };
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function createBankNote(note) {
    requireClientPermission("manage_bank_notes", "bank notes");

    const payload = await postJson("api/notes/create", note);

    if (!payload) {
      const record = {
        localId: `local-note-${Date.now()}`,
        accountNumber: note.accountNumber,
        author: "Current User",
        date: "Today",
        text: note.text
      };

      saveLocalNote(record);

      return {
        source: "static",
        record,
        message: "Bank note saved in this browser."
      };
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function updateBankNote(note) {
    requireClientPermission("edit_bank_notes", "bank note editing");

    const payload = await putJson("api/notes/update", {
      id: note.dbId || note.id,
      text: note.text
    });

    if (!payload) {
      throw new Error("This bank note can only be edited when the CRM server is running.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function deleteBankNote(note) {
    requireClientPermission("manage_bank_notes", "bank notes");

    if (note.localId) {
      removeLocalNote(note.localId);
      return {
        source: "static",
        message: "Bank note removed from this browser."
      };
    }

    const payload = await deleteJson(`api/notes/delete?id=${encodeURIComponent(note.dbId || "")}`);

    if (!payload) {
      throw new Error("This bank note can only be removed when the CRM server is running.");
    }

    if (payload.error) {
      throw new Error(payload.error);
    }

    return payload;
  }

  async function updateCustomer(customer) {
    requireClientPermission("edit_customers", "customer editing");

    const payload = await putJson("api/customers/update", customer);

    if (!payload) {
      throw new Error("Customer edits require the local CRM server.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function updateBusiness(business) {
    requireClientPermission("edit_businesses", "business editing");

    const payload = await putJson("api/businesses/update", business);

    if (!payload) {
      throw new Error("Business edits require the local CRM server.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function updateEmployee(employee) {
    requireClientPermission("edit_employees", "employee editing");

    const payload = await putJson("api/employees/update", employee);

    if (!payload) {
      throw new Error("Employee edits require the local CRM server.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function createMeeting(meeting) {
    requireClientPermission("manage_meetings", "meetings");

    const payload = await postJson("api/meetings/create", meeting);

    if (!payload) {
      const customer = window.crmFindCustomer("accountNumber", meeting.accountNumber);
      const role = window.crmGetActiveRole ? window.crmGetActiveRole() : "banker";
      const record = {
        localId: `local-meeting-${Date.now()}`,
        title: meeting.title,
        accountNumber: meeting.accountNumber,
        client: customer ? customer.name : "Client",
        date: meeting.date,
        owner: getLocalMeetingOwner(role),
        visibleTo: getLocalMeetingVisibility(customer),
        userCreated: true
      };

      saveLocalMeeting(record);

      return {
        source: "static",
        record,
        message: "Meeting scheduled in this browser."
      };
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function updateMeeting(meeting) {
    requireClientPermission("edit_meetings", "meeting editing");

    const payload = await putJson("api/meetings/update", meeting);

    if (!payload) {
      throw new Error("This meeting can only be edited when the CRM server is running.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function deleteMeeting(meeting) {
    requireClientPermission("manage_meetings", "meetings");

    if (meeting.localId) {
      removeLocalMeeting(meeting.localId);
      return {
        source: "static",
        message: "Meeting canceled from this browser."
      };
    }

    const payload = await deleteJson(`api/meetings/delete?id=${encodeURIComponent(meeting.dbId || "")}`);

    if (!payload) {
      throw new Error("This meeting can only be canceled when the CRM server is running.");
    }

    if (payload.error) {
      throw new Error(payload.error);
    }

    return payload;
  }

  async function updateLead(lead) {
    requireClientPermission("edit_leads", "lead editing");

    const payload = await putJson("api/leads/update", lead);

    if (!payload) {
      throw new Error("This lead can only be edited when the CRM server is running.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function deleteLead(lead) {
    requireClientPermission("manage_leads", "lead removal");

    if (lead.localId) {
      removeLocalLead(lead.localId);
      return {
        source: "static",
        message: "Lead removed from this browser."
      };
    }

    const payload = await deleteJson(`api/leads/delete?id=${encodeURIComponent(lead.dbId || "")}`);

    if (!payload) {
      throw new Error("This lead can only be removed when the CRM server is running.");
    }

    if (payload.error) {
      throw new Error(payload.error);
    }

    return payload;
  }

  async function updateOffer(offer) {
    requireClientPermission("edit_offers", "offer editing");

    const payload = await putJson("api/offers/update", offer);

    if (!payload) {
      throw new Error("This offer can only be edited when the CRM server is running.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  function applyLocalLeads() {
    const savedLeads = getLocalLeads();
    window.crmLeads = [...baseLeads, ...savedLeads];
    window.crmDataSource = savedLeads.length ? "browser" : "static";
  }

  function applyLocalMeetings() {
    const savedMeetings = getLocalMeetings();
    window.crmMeetings = [...baseMeetings, ...savedMeetings];
    if (savedMeetings.length) {
      window.crmDataSource = "browser";
    }
  }

  function saveLocalLead(lead) {
    const savedLeads = getLocalLeads();
    savedLeads.push(lead);
    localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(savedLeads));
    applyLocalLeads();
  }

  function removeLocalLead(localId) {
    const savedLeads = getLocalLeads().filter((lead) => lead.localId !== localId);
    localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(savedLeads));
    applyLocalLeads();
  }

  function getLocalLeads() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_LEADS_KEY)) || [];
    } catch (error) {
      return [];
    }
  }

  function saveLocalNote(note) {
    const savedNotes = getLocalNotes();
    savedNotes.push(note);
    localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(savedNotes));
  }

  function removeLocalNote(localId) {
    const savedNotes = getLocalNotes().filter((note) => note.localId !== localId);
    localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(savedNotes));
  }

  function getLocalNotes() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_NOTES_KEY)) || [];
    } catch (error) {
      return [];
    }
  }

  function mergeLocalNotes(customer) {
    if (!customer || window.crmDataSource === "sqlite") {
      return customer;
    }

    const savedNotes = getLocalNotes().filter((note) => note.accountNumber === customer.accountNumber);
    return {
      ...customer,
      notes: [...savedNotes].reverse().concat(customer.notes || [])
    };
  }

  function saveLocalMeeting(meeting) {
    const savedMeetings = getLocalMeetings();
    savedMeetings.push(meeting);
    localStorage.setItem(LOCAL_MEETINGS_KEY, JSON.stringify(savedMeetings));
    applyLocalMeetings();
  }

  function removeLocalMeeting(localId) {
    const savedMeetings = getLocalMeetings().filter((meeting) => meeting.localId !== localId);
    localStorage.setItem(LOCAL_MEETINGS_KEY, JSON.stringify(savedMeetings));
    applyLocalMeetings();
  }

  function getLocalMeetings() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_MEETINGS_KEY)) || [];
    } catch (error) {
      return [];
    }
  }

  function getLocalMeetingOwner(role) {
    return {
      admin: "Morgan Lee",
      banker: "Nora Whitfield",
      wealth: "Avery Chen",
      loans: "Taylor Brooks"
    }[role] || "Current User";
  }

  function getLocalMeetingVisibility(customer) {
    const visibleTo = ["admin", "banker", "loans"];

    if (customer && window.crmIsWealthClient(customer)) {
      visibleTo.push("wealth");
    }

    return visibleTo;
  }

  async function getJson(path) {
    if (window.location.protocol === "file:") {
      return null;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(toApiPath(path), {
        cache: "no-store",
        headers: getAuthHeaders(),
        signal: controller.signal
      });

      if (response.status === 401) {
        const authPayload = await response.json().catch(() => ({ authRequired: true }));
        handleAuthFailure();
        return authPayload;
      }

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        if (errorPayload && errorPayload.restricted) {
          window.crmLastApiError = errorPayload.error;
          return errorPayload;
        }

        return null;
      }

      window.crmLastApiError = "";
      return response.json();
    } catch (error) {
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function postJson(path, payload) {
    if (window.location.protocol === "file:") {
      return null;
    }

    const response = await fetch(toApiPath(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });

    const responsePayload = await response.json().catch(() => null);

    if (response.status === 401) {
      handleAuthFailure();
    }

    if (!response.ok) {
      return responsePayload || { error: "Request failed." };
    }

    return responsePayload;
  }

  async function putJson(path, payload) {
    if (window.location.protocol === "file:") {
      return null;
    }

    const response = await fetch(toApiPath(path), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });

    const responsePayload = await response.json().catch(() => null);

    if (response.status === 401) {
      handleAuthFailure();
    }

    if (!response.ok) {
      return responsePayload || { error: "Request failed." };
    }

    return responsePayload;
  }

  async function deleteJson(path) {
    if (window.location.protocol === "file:") {
      return null;
    }

    const response = await fetch(toApiPath(path), {
      method: "DELETE",
      headers: getAuthHeaders()
    });

    const responsePayload = await response.json().catch(() => null);

    if (response.status === 401) {
      handleAuthFailure();
    }

    if (!response.ok) {
      return responsePayload || { error: "Request failed." };
    }

    return responsePayload;
  }

  function toQuery(params) {
    return new URLSearchParams(params).toString();
  }

  function withPagingDefaults(params) {
    return {
      page: params.page || 1,
      pageSize: params.pageSize || 25,
      search: params.search || "",
      filter: params.filter || "all",
      sort: params.sort || "default"
    };
  }

  function toApiPath(path) {
    const url = new URL(path, window.location.href);
    return `${url.pathname}${url.search}`;
  }

  function getAuthHeaders() {
    const token = getSessionToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function getSessionToken() {
    return window.crmGetSessionToken ? window.crmGetSessionToken() : "";
  }

  function canCallApi(permissions, dataType) {
    if (window.location.protocol === "file:") {
      return true;
    }

    if (!getSessionToken()) {
      handleAuthFailure();
      return false;
    }

    const isAllowed = window.crmHasAnyPermission ? window.crmHasAnyPermission(permissions) : true;

    if (!isAllowed) {
      window.crmLastApiError = "Restricted Access";
      console.warn(`Restricted Access: current session cannot access ${dataType}.`);
    }

    return isAllowed;
  }

  function requireClientPermission(permissions, dataType) {
    if (!canCallApi(permissions, dataType)) {
      throw new Error(`Restricted Access: current session cannot access ${dataType}.`);
    }
  }

  function requiresServerAuth() {
    return window.location.protocol !== "file:" && !window.location.pathname.endsWith("/login.html");
  }

  function handleAuthFailure() {
    window.crmLastApiError = "Authentication Required";

    if (window.crmClearSession) {
      window.crmClearSession();
    }

    if (!window.location.pathname.endsWith("/login.html")) {
      window.location.href = "login.html";
    }
  }

  function isRestricted(payload) {
    return Boolean(payload && payload.restricted);
  }
})();
