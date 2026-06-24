(function crmPages() {
  const page = document.body.dataset.page;
  const activeRole = window.crmGetActiveRole ? window.crmGetActiveRole() : "admin";
  const currency = window.crmFormatCurrency;
  const customerSearchPermissions = ["search_customers", "search_wealth_customers", "search_loan_customers", "search_fraud_risk"];
  const listState = {
    search: "",
    filter: "all",
    sort: "default"
  };
  const paginationState = {
    page: 1,
    pageSize: 25,
    total: 0,
    pages: 1
  };
  const currentPageRows = {
    leads: [],
    offers: [],
    meetings: [],
    profitability: []
  };
  let renderCurrentPage = null;
  let leadFormBound = false;
  let leadEditTarget = null;
  let offerFormBound = false;
  let offerEditTarget = null;
  let meetingFormBound = false;
  let meetingEditTarget = null;

  const pageAccess = {
    leads: ["admin", "banker", "loans"],
    leadDetail: ["admin", "banker", "loans"],
    offers: ["admin", "marketing", "wealth"],
    offerDetail: ["admin", "marketing", "wealth"],
    fraudWatch: ["admin", "fraud", "banker", "wealth", "loans"],
    meetings: ["admin", "banker", "wealth", "loans"],
    meetingDetail: ["admin", "banker", "wealth", "loans"],
    pipeline: ["admin", "banker", "wealth", "loans", "marketing"],
    profitability: ["admin", "banker", "wealth"],
    activity: ["admin"]
  };

  const navAccess = {
    admin: ["home", "lookup", "leads", "offers", "fraud", "meetings", "pipeline", "profitability", "activity"],
    banker: ["home", "lookup", "leads", "fraud", "meetings", "pipeline", "profitability"],
    wealth: ["home", "lookup", "offers", "fraud", "meetings", "pipeline", "profitability"],
    loans: ["home", "lookup", "leads", "fraud", "meetings", "pipeline"],
    fraud: ["home", "lookup", "fraud"],
    marketing: ["home", "lookup", "offers", "pipeline"],
    hr: ["home", "lookup"]
  };

  const moduleLabels = {
    home: "Home",
    lookup: "Search",
    leads: "Leads",
    offers: "Offers",
    fraud: "Fraud Risk",
    meetings: "Meetings",
    pipeline: "Pipeline",
    profitability: "Profitability",
    activity: "Activity"
  };

  const pageLabels = {
    leads: "Leads and Opportunities",
    leadDetail: "Lead Detail",
    offers: "Offers and Segments",
    offerDetail: "Offer Detail",
    fraudWatch: "Fraud Risk Watch",
    meetings: "Meetings",
    meetingDetail: "Meeting Detail",
    pipeline: "Opportunity Pipeline",
    profitability: "Customer Profitability",
    activity: "Activity Log"
  };

  const listPageHeaders = {
    leads: { eyebrow: "Growth", title: "Leads and Opportunities", subtitleId: "leadCountSubtitle", loadingText: "Loading leads" },
    offers: { eyebrow: "Campaigns", title: "Offers and Segments", subtitleId: "offerCountSubtitle", loadingText: "Loading offers" },
    fraudWatch: { eyebrow: "Protection", title: "Fraud Risk Watch", subtitleId: "fraudWatchSubtitle", loadingText: "Loading risk records" },
    meetings: { eyebrow: "Engagement", title: "Meetings", subtitleId: "meetingsSubtitle", loadingText: "Loading meetings" },
    pipeline: { eyebrow: "Pipeline", title: "Opportunity Pipeline", subtitleId: "pipelineSubtitle", loadingText: "Loading pipeline" },
    profitability: { eyebrow: "Analytics", title: "Customer Profitability", subtitleId: "profitSubtitle", loadingText: "Loading profitability records" },
    activity: { eyebrow: "System", title: "Activity Log", subtitleId: "activitySubtitle", loadingText: "Loading audit events" }
  };

  init();

  async function init() {
    await window.crmApi.loadBootstrap();
    applyPageChrome();

    if (!canAccessPage(page)) {
      showRestricted();
      return;
    }

    renderAuthorizedPageHeader();

    const renderers = {
      leads: renderLeads,
      leadDetail: renderLeadDetail,
      offers: renderOffers,
      offerDetail: renderOfferDetail,
      fraudWatch: renderFraudWatch,
      meetings: renderMeetings,
      meetingDetail: renderMeetingDetail,
      pipeline: renderPipeline,
      profitability: renderProfitability,
      activity: renderActivity
    };

    renderCurrentPage = renderers[page];
    bindListControls();
    bindLeadForm();
    bindLeadActions();
    bindOfferForm();
    bindOfferActions();
    bindMeetingForm();
    bindMeetingActions();

    if (renderCurrentPage) {
      await renderCurrentPage();
    }
  }

  function renderAuthorizedPageHeader() {
    const header = listPageHeaders[page];
    const target = document.querySelector("[data-page-heading]");

    if (!header || !target) {
      return;
    }

    target.replaceChildren();

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = header.eyebrow;

    const title = document.createElement("h1");
    title.textContent = header.title;

    const subtitle = document.createElement("p");
    subtitle.id = header.subtitleId;
    subtitle.textContent = header.loadingText;

    target.append(eyebrow, title, subtitle);
  }

  function applyPageChrome() {
    const allowed = navAccess[activeRole] || navAccess.admin;

    document.querySelectorAll("a[data-nav-module]").forEach((link) => {
      const isVisible = allowed.includes(link.dataset.navModule)
        && (!window.crmCanAccessModule || window.crmCanAccessModule(link.dataset.navModule));
      link.classList.toggle("hidden", !isVisible);
      link.classList.toggle("nav-visible", isVisible);
      link.classList.toggle("active", link.dataset.navModule === document.body.dataset.navModule);
      link.toggleAttribute("aria-hidden", !isVisible);

      if (isVisible) {
        link.removeAttribute("tabindex");
      } else {
        link.setAttribute("tabindex", "-1");
      }
    });

    const roleLabel = document.querySelector("#pageRoleLabel");
    if (roleLabel) {
      const profile = window.crmRoleProfiles[activeRole];
      roleLabel.textContent = `${profile.label} Access`;
    }
  }

  function bindListControls() {
    const searchInput = document.querySelector("#pageSearchInput");
    const filterSelect = document.querySelector("#pageFilterSelect");
    const sortSelect = document.querySelector("#pageSortSelect");

    listState.search = searchInput ? searchInput.value.trim().toLowerCase() : "";
    listState.filter = filterSelect ? filterSelect.value : "all";
    listState.sort = sortSelect ? sortSelect.value : "default";

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        listState.search = searchInput.value.trim().toLowerCase();
        resetListPage();
        rerenderCurrentPage();
      });
    }

    if (filterSelect) {
      filterSelect.addEventListener("change", () => {
        listState.filter = filterSelect.value;
        resetListPage();
        rerenderCurrentPage();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        listState.sort = sortSelect.value;
        resetListPage();
        rerenderCurrentPage();
      });
    }
  }

  async function renderLeads() {
    populateLeadCustomerOptions();
    const listConfig = {
      searchText: getLeadText,
      filter: (lead, filter) => lead.priority === filter || lead.type === filter,
      sorts: {
        "amount-desc": (a, b) => b.amount - a.amount,
        "amount-asc": (a, b) => a.amount - b.amount,
        "priority-desc": (a, b) => priorityRank(b.priority) - priorityRank(a.priority),
        "customer-asc": (a, b) => compareText(getCustomerName(a.accountNumber), getCustomerName(b.accountNumber)),
        "status-asc": (a, b) => compareText(a.status, b.status)
      }
    };
    const paged = await window.crmApi.getPagedLeads(getPagingRequest());
    let leads = [];

    if (isPagedResponse(paged)) {
      syncPaginationState(paged);
      leads = paged.data.map(withLeadId);
      setText("#leadCountSubtitle", pagedCountMessage(paged, "lead"));
      renderPaginationControls(paged);
    } else {
      const allLeads = getVisibleLeads();
      const filteredLeads = applyListControls(allLeads, listConfig);
      const localPage = paginateRows(filteredLeads);
      leads = localPage.data;
      setText("#leadCountSubtitle", `${countMessage(filteredLeads.length, allLeads.length, "lead")} | ${pageRangeMessage(localPage)}`);
      renderPaginationControls(localPage);
    }

    currentPageRows.leads = leads;
    setTable("#leadsTableBody", leads, (lead) => {
      const customer = window.crmFindCustomer("accountNumber", lead.accountNumber);
      return `
        <tr>
          <td><strong>${customer ? customer.name : "Restricted"}</strong><span class="text-secondary">${lead.type === "PL" ? "Personal loan" : "Business loan"}</span></td>
          <td>${customer && customer.businessAccounts[0] ? customer.businessAccounts[0].businessName : "Consumer relationship"}</td>
          <td><strong>${currency(lead.amount)}</strong></td>
          <td><span class="status-badge ${statusClass(lead.priority)}">${lead.priority}</span></td>
          <td>${lead.status}</td>
          <td>${customer ? customer.personalBanker : "Unassigned"}</td>
          <td>
            <div class="table-actions">
              <a class="primary-link" href="lead-detail.html?id=${lead.id}">View</a>
              ${canEditLead(lead) ? `<button class="secondary-button compact-button" type="button" data-edit-lead data-lead-db-id="${lead.dbId || ""}" data-lead-local-id="${lead.localId || ""}">Edit</button>` : ""}
              ${canRemoveLead(lead) ? `<button class="danger-button compact-button" type="button" data-remove-lead data-lead-db-id="${lead.dbId || ""}" data-lead-local-id="${lead.localId || ""}">Remove</button>` : ""}
            </div>
          </td>
        </tr>
      `;
    });
  }

  function bindLeadActions() {
    if (page !== "leads") {
      return;
    }

    const tableBody = document.querySelector("#leadsTableBody");
    if (!tableBody) {
      return;
    }

    tableBody.addEventListener("click", handleLeadAction);
  }

  async function handleLeadAction(event) {
    const editButton = event.target.closest("[data-edit-lead]");
    const removeButton = event.target.closest("[data-remove-lead]");

    if (!editButton && !removeButton) {
      return;
    }

    const actionButton = editButton || removeButton;
    const dbId = actionButton.dataset.leadDbId ? Number(actionButton.dataset.leadDbId) : null;
    const localId = actionButton.dataset.leadLocalId || "";
    const lead = currentPageRows.leads.concat(getVisibleLeads()).find((item) => {
      return (localId && item.localId === localId) || (dbId && item.dbId === dbId);
    });

    if (editButton) {
      startLeadEdit(lead);
      return;
    }

    if (!lead || !canRemoveLead(lead)) {
      showLeadMessage("Only newly created leads can be removed.", "error");
      return;
    }

    if (!window.confirm(`Remove "${lead.title}"?`)) {
      return;
    }

    removeButton.disabled = true;
    removeButton.textContent = "Removing...";

    try {
      const result = await window.crmApi.deleteLead(lead);
      await window.crmApi.loadBootstrap();
      showLeadMessage(result.message || "Lead removed.", "success");
      await renderLeads();
    } catch (error) {
      showLeadMessage(error.message || "Lead could not be removed.", "error");
      removeButton.disabled = false;
      removeButton.textContent = "Remove";
    }
  }

  function bindLeadForm() {
    if (page !== "leads" || leadFormBound) {
      return;
    }

    const form = document.querySelector("#leadCreateForm");
    if (!form) {
      return;
    }

    leadFormBound = true;
    populateLeadCustomerOptions();

    form.addEventListener("submit", handleLeadCreate);
    document.querySelector("#leadCancelEditButton")?.addEventListener("click", clearLeadEditMode);
    form.querySelectorAll("input, select, textarea").forEach((field) => {
      field.addEventListener("input", () => validateLeadForm(false));
      field.addEventListener("change", () => validateLeadForm(false));
    });
  }

  async function handleLeadCreate(event) {
    event.preventDefault();

    const validation = validateLeadForm(true);
    if (!validation.valid) {
      showLeadMessage("Fix the highlighted fields before creating the lead.", "error");
      return;
    }

    const customer = window.crmFindCustomer("accountNumber", validation.values.accountNumber);
    const payload = {
      ...validation.values,
      title: `${validation.values.type === "BL" ? "Business loan" : "Personal loan"} conversation${customer ? ` for ${customer.name}` : ""}`
    };

    setLeadSubmitting(true);
    showLeadMessage(leadEditTarget ? "Saving lead edits..." : "Saving lead...", "info");

    try {
      const wasEditing = Boolean(leadEditTarget);
      const result = leadEditTarget
        ? await window.crmApi.updateLead({
            ...validation.values,
            id: leadEditTarget.dbId || leadEditTarget.id,
            dbId: leadEditTarget.dbId
          })
        : await window.crmApi.createLead(payload);
      const reloaded = await window.crmApi.loadBootstrap();

      if (!reloaded && result.record && result.source !== "static") {
        window.crmLeads.push(result.record);
      }

      document.querySelector("#leadCreateForm").reset();
      clearLeadErrors();
      clearLeadEditMode(false);
      showLeadMessage(result.message || (wasEditing ? "Lead updated." : "Lead created."), "success");
      resetListPage();
      await renderLeads();
    } catch (error) {
      applyLeadErrors(error.fieldErrors || {});
      showLeadMessage(error.message || (leadEditTarget ? "Lead could not be updated." : "Lead could not be created."), "error");
    } finally {
      setLeadSubmitting(false);
    }
  }

  function validateLeadForm(showErrors) {
    const values = getLeadFormValues();
    const errors = {};
    const amount = Number(values.amount);

    if (!values.accountNumber) {
      errors.accountNumber = "Account number is required.";
    } else if (!window.crmFindCustomer("accountNumber", values.accountNumber)) {
      errors.accountNumber = "Use a visible test customer account.";
    }

    if (!["PL", "BL"].includes(values.type)) {
      errors.type = "Choose personal loan or business loan.";
    }

    if (!Number.isFinite(amount)) {
      errors.amount = "Amount must be a number.";
    } else if (amount < 1000) {
      errors.amount = "Amount must be at least $1,000.";
    } else if (amount > 5000000) {
      errors.amount = "Amount cannot be above $5,000,000.";
    }

    if (!["High", "Medium", "Low"].includes(values.priority)) {
      errors.priority = "Choose a priority.";
    }

    if (values.reason.length > 500) {
      errors.reason = "Notes must be 500 characters or fewer.";
    }

    if (leadEditTarget) {
      if (!values.title) {
        errors.title = "Lead title is required.";
      } else if (values.title.length > 120) {
        errors.title = "Lead title must be 120 characters or fewer.";
      }

      if (!values.status) {
        errors.status = "Lead status is required.";
      } else if (values.status.length > 80) {
        errors.status = "Lead status must be 80 characters or fewer.";
      }
    }

    if (showErrors || Object.keys(errors).length > 0) {
      applyLeadErrors(errors);
    } else {
      clearLeadErrors();
    }

    return {
      valid: Object.keys(errors).length === 0,
      values: {
        ...values,
        amount: Math.round(amount)
      },
      errors
    };
  }

  function getLeadFormValues() {
    return {
      accountNumber: document.querySelector("#leadCustomerField")?.value.trim() || "",
      type: document.querySelector("#leadTypeField")?.value || "",
      amount: document.querySelector("#leadAmountField")?.value || "",
      priority: document.querySelector("#leadPriorityField")?.value || "",
      reason: document.querySelector("#leadNotesField")?.value.trim() || "",
      title: document.querySelector("#leadTitleField")?.value.trim() || "",
      status: document.querySelector("#leadStatusField")?.value.trim() || ""
    };
  }

  function applyLeadErrors(errors) {
    clearLeadErrors();

    Object.entries(errors).forEach(([field, message]) => {
      const error = document.querySelector(`[data-error-for="${field}"]`);
      const input = getLeadField(field);

      if (error) {
        error.textContent = message;
      }

      if (input) {
        input.classList.add("field-invalid");
      }
    });
  }

  function clearLeadErrors() {
    document.querySelectorAll("[data-error-for]").forEach((error) => {
      error.textContent = "";
    });
    document.querySelectorAll(".field-invalid").forEach((field) => {
      field.classList.remove("field-invalid");
    });
  }

  function getLeadField(field) {
    return {
      accountNumber: document.querySelector("#leadCustomerField"),
      type: document.querySelector("#leadTypeField"),
      amount: document.querySelector("#leadAmountField"),
      priority: document.querySelector("#leadPriorityField"),
      reason: document.querySelector("#leadNotesField"),
      title: document.querySelector("#leadTitleField"),
      status: document.querySelector("#leadStatusField")
    }[field] || null;
  }

  function startLeadEdit(lead) {
    if (!lead || !canEditLead(lead)) {
      showLeadMessage("This lead cannot be edited by the current role.", "error");
      return;
    }

    leadEditTarget = lead;
    document.querySelector("#leadFormEyebrow").textContent = "Edit Lead";
    document.querySelector("#leadFormTitle").textContent = lead.title;
    document.querySelector("#leadTitleWrapper").classList.remove("hidden");
    document.querySelector("#leadStatusWrapper").classList.remove("hidden");
    document.querySelector("#leadCancelEditButton").classList.remove("hidden");
    document.querySelector("#leadSubmitButton").textContent = "Save lead";
    document.querySelector("#leadTitleField").value = lead.title || "";
    document.querySelector("#leadCustomerField").value = lead.accountNumber || "";
    document.querySelector("#leadTypeField").value = lead.type || "PL";
    document.querySelector("#leadAmountField").value = lead.amount || "";
    document.querySelector("#leadPriorityField").value = lead.priority || "Medium";
    document.querySelector("#leadStatusField").value = lead.status || "";
    document.querySelector("#leadNotesField").value = lead.reason || "";
    showLeadMessage("Editing lead. Save changes or cancel to return to create mode.", "info");
    document.querySelector("#leadCreateForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearLeadEditMode(resetForm = true) {
    leadEditTarget = null;
    document.querySelector("#leadFormEyebrow").textContent = "Create Lead";
    document.querySelector("#leadFormTitle").textContent = "New PL / BL Opportunity";
    document.querySelector("#leadTitleWrapper").classList.add("hidden");
    document.querySelector("#leadStatusWrapper").classList.add("hidden");
    document.querySelector("#leadCancelEditButton").classList.add("hidden");
    document.querySelector("#leadSubmitButton").textContent = "Create lead";
    if (resetForm) {
      document.querySelector("#leadCreateForm")?.reset();
      clearLeadErrors();
    }
  }

  function showLeadMessage(message, type) {
    const messageElement = document.querySelector("#leadFormMessage");
    if (!messageElement) {
      return;
    }

    messageElement.textContent = message;
    messageElement.className = `form-message ${type}`;
    messageElement.classList.remove("hidden");
  }

  function setLeadSubmitting(isSubmitting) {
    const button = document.querySelector("#leadSubmitButton");
    if (button) {
      button.disabled = isSubmitting;
      button.textContent = isSubmitting ? "Saving..." : (leadEditTarget ? "Save lead" : "Create lead");
    }
  }

  function populateLeadCustomerOptions() {
    const datalist = document.querySelector("#leadCustomerOptions");
    if (!datalist) {
      return;
    }

    datalist.innerHTML = window.crmCustomers.map((customer) => `<option value="${customer.accountNumber}">${customer.name}</option>`).join("");
  }

  function renderLeadDetail() {
    const lead = getVisibleLeads().find((item) => item.id === getId());
    if (!lead) {
      showRestricted("Lead not found or not visible for this role.");
      return;
    }

    const customer = window.crmFindCustomer("accountNumber", lead.accountNumber);
    setText("#leadCompanyName", lead.title);
    setText("#leadContactInfo", customer ? `${customer.name} | ${customer.phone}` : "Restricted contact");
    setText("#leadAmount", currency(lead.amount));
    setText("#leadStatus", lead.status);
    setText("#leadProbability", lead.priority === "High" ? "75%" : lead.priority === "Medium" ? "50%" : "25%");
    setText("#leadCloseDate", "06/30/2026");
    setText("#leadAssignedTo", customer ? customer.personalBanker : "Unassigned");
    setText("#detailLeadType", lead.type === "PL" ? "Personal Loan" : "Business Loan");
    setText("#detailLeadReason", lead.reason);
    setText("#detailLinkedCustomer", customer ? customer.name : "Restricted");
    const clientLink = document.querySelector("#viewCustomerLink");
    if (clientLink && customer && canOpenClient()) {
      clientLink.href = window.crmClientUrl(customer.accountNumber);
      clientLink.classList.remove("hidden");
    }
  }

  async function renderOffers() {
    const listConfig = {
      searchText: (offer) => [offer.type, offer.title, offer.audience, offer.priority, offer.status, offer.reason],
      filter: (offer, filter) => offer.type === filter || offer.priority === filter,
      sorts: {
        "priority-desc": (a, b) => priorityRank(b.priority) - priorityRank(a.priority),
        "title-asc": (a, b) => compareText(a.title, b.title),
        "status-asc": (a, b) => compareText(a.status, b.status)
      }
    };
    const paged = await window.crmApi.getPagedOffers(getPagingRequest());
    let offers = [];

    if (isPagedResponse(paged)) {
      syncPaginationState(paged);
      offers = paged.data.map(withOfferId);
      setText("#offerCountSubtitle", pagedCountMessage(paged, "offer or campaign signal"));
      renderPaginationControls(paged);
    } else {
      const allOffers = getVisibleOffers();
      const filteredOffers = applyListControls(allOffers, listConfig);
      const localPage = paginateRows(filteredOffers);
      offers = localPage.data;
      setText("#offerCountSubtitle", `${countMessage(filteredOffers.length, allOffers.length, "offer or campaign signal")} | ${pageRangeMessage(localPage)}`);
      renderPaginationControls(localPage);
    }

    currentPageRows.offers = offers;
    const list = document.querySelector("#offerCardList");
    list.innerHTML = offers.length ? offers.map((offer) => `
      <article class="list-card">
        <header>
          <div>
            <span class="status-badge ${statusClass(offer.priority)}">${offer.priority}</span>
            <h2>${offer.title}</h2>
          </div>
          <strong>${offer.audience}</strong>
        </header>
        <p>${offer.reason}</p>
        <div class="table-actions">
          <a class="primary-link" href="offer-detail.html?id=${offer.id}">View details</a>
          ${canEditOffer(offer) ? `<button class="secondary-button compact-button" type="button" data-edit-offer data-offer-db-id="${offer.dbId || ""}">Edit</button>` : ""}
        </div>
      </article>
    `).join("") : `<p class="empty-state">No offers match these filters.</p>`;
  }

  function bindOfferForm() {
    if (page !== "offers" || offerFormBound) {
      return;
    }

    const form = document.querySelector("#offerEditForm");
    if (!form) {
      return;
    }

    offerFormBound = true;
    form.addEventListener("submit", handleOfferUpdate);
    document.querySelector("#offerCancelEditButton")?.addEventListener("click", clearOfferEditMode);
  }

  function bindOfferActions() {
    if (page !== "offers") {
      return;
    }

    const list = document.querySelector("#offerCardList");
    if (!list) {
      return;
    }

    list.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit-offer]");
      if (!editButton) {
        return;
      }

      const dbId = Number(editButton.dataset.offerDbId);
      const offer = currentPageRows.offers.concat(getVisibleOffers()).find((item) => item.dbId === dbId);
      startOfferEdit(offer);
    });
  }

  async function handleOfferUpdate(event) {
    event.preventDefault();

    if (!offerEditTarget) {
      showOfferMessage("Choose an offer to edit first.", "error");
      return;
    }

    const validation = validateOfferForm();
    if (!validation.valid) {
      showOfferMessage("Fix the highlighted fields before saving.", "error");
      return;
    }

    setOfferSubmitting(true);
    showOfferMessage("Saving offer edits...", "info");

    try {
      const result = await window.crmApi.updateOffer({
        ...validation.values,
        id: offerEditTarget.dbId
      });
      await window.crmApi.loadBootstrap();
      clearOfferEditMode();
      showOfferMessage(result.message || "Offer updated.", "success");
      await renderOffers();
    } catch (error) {
      applyOfferErrors(error.fieldErrors || {});
      showOfferMessage(error.message || "Offer could not be updated.", "error");
    } finally {
      setOfferSubmitting(false);
    }
  }

  function startOfferEdit(offer) {
    if (!offer || !canEditOffer(offer)) {
      showOfferMessage("This offer cannot be edited by the current role.", "error");
      return;
    }

    offerEditTarget = offer;
    document.querySelector("#offerEditPanel").classList.remove("hidden");
    document.querySelector("#offerEditTitle").textContent = offer.title;
    document.querySelector("#offerTitleField").value = offer.title || "";
    document.querySelector("#offerTypeField").value = offer.type || "PL";
    document.querySelector("#offerAudienceField").value = offer.audience || "";
    document.querySelector("#offerPriorityField").value = offer.priority || "Medium";
    document.querySelector("#offerStatusField").value = offer.status || "";
    document.querySelector("#offerReasonField").value = offer.reason || "";
    showOfferMessage("Editing offer. Save changes or cancel when done.", "info");
    document.querySelector("#offerEditPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearOfferEditMode() {
    offerEditTarget = null;
    document.querySelector("#offerEditForm")?.reset();
    document.querySelector("#offerEditPanel")?.classList.add("hidden");
    clearOfferErrors();
  }

  function validateOfferForm() {
    const values = {
      title: document.querySelector("#offerTitleField")?.value.trim() || "",
      type: document.querySelector("#offerTypeField")?.value || "",
      audience: document.querySelector("#offerAudienceField")?.value.trim() || "",
      priority: document.querySelector("#offerPriorityField")?.value || "",
      status: document.querySelector("#offerStatusField")?.value.trim() || "",
      reason: document.querySelector("#offerReasonField")?.value.trim() || ""
    };
    const errors = {};

    if (!values.title) errors.offerTitle = "Offer title is required.";
    if (!["PL", "BL"].includes(values.type)) errors.offerType = "Choose personal loan or business loan.";
    if (!values.audience) errors.offerAudience = "Audience is required.";
    if (!["High", "Medium", "Low"].includes(values.priority)) errors.offerPriority = "Choose a priority.";
    if (!values.status) errors.offerStatus = "Status is required.";
    if (!values.reason) errors.offerReason = "Offer notes are required.";

    applyOfferErrors(errors);
    return {
      valid: Object.keys(errors).length === 0,
      values,
      errors
    };
  }

  function applyOfferErrors(errors) {
    clearOfferErrors();
    Object.entries(errors).forEach(([field, message]) => {
      const error = document.querySelector(`[data-error-for="${field}"]`);
      const input = {
        offerTitle: document.querySelector("#offerTitleField"),
        offerType: document.querySelector("#offerTypeField"),
        offerAudience: document.querySelector("#offerAudienceField"),
        offerPriority: document.querySelector("#offerPriorityField"),
        offerStatus: document.querySelector("#offerStatusField"),
        offerReason: document.querySelector("#offerReasonField")
      }[field];
      if (error) error.textContent = message;
      if (input) input.classList.add("field-invalid");
    });
  }

  function clearOfferErrors() {
    document.querySelectorAll("[data-error-for^='offer']").forEach((error) => {
      error.textContent = "";
    });
    [
      "#offerTitleField",
      "#offerTypeField",
      "#offerAudienceField",
      "#offerPriorityField",
      "#offerStatusField",
      "#offerReasonField"
    ].forEach((selector) => document.querySelector(selector)?.classList.remove("field-invalid"));
  }

  function showOfferMessage(message, type) {
    const messageElement = document.querySelector("#offerFormMessage");
    if (!messageElement) {
      return;
    }

    messageElement.textContent = message;
    messageElement.className = `form-message ${type}`;
    messageElement.classList.remove("hidden");
  }

  function setOfferSubmitting(isSubmitting) {
    const button = document.querySelector("#offerSubmitButton");
    if (button) {
      button.disabled = isSubmitting;
      button.textContent = isSubmitting ? "Saving..." : "Save offer";
    }
  }

  function renderOfferDetail() {
    const offer = getVisibleOffers().find((item) => item.id === getId());
    if (!offer) {
      showRestricted("Offer not found or not visible for this role.");
      return;
    }

    setText("#offerTitle", offer.title);
    setText("#offerAudience", offer.audience);
    setText("#offerPriority", offer.priority);
    setText("#offerStatus", offer.status);
    setText("#offerReason", offer.reason);
    setText("#offerAccess", activeRole === "marketing" ? "Full campaign access" : "Read-only campaign context");
    renderSegments("#offerSegments");
  }

  function renderFraudWatch() {
    const allCustomers = getFraudCustomers();
    const customers = applyListControls(allCustomers, {
      searchText: (customer) => [customer.name, customer.cif, customer.fraudRiskScore, customer.fraudRiskTier, customer.fraudCases, customer.lastReviewed],
      filter: (customer, filter) => customer.fraudRiskTier === filter,
      sorts: {
        "score-desc": (a, b) => b.fraudRiskScore - a.fraudRiskScore,
        "score-asc": (a, b) => a.fraudRiskScore - b.fraudRiskScore,
        "name-asc": (a, b) => compareText(a.name, b.name),
        "tier-desc": (a, b) => priorityRank(b.fraudRiskTier) - priorityRank(a.fraudRiskTier)
      }
    });

    setText("#fraudWatchSubtitle", countMessage(customers.length, allCustomers.length, "risk record"));
    setTable("#fraudWatchTableBody", customers, (customer) => `
      <tr>
        <td><strong>${customer.name}</strong><span class="text-secondary">${activeRole === "fraud" || activeRole === "admin" ? customer.cif : "Customer details restricted"}</span></td>
        <td><strong>${customer.fraudRiskScore} / 100</strong></td>
        <td><span class="status-badge ${statusClass(customer.fraudRiskTier)}">${customer.fraudRiskTier}</span></td>
        <td>${customer.fraudCases ?? "Score only"}</td>
        <td>${customer.lastReviewed}</td>
        <td>${canOpenFraud() ? `<a class="primary-link" href="${window.crmUrlWithRole(`fraud.html?accountNumber=${customer.accountNumber}`, activeRole)}">Open</a>` : "Summary only"}</td>
      </tr>
    `);
  }

  async function renderMeetings() {
    populateMeetingCustomerOptions();
    setMeetingOwnerField();
    const listConfig = {
      searchText: (meeting) => [meeting.title, meeting.client, meeting.date, meeting.owner],
      filter: (meeting, filter) => meeting.owner === filter,
      sorts: {
        "date-asc": (a, b) => compareDate(a.date, b.date),
        "date-desc": (a, b) => compareDate(b.date, a.date),
        "client-asc": (a, b) => compareText(a.client, b.client),
        "owner-asc": (a, b) => compareText(a.owner, b.owner)
      }
    };
    const paged = await window.crmApi.getPagedMeetings(getPagingRequest());
    let meetings = [];

    if (isPagedResponse(paged)) {
      syncPaginationState(paged);
      meetings = paged.data.map(withMeetingId);
      setText("#meetingsSubtitle", pagedCountMessage(paged, "meeting"));
      renderPaginationControls(paged);
    } else {
      const allMeetings = getVisibleMeetings();
      const filteredMeetings = applyListControls(allMeetings, listConfig);
      const localPage = paginateRows(filteredMeetings);
      meetings = localPage.data;
      setText("#meetingsSubtitle", `${countMessage(filteredMeetings.length, allMeetings.length, "meeting")} | ${pageRangeMessage(localPage)}`);
      renderPaginationControls(localPage);
    }

    currentPageRows.meetings = meetings;
    const list = document.querySelector("#meetingListPage");
    list.innerHTML = meetings.length ? meetings.map((meeting) => `
      <article class="list-card">
        <header>
          <div>
            <span class="status-badge status-open">${meeting.date}</span>
            <h2>${meeting.title}</h2>
          </div>
          <strong>${meeting.owner}</strong>
        </header>
        <p>${meeting.client}</p>
        <div class="table-actions">
          <a class="primary-link" href="meeting-detail.html?id=${meeting.id}">View meeting</a>
          ${canEditMeeting(meeting) ? `<button class="secondary-button compact-button" type="button" data-edit-meeting data-meeting-db-id="${meeting.dbId || ""}" data-meeting-local-id="${meeting.localId || ""}">Edit</button>` : ""}
          ${canCancelMeeting(meeting) ? `<button class="danger-button compact-button" type="button" data-cancel-meeting data-meeting-db-id="${meeting.dbId || ""}" data-meeting-local-id="${meeting.localId || ""}">Cancel</button>` : ""}
        </div>
      </article>
    `).join("") : `<p class="empty-state">No meetings match these filters.</p>`;
  }

  function bindMeetingForm() {
    if (page !== "meetings" || meetingFormBound) {
      return;
    }

    const form = document.querySelector("#meetingCreateForm");
    if (!form) {
      return;
    }

    meetingFormBound = true;
    populateMeetingCustomerOptions();
    setMeetingOwnerField();

    form.addEventListener("submit", handleMeetingCreate);
    document.querySelector("#meetingCancelEditButton")?.addEventListener("click", clearMeetingEditMode);
    form.querySelectorAll("input").forEach((field) => {
      field.addEventListener("input", () => validateMeetingForm(false));
      field.addEventListener("change", () => validateMeetingForm(false));
    });
  }

  async function handleMeetingCreate(event) {
    event.preventDefault();

    const validation = validateMeetingForm(true);
    if (!validation.valid) {
      showMeetingMessage("Fix the highlighted fields before scheduling the meeting.", "error");
      return;
    }

    setMeetingSubmitting(true);
    showMeetingMessage(meetingEditTarget ? "Saving meeting edits..." : "Scheduling meeting...", "info");

    try {
      const wasEditing = Boolean(meetingEditTarget);
      const result = meetingEditTarget
        ? await window.crmApi.updateMeeting({
            ...validation.values,
            id: meetingEditTarget.dbId || meetingEditTarget.id,
            dbId: meetingEditTarget.dbId
          })
        : await window.crmApi.createMeeting(validation.values);
      await window.crmApi.loadBootstrap();
      document.querySelector("#meetingCreateForm").reset();
      clearMeetingErrors();
      clearMeetingEditMode(false);
      setMeetingOwnerField();
      showMeetingMessage(result.message || (wasEditing ? "Meeting updated." : "Meeting scheduled."), "success");
      resetListPage();
      await renderMeetings();
    } catch (error) {
      applyMeetingErrors(error.fieldErrors || {});
      showMeetingMessage(error.message || "Meeting could not be scheduled.", "error");
    } finally {
      setMeetingSubmitting(false);
    }
  }

  function bindMeetingActions() {
    if (page !== "meetings") {
      return;
    }

    const list = document.querySelector("#meetingListPage");
    if (!list) {
      return;
    }

    list.addEventListener("click", handleMeetingAction);
  }

  async function handleMeetingAction(event) {
    const editButton = event.target.closest("[data-edit-meeting]");
    const cancelButton = event.target.closest("[data-cancel-meeting]");

    if (!editButton && !cancelButton) {
      return;
    }

    const actionButton = editButton || cancelButton;
    const dbId = actionButton.dataset.meetingDbId ? Number(actionButton.dataset.meetingDbId) : null;
    const localId = actionButton.dataset.meetingLocalId || "";
    const meeting = currentPageRows.meetings.concat(getVisibleMeetings()).find((item) => {
      return (localId && item.localId === localId) || (dbId && item.dbId === dbId);
    });

    if (editButton) {
      startMeetingEdit(meeting);
      return;
    }

    if (!meeting || !canCancelMeeting(meeting)) {
      showMeetingMessage("Only meetings scheduled through this prototype can be canceled.", "error");
      return;
    }

    if (!window.confirm(`Cancel "${meeting.title}"?`)) {
      return;
    }

    cancelButton.disabled = true;
    cancelButton.textContent = "Canceling...";

    try {
      const result = await window.crmApi.deleteMeeting(meeting);
      await window.crmApi.loadBootstrap();
      showMeetingMessage(result.message || "Meeting canceled.", "success");
      await renderMeetings();
    } catch (error) {
      showMeetingMessage(error.message || "Meeting could not be canceled.", "error");
      cancelButton.disabled = false;
      cancelButton.textContent = "Cancel";
    }
  }

  function validateMeetingForm(showErrors) {
    const values = {
      accountNumber: document.querySelector("#meetingCustomerField")?.value.trim() || "",
      title: document.querySelector("#meetingTitleField")?.value.trim() || "",
      date: document.querySelector("#meetingDateField")?.value || ""
    };
    const errors = {};

    if (!values.accountNumber) {
      errors.meetingAccountNumber = "Account number is required.";
    } else if (!window.crmFindCustomer("accountNumber", values.accountNumber)) {
      errors.meetingAccountNumber = "Use a visible test customer account.";
    }

    if (!values.title) {
      errors.meetingTitle = "Meeting title is required.";
    } else if (values.title.length > 90) {
      errors.meetingTitle = "Meeting title must be 90 characters or fewer.";
    }

    if (!values.date) {
      errors.meetingDate = "Meeting date is required.";
    }

    if (showErrors || Object.keys(errors).length > 0) {
      applyMeetingErrors(errors);
    } else {
      clearMeetingErrors();
    }

    return {
      valid: Object.keys(errors).length === 0,
      values,
      errors
    };
  }

  function applyMeetingErrors(errors) {
    clearMeetingErrors();

    Object.entries(errors).forEach(([field, message]) => {
      const error = document.querySelector(`[data-error-for="${field}"]`);
      const input = {
        meetingAccountNumber: document.querySelector("#meetingCustomerField"),
        meetingTitle: document.querySelector("#meetingTitleField"),
        meetingDate: document.querySelector("#meetingDateField")
      }[field];

      if (error) {
        error.textContent = message;
      }

      if (input) {
        input.classList.add("field-invalid");
      }
    });
  }

  function clearMeetingErrors() {
    document.querySelectorAll("[data-error-for^='meeting']").forEach((error) => {
      error.textContent = "";
    });
    [document.querySelector("#meetingCustomerField"), document.querySelector("#meetingTitleField"), document.querySelector("#meetingDateField")].forEach((field) => {
      if (field) {
        field.classList.remove("field-invalid");
      }
    });
  }

  function showMeetingMessage(message, type) {
    const messageElement = document.querySelector("#meetingFormMessage");
    if (!messageElement) {
      return;
    }

    messageElement.textContent = message;
    messageElement.className = `form-message ${type}`;
    messageElement.classList.remove("hidden");
  }

  function setMeetingSubmitting(isSubmitting) {
    const button = document.querySelector("#meetingSubmitButton");
    if (button) {
      button.disabled = isSubmitting;
      button.textContent = isSubmitting ? "Saving..." : (meetingEditTarget ? "Save meeting" : "Schedule meeting");
    }
  }

  function populateMeetingCustomerOptions() {
    const datalist = document.querySelector("#meetingCustomerOptions");
    if (!datalist) {
      return;
    }

    datalist.innerHTML = window.crmCustomers.map((customer) => `<option value="${customer.accountNumber}">${customer.name}</option>`).join("");
  }

  function setMeetingOwnerField() {
    const ownerField = document.querySelector("#meetingOwnerField");
    const profile = window.crmRoleProfiles[activeRole];

    if (ownerField && profile) {
      ownerField.value = profile.name;
    }
  }

  function startMeetingEdit(meeting) {
    if (!meeting || !canEditMeeting(meeting)) {
      showMeetingMessage("This meeting cannot be edited by the current role.", "error");
      return;
    }

    meetingEditTarget = meeting;
    document.querySelector("#meetingFormEyebrow").textContent = "Edit Meeting";
    document.querySelector("#meetingFormTitle").textContent = meeting.title;
    document.querySelector("#meetingCancelEditButton").classList.remove("hidden");
    document.querySelector("#meetingSubmitButton").textContent = "Save meeting";
    document.querySelector("#meetingCustomerField").value = meeting.accountNumber || "";
    document.querySelector("#meetingTitleField").value = meeting.title || "";
    document.querySelector("#meetingDateField").value = normalizeDateForInput(meeting.date);
    document.querySelector("#meetingOwnerField").value = meeting.owner || "";
    showMeetingMessage("Editing meeting. Save changes or cancel to return to schedule mode.", "info");
    document.querySelector("#meetingCreateForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearMeetingEditMode(resetForm = true) {
    meetingEditTarget = null;
    document.querySelector("#meetingFormEyebrow").textContent = "Schedule Meeting";
    document.querySelector("#meetingFormTitle").textContent = "New Client Meeting";
    document.querySelector("#meetingCancelEditButton").classList.add("hidden");
    document.querySelector("#meetingSubmitButton").textContent = "Schedule meeting";
    if (resetForm) {
      document.querySelector("#meetingCreateForm")?.reset();
      clearMeetingErrors();
      setMeetingOwnerField();
    }
  }

  function renderMeetingDetail() {
    const meeting = getVisibleMeetings().find((item) => item.id === getId());
    if (!meeting) {
      showRestricted("Meeting not found or not visible for this role.");
      return;
    }

    const customer = window.crmFindCustomer("accountNumber", meeting.accountNumber);
    setText("#meetingTitle", meeting.title);
    setText("#meetingClient", meeting.client);
    setText("#meetingDate", meeting.date);
    setText("#meetingOwner", meeting.owner);
    setText("#meetingAgenda", customer ? `Review ${customer.name}'s relationship, notes, next action, and role-appropriate risk cues.` : "Role-appropriate customer review.");
    if (customer && canOpenClient()) {
      const link = document.querySelector("#meetingClientLink");
      link.href = window.crmClientUrl(customer.accountNumber);
      link.classList.remove("hidden");
    }
  }

  function renderPipeline() {
    const rawItems = activeRole === "marketing" ? getVisibleOffers().map(offerToPipeline) : getVisibleLeads();
    const leads = applyListControls(rawItems, {
      searchText: (lead) => [lead.type, lead.title, lead.reason, lead.status, lead.priority, lead.amount],
      filter: (lead, filter) => getStage(lead) === filter,
      sorts: {
        "amount-desc": (a, b) => (b.amount || 0) - (a.amount || 0),
        "amount-asc": (a, b) => (a.amount || 0) - (b.amount || 0),
        "stage-asc": (a, b) => compareText(getStage(a), getStage(b)),
        "title-asc": (a, b) => compareText(a.title, b.title)
      }
    });

    const stages = ["New", "Qualified", "Proposal", "Negotiation", "Closed"];
    setText("#pipelineSubtitle", `${currency(leads.reduce((total, lead) => total + (lead.amount || 0), 0))} in ${leads.length} visible opportunities`);
    document.querySelector("#pipelineSummary").innerHTML = stages.map((stage) => {
      const stageItems = leads.filter((lead) => getStage(lead) === stage);
      return `<article class="stage-card"><h4>${stage}</h4><strong>${stageItems.length}</strong><span class="stage-value">${currency(stageItems.reduce((total, lead) => total + (lead.amount || 0), 0))}</span></article>`;
    }).join("");
    document.querySelector("#pipelineBoard").innerHTML = stages.map((stage) => {
      const cards = leads.filter((lead) => getStage(lead) === stage);
      return `
        <section class="kanban-column">
          <h3 class="kanban-header">${stage}</h3>
          <ul class="kanban-cards">
            ${cards.map((lead) => `<li class="kanban-card"><strong>${lead.title}</strong><span class="card-amount">${currency(lead.amount || 0)}</span><span class="text-secondary">${lead.status}</span></li>`).join("") || `<li class="text-secondary">No visible items</li>`}
          </ul>
        </section>
      `;
    }).join("");
  }

  async function renderProfitability() {
    const listConfig = {
      searchText: (customer) => [customer.name, customer.primaryBranch, customer.profitability.tier, customer.profitability.mainDriver, customer.profitability.watchItem, customer.profitability.annualContribution],
      filter: (customer, filter) => customer.profitability.tier === filter,
      sorts: {
        "contribution-desc": (a, b) => b.profitability.annualContribution - a.profitability.annualContribution,
        "contribution-asc": (a, b) => a.profitability.annualContribution - b.profitability.annualContribution,
        "name-asc": (a, b) => compareText(a.name, b.name),
        "tier-desc": (a, b) => priorityRank(b.profitability.tier) - priorityRank(a.profitability.tier)
      }
    };
    const paged = await window.crmApi.getPagedCustomers(getPagingRequest());
    let customers = [];
    let rankOffset = 0;
    let totalContribution = 0;
    let topCustomer = "None";

    if (isPagedResponse(paged)) {
      syncPaginationState(paged);
      customers = paged.data;
      rankOffset = (paged.page - 1) * paged.pageSize;
      totalContribution = paged.meta ? paged.meta.totalContribution : customers.reduce((total, customer) => total + customer.profitability.annualContribution, 0);
      topCustomer = paged.meta ? paged.meta.topCustomer : customers[0]?.name || "None";
      setText("#profitSubtitle", pagedCountMessage(paged, "profitability record"));
      renderPaginationControls(paged);
    } else {
      const allCustomers = getProfitabilityCustomers();
      const filteredCustomers = applyListControls(allCustomers, listConfig);
      const localPage = paginateRows(filteredCustomers);
      customers = localPage.data;
      rankOffset = (localPage.page - 1) * localPage.pageSize;
      totalContribution = filteredCustomers.reduce((total, customer) => total + customer.profitability.annualContribution, 0);
      topCustomer = filteredCustomers[0] ? filteredCustomers[0].name : "None";
      setText("#profitSubtitle", `${countMessage(filteredCustomers.length, allCustomers.length, "profitability record")} | ${pageRangeMessage(localPage)}`);
      renderPaginationControls(localPage);
    }

    currentPageRows.profitability = customers;
    setText("#profitTotalRevenue", currency(totalContribution));
    setText("#profitTopCustomer", topCustomer);
    setTable("#profitabilityTableBody", customers, (customer, index) => `
      <tr>
        <td>${rankOffset + index + 1}</td>
        <td><strong>${customer.name}</strong><span class="text-secondary">${customer.primaryBranch}</span></td>
        <td><strong>${currency(customer.profitability.annualContribution)}</strong></td>
        <td><span class="status-badge ${statusClass(customer.profitability.tier)}">${customer.profitability.tier}</span></td>
        <td>${customer.profitability.mainDriver}</td>
        <td>${customer.profitability.watchItem}</td>
        <td><a class="primary-link" href="${activeRole === "wealth" ? window.crmUrlWithRole(`wealth.html?accountNumber=${customer.accountNumber}`, activeRole) : window.crmClientUrl(customer.accountNumber)}">View</a></td>
      </tr>
    `);
  }

  function renderActivity() {
    const allEvents = getActivityEvents();
    const events = applyListControls(allEvents, {
      searchText: (event) => [event.type, event.title, event.detail, event.date],
      filter: (event, filter) => event.type === filter,
      sorts: {
        "type-asc": (a, b) => compareText(a.type, b.type),
        "title-asc": (a, b) => compareText(a.title, b.title)
      }
    });

    setText("#activitySubtitle", countMessage(events.length, allEvents.length, "audit event"));
    document.querySelector("#activityTimeline").innerHTML = events.length ? events.map((event) => `
      <article class="timeline-item ${event.type === "Access Denied" ? "denied" : ""}">
        <div class="timeline-header">
          <strong>${event.title}</strong>
          <span class="text-secondary">${event.date}</span>
        </div>
        <p>${event.detail}</p>
        <span class="action-badge ${event.type === "Access Denied" ? "denied" : ""}">${event.type}</span>
      </article>
    `).join("") : `<p class="empty-state">No audit events match these filters.</p>`;
  }

  function resetListPage() {
    paginationState.page = 1;
  }

  function rerenderCurrentPage() {
    if (renderCurrentPage) {
      void renderCurrentPage();
    }
  }

  function getPagingRequest() {
    return {
      page: paginationState.page,
      pageSize: paginationState.pageSize,
      search: listState.search,
      filter: listState.filter,
      sort: listState.sort
    };
  }

  function isPagedResponse(payload) {
    return Boolean(payload && Array.isArray(payload.data) && Number.isInteger(payload.page) && Number.isInteger(payload.pages));
  }

  function syncPaginationState(paged) {
    paginationState.page = paged.page;
    paginationState.pageSize = paged.pageSize;
    paginationState.total = paged.total;
    paginationState.pages = paged.pages;
  }

  function paginateRows(rows) {
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / paginationState.pageSize));
    const page = Math.min(paginationState.page, pages);
    const start = (page - 1) * paginationState.pageSize;
    const paged = {
      data: rows.slice(start, start + paginationState.pageSize),
      page,
      pageSize: paginationState.pageSize,
      total,
      pages
    };

    syncPaginationState(paged);
    return paged;
  }

  function renderPaginationControls(paged) {
    const anchor = getPaginationAnchor();

    if (!anchor) {
      return;
    }

    let controls = document.querySelector("#paginationControls");
    if (!controls) {
      controls = document.createElement("nav");
      controls.id = "paginationControls";
      controls.className = "pagination-controls";
      controls.setAttribute("aria-label", "List pagination");
      anchor.insertAdjacentElement("afterend", controls);
    }

    const page = paged.page;
    const pages = paged.pages;
    const pageButtons = getPaginationButtonValues(page, pages);

    controls.innerHTML = `
      <span class="pagination-summary">${pageRangeMessage(paged)}</span>
      <div class="pagination-buttons">
        <button type="button" class="pagination-button" data-page-target="${page - 1}" ${page <= 1 ? "disabled" : ""}>Previous</button>
        ${pageButtons.map((value) => value === "ellipsis"
          ? `<span class="pagination-ellipsis">...</span>`
          : `<button type="button" class="pagination-button ${value === page ? "active" : ""}" data-page-target="${value}" ${value === page ? `aria-current="page"` : ""}>${value}</button>`
        ).join("")}
        <button type="button" class="pagination-button" data-page-target="${page + 1}" ${page >= pages ? "disabled" : ""}>Next</button>
      </div>
    `;

    controls.querySelectorAll("[data-page-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const targetPage = Number(button.dataset.pageTarget);
        if (!Number.isInteger(targetPage) || targetPage < 1 || targetPage > paginationState.pages || targetPage === paginationState.page) {
          return;
        }

        paginationState.page = targetPage;
        rerenderCurrentPage();
      });
    });
  }

  function getPaginationAnchor() {
    return document.querySelector(".list-container[data-page-content]")
      || document.querySelector("#offerCardList")
      || document.querySelector("#meetingListPage");
  }

  function getPaginationButtonValues(page, pages) {
    const values = new Set([1, pages, page - 1, page, page + 1]);
    const sortedValues = [...values]
      .filter((value) => value >= 1 && value <= pages)
      .sort((a, b) => a - b);
    const buttons = [];

    sortedValues.forEach((value, index) => {
      if (index > 0 && value - sortedValues[index - 1] > 1) {
        buttons.push("ellipsis");
      }
      buttons.push(value);
    });

    return buttons;
  }

  function pageRangeMessage(paged) {
    if (!paged.total) {
      return "Page 1 of 1 (0 total)";
    }

    const start = (paged.page - 1) * paged.pageSize + 1;
    const end = start + paged.data.length - 1;
    return `${start}-${end} of ${paged.total} total | Page ${paged.page} of ${paged.pages}`;
  }

  function pagedCountMessage(paged, singular) {
    const plural = singular.endsWith("s") ? singular : `${singular}s`;
    return paged.total === 1
      ? `1 visible ${singular}`
      : `${paged.total} visible ${plural}`;
  }

  function applyListControls(rows, config = {}) {
    let result = rows.slice();

    if (listState.search) {
      result = result.filter((row) => normalizeSearchText(config.searchText ? config.searchText(row) : row).includes(listState.search));
    }

    if (listState.filter !== "all" && config.filter) {
      result = result.filter((row) => config.filter(row, listState.filter));
    }

    const sortFn = config.sorts && config.sorts[listState.sort];
    if (sortFn) {
      result.sort(sortFn);
    }

    return result;
  }

  function withLeadId(lead, index) {
    return {
      ...lead,
      id: lead.id || (lead.dbId ? `LD${lead.dbId}` : `L${index + 1}`)
    };
  }

  function withOfferId(offer, index) {
    return {
      ...offer,
      id: offer.id || (offer.dbId ? `OD${offer.dbId}` : `O${index + 1}`)
    };
  }

  function withMeetingId(meeting, index) {
    return {
      ...meeting,
      id: meeting.id || (meeting.dbId ? `MD${meeting.dbId}` : `M${index + 1}`)
    };
  }

  function getVisibleLeads() {
    return window.crmLeads
      .map(withLeadId)
      .filter((lead) => activeRole === "admin" || lead.visibleTo.includes(activeRole))
      .filter((lead) => activeRole !== "marketing" && activeRole !== "fraud" && activeRole !== "hr" && activeRole !== "wealth");
  }

  function getVisibleOffers() {
    return window.crmOffers
      .map(withOfferId)
      .filter((offer) => activeRole === "admin" || activeRole === "wealth" || offer.visibleTo.includes(activeRole))
      .filter((offer) => ["admin", "marketing", "wealth"].includes(activeRole));
  }

  function getVisibleMeetings() {
    return window.crmMeetings
      .map(withMeetingId)
      .filter((meeting) => {
        if (activeRole === "admin") return true;
        if (activeRole === "wealth") {
          return window.crmIsWealthClient(window.crmFindCustomer("accountNumber", meeting.accountNumber));
        }
        return meeting.visibleTo.includes(activeRole);
      });
  }

  function getFraudCustomers() {
    return window.crmCustomers
      .filter((customer) => customer.fraudRiskScore >= 45)
      .sort((a, b) => b.fraudRiskScore - a.fraudRiskScore);
  }

  function getProfitabilityCustomers() {
    return window.crmCustomers
      .filter((customer) => activeRole !== "wealth" || window.crmIsWealthClient(customer))
      .sort((a, b) => b.profitability.annualContribution - a.profitability.annualContribution);
  }

  function getActivityEvents() {
    return [
      { type: "View", title: "Admin reviewed role access matrix", detail: "Confirmed API validation for all current roles.", date: "Today" },
      { type: "Access Denied", title: "Banker attempted fraud matrix detail", detail: "Blocked because Banker access is fraud score summary only.", date: "Today" },
      { type: "View", title: "Wealth opened Thomas Nguyen portfolio", detail: "Viewed investment portfolio and fraud score summary.", date: "Yesterday" },
      { type: "Create", title: "Marketing reviewed campaign offer", detail: "Worked from aggregate segment data without PII.", date: "Yesterday" },
      { type: "Access Denied", title: "Marketing attempted customer lookup", detail: "Blocked because Marketing has aggregate-only access.", date: "2 days ago" }
    ];
  }

  function offerToPipeline(offer) {
    return {
      ...offer,
      amount: offer.type === "BL" ? 65000 : 25000,
      status: offer.status.includes("ready") ? "Qualified" : "New"
    };
  }

  function getStage(item) {
    if (item.status.includes("Ready") || item.status.includes("ready")) return "Qualified";
    if (item.status.includes("review")) return "Proposal";
    if (item.status.includes("discussion")) return "Negotiation";
    if (item.status.includes("Won")) return "Closed";
    return "New";
  }

  function renderSegments(selector) {
    const list = document.querySelector(selector);
    list.innerHTML = window.crmMarketingSegments.map((segment) => `
      <li>
        <div>
          <strong>${segment.name}</strong>
          <span>${segment.signal}</span>
        </div>
        <div class="record-meta"><strong>${segment.audience}</strong></div>
      </li>
    `).join("");
  }

  function canAccessPage(pageName) {
    if (window.crmCanAccessPage) {
      return window.crmCanAccessPage(pageName);
    }

    return !pageAccess[pageName] || pageAccess[pageName].includes(activeRole);
  }

  function canOpenFraud() {
    return window.crmHasPermission ? window.crmHasPermission("view_fraud_detail") : ["admin", "fraud"].includes(activeRole);
  }

  function canOpenClient() {
    return window.crmHasAnyPermission ? window.crmHasAnyPermission(customerSearchPermissions) : ["admin", "banker", "wealth", "loans"].includes(activeRole);
  }

  function canRemoveLead(lead) {
    return Boolean(lead && lead.status === "New lead" && (lead.dbId || lead.localId));
  }

  function canEditLead(lead) {
    return Boolean(lead && lead.dbId && (!window.crmHasPermission || window.crmHasPermission("edit_leads")));
  }

  function canEditOffer(offer) {
    return Boolean(offer && offer.dbId && (!window.crmHasPermission || window.crmHasPermission("edit_offers")));
  }

  function canEditMeeting(meeting) {
    return Boolean(meeting && meeting.dbId && (!window.crmHasPermission || window.crmHasPermission("edit_meetings")));
  }

  function canCancelMeeting(meeting) {
    return Boolean(meeting && (meeting.localId || meeting.userCreated));
  }

  function getId() {
    return new URLSearchParams(window.location.search).get("id") || "";
  }

  function getLeadText(lead) {
    const customer = window.crmFindCustomer("accountNumber", lead.accountNumber);
    return [
      lead.type,
      lead.title,
      lead.amount,
      lead.priority,
      lead.status,
      lead.reason,
      customer ? customer.name : "",
      customer && customer.businessAccounts[0] ? customer.businessAccounts[0].businessName : "",
      customer ? customer.personalBanker : ""
    ];
  }

  function getCustomerName(accountNumber) {
    const customer = window.crmFindCustomer("accountNumber", accountNumber);
    return customer ? customer.name : "";
  }

  function normalizeSearchText(value) {
    return (Array.isArray(value) ? value.join(" ") : JSON.stringify(value || "")).toLowerCase();
  }

  function compareText(a, b) {
    return String(a || "").localeCompare(String(b || ""));
  }

  function compareDate(a, b) {
    return new Date(a).getTime() - new Date(b).getTime();
  }

  function normalizeDateForInput(value) {
    const dateText = String(value || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
      return dateText;
    }

    const parts = dateText.split("/");
    if (parts.length === 3) {
      const [month, day, year] = parts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    return "";
  }

  function priorityRank(value) {
    const rank = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    return rank[value] || 0;
  }

  function countMessage(visible, total, singular) {
    const plural = singular.endsWith("s") ? singular : `${singular}s`;
    return visible === total ? `${visible} visible ${visible === 1 ? singular : plural}` : `${visible} of ${total} visible ${total === 1 ? singular : plural}`;
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  }

  function setTable(selector, rows, renderRow) {
    const tableBody = document.querySelector(selector);
    const columnCount = tableBody.closest("table")?.querySelectorAll("thead th").length || 7;
    tableBody.innerHTML = rows.length
      ? rows.map(renderRow).join("")
      : `<tr><td colspan="${columnCount}" class="empty-state">No visible records match these filters.</td></tr>`;
  }

  function statusClass(status) {
    const normalizedStatus = String(status || "").toLowerCase();
    if (normalizedStatus.includes("critical") || normalizedStatus.includes("high")) return "status-high";
    if (normalizedStatus.includes("medium") || normalizedStatus.includes("ready")) return "status-medium";
    return "status-low";
  }

  function showRestricted(message = "") {
    document.body.classList.add("restricted-view");
    document.querySelectorAll("[data-page-content]").forEach((element) => {
      element.classList.add("hidden");
    });
    document.querySelectorAll(".list-topbar, .detail-topbar").forEach((element) => {
      element.classList.add("hidden");
    });
    const restrictedState = document.querySelector("#restrictedState");
    if (restrictedState) {
      restrictedState.classList.remove("hidden");
      const text = restrictedState.querySelector("p");
      if (text) text.textContent = message || buildRestrictedMessage();
    }
  }

  function buildRestrictedMessage() {
    const roleProfile = window.crmRoleProfiles[activeRole];
    const allowedModules = Object.keys(window.crmModulePermissions || {})
      .filter((module) => !window.crmCanAccessModule || window.crmCanAccessModule(module))
      .map((module) => moduleLabels[module])
      .filter(Boolean)
      .join(", ");
    const pageLabel = pageLabels[page] || "this page";
    return `${roleProfile.label} users do not have access to ${pageLabel}. Available areas for this role: ${allowedModules}.`;
  }
})();
