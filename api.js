(function attachCrmApi() {
  const API_TIMEOUT_MS = 1200;
  const LOCAL_LEADS_KEY = "crmSavedLeads";
  const LOCAL_NOTES_KEY = "crmSavedBankNotes";
  const LOCAL_FRAUD_NOTES_KEY = "crmSavedFraudNotes";
  const LOCAL_MEETINGS_KEY = "crmSavedMeetings";
  const baseLeads = window.crmLeads ? window.crmLeads.slice() : [];
  const baseMeetings = window.crmMeetings ? window.crmMeetings.slice() : [];
  const CUSTOMER_SEARCH_PERMISSIONS = ["search_customers", "search_wealth_customers", "search_loan_customers", "search_fraud_risk"];
  const BUSINESS_SEARCH_PERMISSIONS = ["search_businesses", "search_employee_businesses"];

  window.crmDataSource = "static";
  window.crmLastApiError = "";

  window.crmApi = {
    getCurrentSession,
    loadBootstrap,
    getPagedCustomers,
    getPagedBusinesses,
    getPagedLeads,
    getPagedOffers,
    getPagedMeetings,
    getWealthProfile,
    updateWealthProfile,
    createWealthInteraction,
    updateWealthInteraction,
    deleteWealthInteraction,
    getLendingProfile,
    updateLendingProfile,
    updateLendingDocument,
    createLendingContact,
    updateLendingContact,
    deleteLendingContact,
    getFraudAnalysis,
    getRecommendations,
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
    createFraudNote,
    deleteFraudNote,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    updateCustomer,
    updateOffer,
    updateBusiness,
    updateEmployee
  };

  async function getCurrentSession() {
    return getJson("api/auth/me");
  }

  async function loadBootstrap() {
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

  async function getWealthProfile(accountNumber) {
    if (!canCallApi("view_wealth_profile", "wealth profile")) {
      return null;
    }

    if (window.location.protocol === "file:") {
      return getStaticWealthProfile(accountNumber);
    }

    const payload = await getJson(`api/wealth/profile?${toQuery({ accountNumber })}`);
    return payload && payload.record ? payload.record : getStaticWealthProfile(accountNumber);
  }

  async function updateWealthProfile(profile) {
    requireClientPermission("edit_wealth_profile", "wealth profile editing");

    const payload = await putJson("api/wealth/profile/update", profile);

    if (!payload) {
      throw new Error("Wealth profile edits require the local CRM server.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function createWealthInteraction(interaction) {
    requireClientPermission("manage_wealth_notes", "wealth interaction notes");

    const payload = await postJson("api/wealth/interactions/create", interaction);

    if (!payload) {
      throw new Error("Wealth interaction notes require the local CRM server.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function updateWealthInteraction(interaction) {
    requireClientPermission("manage_wealth_notes", "wealth interaction editing");

    const payload = await putJson("api/wealth/interactions/update", interaction);

    if (!payload) {
      throw new Error("Wealth interaction edits require the local CRM server.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function deleteWealthInteraction(interaction) {
    requireClientPermission("manage_wealth_notes", "wealth interaction removal");

    const payload = await deleteJson(`api/wealth/interactions/delete?id=${encodeURIComponent(interaction.dbId || "")}`);

    if (!payload) {
      throw new Error("Wealth interaction removal requires the local CRM server.");
    }

    if (payload.error) {
      throw new Error(payload.error);
    }

    return payload;
  }

  async function getLendingProfile(accountNumber) {
    if (!canCallApi("view_lending_profile", "lending profile")) {
      return null;
    }

    if (window.location.protocol === "file:") {
      return getStaticLendingProfile(accountNumber);
    }

    const payload = await getJson(`api/lending/profile?${toQuery({ accountNumber })}`);
    return payload && payload.record ? payload.record : getStaticLendingProfile(accountNumber);
  }

  async function updateLendingProfile(profile) {
    requireClientPermission("edit_lending_profile", "lending profile editing");

    const payload = await putJson("api/lending/profile/update", profile);

    if (!payload) {
      throw new Error("Lending profile edits require the local CRM server.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function updateLendingDocument(document) {
    requireClientPermission("edit_lending_profile", "lending document editing");

    const payload = await putJson("api/lending/documents/update", document);

    if (!payload) {
      throw new Error("Lending document edits require the local CRM server.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function createLendingContact(contact) {
    requireClientPermission("manage_lending_notes", "lending contact notes");

    const payload = await postJson("api/lending/contact-history/create", contact);

    if (!payload) {
      throw new Error("Lending contact notes require the local CRM server.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function updateLendingContact(contact) {
    requireClientPermission("manage_lending_notes", "lending contact editing");

    const payload = await putJson("api/lending/contact-history/update", contact);

    if (!payload) {
      throw new Error("Lending contact edits require the local CRM server.");
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function deleteLendingContact(contact) {
    requireClientPermission("manage_lending_notes", "lending contact removal");

    const payload = await deleteJson(`api/lending/contact-history/delete?id=${encodeURIComponent(contact.dbId || "")}`);

    if (!payload) {
      throw new Error("Lending contact removal requires the local CRM server.");
    }

    if (payload.error) {
      throw new Error(payload.error);
    }

    return payload;
  }

  async function getFraudAnalysis(accountNumber) {
    if (!canCallApi(["view_fraud_summary", "view_fraud_detail"], "fraud analysis")) {
      return null;
    }

    if (window.location.protocol === "file:" && window.crmFraudEngine) {
      const customer = mergeLocalFraudNotes(window.crmFindCustomer("accountNumber", accountNumber));
      return customer ? window.crmFraudEngine.evaluateFraudRules(customer) : null;
    }

    const payload = await getJson(`api/fraud-analysis/${encodeURIComponent(accountNumber)}`);
    return payload && payload.record ? payload.record : null;
  }

  async function getRecommendations(accountNumber) {
    if (!canCallApi(["view_discover_needs", "view_lending_profile", "view_wealth_profile"], "recommendations")) {
      return null;
    }

    if (window.location.protocol === "file:" && window.crmRecommendationEngine) {
      const customer = window.crmFindCustomer("accountNumber", accountNumber);
      return customer ? window.crmRecommendationEngine.evaluateRecommendations(customer) : null;
    }

    const payload = await getJson(`api/recommendations/${encodeURIComponent(accountNumber)}`);
    return payload && payload.record ? payload.record : null;
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

    const fallbackCustomer = window.crmFindCustomer(type, value);
    const customer = payload && payload.record
      ? payload.record
      : (window.crmSanitizeCustomerForRole ? window.crmSanitizeCustomerForRole(fallbackCustomer) : fallbackCustomer);
    return mergeLocalFraudNotes(mergeLocalNotes(customer));
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
        author: getLocalUserName(),
        date: getTodayLabel(),
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

  async function createFraudNote(note) {
    requireClientPermission("manage_fraud_notes", "fraud notes");

    const payload = await postJson("api/fraud-notes/create", note);

    if (!payload) {
      const user = window.crmGetActiveUser ? window.crmGetActiveUser() : null;
      const record = {
        localId: `local-fraud-note-${Date.now()}`,
        accountNumber: note.accountNumber,
        author: user?.name || getLocalUserName(),
        date: getTodayLabel(),
        text: note.text
      };

      saveLocalFraudNote(record);

      return {
        source: "static",
        record,
        customer: mergeLocalFraudNotes(window.crmFindCustomer("accountNumber", note.accountNumber)),
        message: "Fraud note saved in this browser."
      };
    }

    if (payload.error) {
      const error = new Error(payload.error);
      error.fieldErrors = payload.fieldErrors || {};
      throw error;
    }

    return payload;
  }

  async function deleteFraudNote(note) {
    requireClientPermission("manage_fraud_notes", "fraud notes");

    if (note.localId) {
      removeLocalFraudNote(note.localId);
      return {
        source: "static",
        customer: mergeLocalFraudNotes(window.crmFindCustomer("accountNumber", note.accountNumber)),
        message: "Fraud note removed from this browser."
      };
    }

    const payload = await deleteJson(`api/fraud-notes/delete?id=${encodeURIComponent(note.dbId || "")}`);

    if (!payload) {
      throw new Error("This fraud note can only be removed when the CRM server is running.");
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

  function saveLocalFraudNote(note) {
    const savedNotes = getLocalFraudNotes();
    savedNotes.push(note);
    localStorage.setItem(LOCAL_FRAUD_NOTES_KEY, JSON.stringify(savedNotes));
  }

  function removeLocalFraudNote(localId) {
    const savedNotes = getLocalFraudNotes().filter((note) => note.localId !== localId);
    localStorage.setItem(LOCAL_FRAUD_NOTES_KEY, JSON.stringify(savedNotes));
  }

  function getLocalFraudNotes() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_FRAUD_NOTES_KEY)) || [];
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

  function mergeLocalFraudNotes(customer) {
    if (!customer) {
      return customer;
    }

    const baseFraudNotes = customer.fraudNotes || [];

    if (window.crmDataSource === "sqlite") {
      return {
        ...customer,
        fraudNotes: baseFraudNotes
      };
    }

    const savedNotes = getLocalFraudNotes().filter((note) => note.accountNumber === customer.accountNumber);
    return {
      ...customer,
      fraudNotes: [...savedNotes].reverse().concat(baseFraudNotes)
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
    const activeUser = window.crmGetActiveUser ? window.crmGetActiveUser() : null;

    if (activeUser && activeUser.name) {
      return activeUser.name;
    }

    return {
      admin: "Aung",
      banker: "Nora Whitfield",
      wealth: "Luke",
      loans: "Gavin",
      fraud: "Preston",
      hr: "Lizzie",
      marketing: "Alex"
    }[role] || "Current User";
  }

  function getLocalUserName() {
    const role = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";
    const activeUser = window.crmGetActiveUser ? window.crmGetActiveUser() : null;
    const profile = window.crmRoleProfiles ? window.crmRoleProfiles[role] : null;

    return activeUser?.name || profile?.name || getLocalMeetingOwner(role);
  }

  function getTodayLabel() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${month}/${day}/${today.getFullYear()}`;
  }

  function getLocalMeetingVisibility(customer) {
    const visibleTo = ["admin", "banker", "loans"];

    if (customer && window.crmIsWealthClient(customer)) {
      visibleTo.push("wealth");
    }

    return visibleTo;
  }

  function getStaticWealthProfile(accountNumber) {
    const customer = window.crmFindCustomer ? window.crmFindCustomer("accountNumber", accountNumber) : null;

    if (!customer || !window.crmIsWealthClient(customer)) {
      return null;
    }

    const visibleCustomer = window.crmSanitizeCustomerForRole ? window.crmSanitizeCustomerForRole(customer) : customer;

    if (!visibleCustomer) {
      return null;
    }

    const profile = {
      accountNumber: customer.accountNumber,
      riskTolerance: customer.investedBalance > 500000 ? "Balanced" : "Moderate",
      liquidityNeeds: customer.savings > 100000 ? "Maintain strong cash reserve while reviewing investable excess." : "Maintain emergency reserve before additional investments.",
      timeHorizon: customer.investedBalance > 500000 ? "5 to 7 years" : "7 to 10 years",
      taxStatus: "Review with client and tax advisor during annual planning.",
      otherInvestments: customer.investedBalance > 100000 ? "Outside retirement account and bank-managed investment relationship." : "Limited outside investment information on file.",
      investmentExperience: customer.affluencyTier >= 3 ? "Intermediate" : "Beginner",
      investmentObjectives: customer.discoverNeeds.find((need) => need.product.toLowerCase().includes("wealth") || need.product.toLowerCase().includes("investment"))?.reason || "Document goals, risk comfort, liquidity needs, and time horizon.",
      concentrationConcerns: customer.savings > customer.investedBalance ? "High deposit concentration; consider gradual diversification." : "Review portfolio concentration at next meeting.",
      incomeNeeds: customer.relationship.includes("20") || customer.relationship.includes("29") ? "Income planning should be reviewed annually." : "No immediate income draw documented.",
      lastMeetingDate: customer.notes[0]?.date || "Not documented",
      lastCallDate: customer.lastReviewed || "Not documented",
      nextMeetingDate: customer.nextBestAction?.due || "Needs scheduling",
      followUp: customer.nextBestAction?.reason || "Schedule next wealth planning touchpoint.",
      accounts: getStaticWealthAccounts(customer),
      lifeEvents: getStaticWealthEvents(customer),
      interactions: getStaticWealthInteractions(customer)
    };

    return { customer: visibleCustomer, profile };
  }

  function getStaticWealthAccounts(customer) {
    const accounts = customer.accounts.map((account, index) => ({
      dbId: index + 1,
      group: account.type.includes("CD") ? "SIS" : "Retail",
      name: account.type,
      accountId: account.account,
      balance: account.balance,
      status: account.status
    }));

    if (customer.investedBalance > 0) {
      accounts.push({
        dbId: accounts.length + 1,
        group: "STAR Full Picture",
        name: "Investment Portfolio",
        accountId: `STAR-${customer.accountNumber.slice(-5)}`,
        balance: customer.investedBalance,
        status: "Active"
      });
    }

    return accounts;
  }

  function getStaticWealthEvents(customer) {
    return [
      {
        dbId: 1,
        title: "Annual wealth review",
        date: customer.nextBestAction?.due || "Needs scheduling",
        alertDate: "1 month prior",
        note: customer.nextBestAction?.title || "Review portfolio, beneficiaries, and liquidity needs."
      },
      {
        dbId: 2,
        title: "Life event check-in",
        date: "Next client meeting",
        alertDate: "1 month prior",
        note: "Ask about retirement, income, home, family, and business changes."
      }
    ];
  }

  function getStaticWealthInteractions(customer) {
    return (customer.notes || []).map((note, index) => ({
      dbId: index + 1,
      accountNumber: customer.accountNumber,
      type: note.author === customer.wealthAdvisor ? "Meeting" : "Call",
      date: note.date,
      owner: note.author,
      note: note.text,
      userCreated: false
    }));
  }

  function getStaticLendingProfile(accountNumber) {
    const customer = window.crmFindCustomer ? window.crmFindCustomer("accountNumber", accountNumber) : null;

    if (!customer || !customer.loans.length) {
      return null;
    }

    const visibleCustomer = window.crmSanitizeCustomerForRole ? window.crmSanitizeCustomerForRole(customer) : customer;

    if (!visibleCustomer || !visibleCustomer.loans.length) {
      return null;
    }

    const totalLoans = customer.loans.reduce((total, loan) => total + loan.balance, 0);
    const monthlyPayment = Math.max(90, Math.round(totalLoans * 0.008));
    const profile = {
      accountNumber: customer.accountNumber,
      loanStatus: customer.loans.some((loan) => loan.status === "Current") ? "Active" : customer.loans[0].status,
      interestRate: customer.loans.some((loan) => loan.type.includes("Credit Card")) ? "18.99%" : "7.25%",
      monthlyPayment,
      yearlyPayment: monthlyPayment * 12,
      monthlyIncome: Math.max(4200, Math.round(customer.household / 42)),
      pmiStatus: customer.loans.some((loan) => loan.type.includes("Mortgage")) ? "Review required" : "Not applicable",
      pmiRecommendation: customer.loans.some((loan) => loan.type.includes("Mortgage")) ? "Review PMI eligibility with current home value and loan-to-value." : "No PMI required for this lending product.",
      homeEquity: customer.loans.some((loan) => loan.type.includes("Mortgage") || loan.type.includes("Home")) ? Math.max(35000, Math.round(customer.household * 0.22)) : 0,
      helocStatus: customer.loans.some((loan) => loan.type.includes("Mortgage") || loan.type.includes("Home")) ? "Potential HELOC conversation available" : "Not currently eligible based on profile data",
      billAmountOwed: totalLoans,
      pastDueAmount: customer.fraudRiskScore > 65 ? 240 : 0,
      maturityDate: "Review in lending system",
      closingStatus: "Closed",
      splitPaymentStructure: customer.loans.length > 1 ? "Multiple monthly payments; consolidation review available." : "Standard monthly payment.",
      creditScore: Math.max(620, 780 - customer.fraudRiskScore),
      availableLoanProducts: customer.discoverNeeds.filter((need) => /loan|mortgage|equity|heloc|credit/i.test(need.product)).map((need) => need.product).join(", ") || "Personal loan review, credit review",
      documents: getStaticLendingDocuments(customer),
      contactHistory: getStaticLendingContacts(customer)
    };

    return { customer: visibleCustomer, profile };
  }

  function getStaticLendingDocuments(customer) {
    return [
      { dbId: 1, accountNumber: customer.accountNumber, name: "W2 / income verification", status: "On file", lastUpdated: customer.lastReviewed },
      { dbId: 2, accountNumber: customer.accountNumber, name: "Paystubs", status: "Needs refresh", lastUpdated: customer.lastReviewed },
      { dbId: 3, accountNumber: customer.accountNumber, name: "Employment verification", status: "Pending lender review", lastUpdated: customer.lastReviewed },
      { dbId: 4, accountNumber: customer.accountNumber, name: "Credit score tracking", status: "Updated", lastUpdated: customer.lastReviewed }
    ];
  }

  function getStaticLendingContacts(customer) {
    return (customer.notes || []).map((note, index) => ({
      dbId: index + 1,
      accountNumber: customer.accountNumber,
      type: index % 2 === 0 ? "Phone" : "Email",
      date: note.date,
      value: index % 2 === 0 ? customer.phone : customer.email,
      owner: note.author,
      note: note.text,
      userCreated: false
    }));
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
    const role = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";
    return role ? { "X-CRM-Role": role } : {};
  }

  function getSessionToken() {
    return window.crmGetSessionToken ? window.crmGetSessionToken() : "";
  }

  function canCallApi(permissions, dataType) {
    if (window.location.protocol === "file:") {
      return true;
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
    return false;
  }

  function handleAuthFailure() {
    window.crmLastApiError = "Role session unavailable";
  }

  function isRestricted(payload) {
    return Boolean(payload && payload.restricted);
  }
})();
