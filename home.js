const roleSwitcher = document.querySelector("#roleSwitcher");
const globalSearch = document.querySelector("#globalSearch");
const params = new URLSearchParams(window.location.search);
const activeUser = window.crmGetActiveUser();
let activeRole = window.crmNormalizeRole(params.get("role") || (activeUser && activeUser.role) || window.crmGetActiveRole());
let activeSearch = "";

const roleViews = {
  admin: {
    nav: ["home", "lookup", "leads", "offers", "fraud", "meetings", "pipeline", "profitability", "activity", "roles"],
    modules: ["opportunities", "fraud", "meetings", "access", "pipeline", "insights"],
    searchPlaceholder: "Search clients, leads, offers",
    snapshots: ["totalRelationship", "profitability", "plLeads", "blLeads"]
  },
  banker: {
    nav: ["home", "lookup", "leads", "fraud", "meetings", "pipeline", "profitability", "roles"],
    modules: ["opportunities", "fraud", "meetings", "access", "pipeline", "insights"],
    searchPlaceholder: "Search clients, meetings, opportunities",
    snapshots: ["totalRelationship", "profitability", "plLeads", "blLeads"]
  },
  wealth: {
    nav: ["home", "lookup", "offers", "fraud", "meetings", "pipeline", "profitability", "roles"],
    modules: ["opportunities", "fraud", "meetings", "access", "pipeline", "insights"],
    searchPlaceholder: "Search wealth clients and portfolios",
    snapshots: ["wealthClientCount", "investedAssets", "portfolioReviews", "averageFraudScore"]
  },
  fraud: {
    nav: ["home", "lookup", "fraud", "roles"],
    modules: ["fraud", "access", "pipeline", "insights"],
    searchPlaceholder: "Search fraud risk and segments",
    snapshots: ["highRisk", "fraudCases", "frontlineNotes", "averageFraudScore"]
  },
  loans: {
    nav: ["home", "lookup", "leads", "fraud", "meetings", "pipeline", "roles"],
    modules: ["opportunities", "meetings", "access", "pipeline", "insights"],
    searchPlaceholder: "Search lending leads and clients",
    snapshots: ["plLeads", "blLeads", "loanBalance", "refiReviews"]
  },
  marketing: {
    nav: ["home", "lookup", "offers", "pipeline", "roles"],
    modules: ["opportunities", "access", "pipeline", "insights"],
    searchPlaceholder: "Search campaigns and segments",
    snapshots: ["offerCount", "segmentCount", "plAudience", "blAudience"]
  },
  hr: {
    nav: ["home", "lookup", "roles"],
    modules: ["access", "pipeline"],
    searchPlaceholder: "Search employee readiness tasks",
    snapshots: ["roleCount", "hrTasks", "accessReviews", "restrictedData"]
  }
};

if (activeUser && activeUser.role) {
  activeRole = window.crmNormalizeRole(activeUser.role);
  roleSwitcher.disabled = true;
}

window.crmSetActiveRole(activeRole);
roleSwitcher.value = activeRole;

roleSwitcher.addEventListener("change", () => {
  activeRole = window.crmNormalizeRole(roleSwitcher.value);
  window.crmSetActiveRole(activeRole);
  renderHomeDashboard();
});

globalSearch.addEventListener("input", () => {
  activeSearch = globalSearch.value.trim().toLowerCase();
  renderHomeDashboard();
});

initHomeDashboard();

async function initHomeDashboard() {
  await window.crmApi.loadBootstrap();
  const sessionUser = window.crmGetActiveUser();

  if (sessionUser && sessionUser.role) {
    activeRole = window.crmNormalizeRole(sessionUser.role);
    window.crmSetActiveRole(activeRole);
    roleSwitcher.value = activeRole;
    roleSwitcher.disabled = true;
  }

  renderHomeDashboard();
}

function renderHomeDashboard() {
  const profile = window.crmRoleProfiles[activeRole];

  setText("#homeGreeting", `Welcome, ${profile.firstName}`);
  setText("#homeSubtitle", profile.dashboardFocus);
  setText("#activeUserName", profile.name);
  setText("#activeRoleName", `${profile.label} Access`);
  setText("#activeRoleDepartment", profile.department);
  setText("#activeRoleFocus", profile.primaryPurpose);
  globalSearch.placeholder = roleViews[activeRole].searchPlaceholder;

  applyRoleVisibility();
  renderSnapshots();
  renderPermissions(profile);
  renderLeadOffers();
  renderFraudWatch();
  renderMeetings();
  renderPipeline();
  renderInsights();
}

function applyRoleVisibility() {
  const view = roleViews[activeRole];

  document.querySelectorAll("[data-nav-module]").forEach((link) => {
    const isVisible = view.nav.includes(link.dataset.navModule)
      && (!window.crmCanAccessModule || window.crmCanAccessModule(link.dataset.navModule));
    link.classList.toggle("hidden", !isVisible);
    link.classList.toggle("nav-visible", isVisible);
    link.toggleAttribute("aria-hidden", !isVisible);

    if (isVisible) {
      link.removeAttribute("tabindex");
    } else {
      link.setAttribute("tabindex", "-1");
    }
  });

  document.querySelectorAll("[data-module]").forEach((panel) => {
    const isVisible = view.modules.includes(panel.dataset.module);
    panel.classList.toggle("hidden", !isVisible);
  });
}

function renderSnapshots() {
  const snapshotGrid = document.querySelector("#snapshotGrid");
  snapshotGrid.innerHTML = "";

  roleViews[activeRole].snapshots.forEach((metricKey) => {
    const metric = getSnapshotMetric(metricKey);
    const card = document.createElement("article");
    card.className = "snapshot-card";
    card.innerHTML = `
      <span>${metric.label}</span>
      <strong>${metric.value}</strong>
      <small>${metric.help}</small>
    `;
    snapshotGrid.appendChild(card);
  });
}

function getSnapshotMetric(metricKey) {
  const metrics = getDashboardMetrics();
  const visibleLeads = getVisibleLeads(activeRole);

  const values = {
    totalRelationship: {
      label: "Total Relationship",
      value: window.crmFormatCurrency(metrics.totalRelationship),
      help: "Personal and business value"
    },
    profitability: {
      label: "Account Profitability",
      value: window.crmFormatCurrency(metrics.annualContribution),
      help: "Estimated annual contribution"
    },
    plLeads: {
      label: "PL Leads",
      value: visibleLeads.filter((lead) => lead.type === "PL").length,
      help: "Personal loan opportunities"
    },
    blLeads: {
      label: "BL Leads",
      value: visibleLeads.filter((lead) => lead.type === "BL").length,
      help: "Business loan opportunities"
    },
    highRisk: {
      label: "High Risk Clients",
      value: metrics.highRiskCount,
      help: "Fraud score 60+"
    },
    wealthClientCount: {
      label: "Wealth Clients",
      value: metrics.wealthClientCount,
      help: "Affluency tier 3"
    },
    investedAssets: {
      label: "Invested Assets",
      value: window.crmFormatCurrency(metrics.investedAssets),
      help: "Prototype AUM"
    },
    portfolioReviews: {
      label: "Portfolio Reviews",
      value: "3",
      help: "Ready for outreach"
    },
    fraudCases: {
      label: "Fraud Cases",
      value: metrics.fraudCaseCount,
      help: "Historical fraud cases"
    },
    frontlineNotes: {
      label: "Frontline Notes",
      value: metrics.frontlineNoteCount,
      help: "Suspicious activity notes"
    },
    averageFraudScore: {
      label: "Average Score",
      value: `${metrics.averageFraudScore} / 100`,
      help: "Across test clients"
    },
    loanBalance: {
      label: "Loan Balance",
      value: window.crmFormatCurrency(metrics.loanBalance),
      help: "Active lending balance"
    },
    refiReviews: {
      label: "Refi Reviews",
      value: "3",
      help: "Prototype opportunities"
    },
    offerCount: {
      label: "Campaign Offers",
      value: window.crmOffers.filter((offer) => offer.visibleTo.includes("marketing")).length,
      help: "Campaign-ready offers"
    },
    segmentCount: {
      label: "Segments",
      value: window.crmMarketingSegments.length,
      help: "Aggregated groups"
    },
    plAudience: {
      label: "PL Audience",
      value: "3 clients",
      help: "Pre-screen group"
    },
    blAudience: {
      label: "BL Audience",
      value: "4 links",
      help: "Business relationship group"
    },
    roleCount: {
      label: "Test Users",
      value: Object.keys(window.crmRoleProfiles).length,
      help: "Active fake accounts"
    },
    hrTasks: {
      label: "Training Items",
      value: window.crmHrTasks.length,
      help: "Open readiness tasks"
    },
    accessReviews: {
      label: "Access Reviews",
      value: "2",
      help: "Pending role checks"
    },
    restrictedData: {
      label: "Customer Data",
      value: "Hidden",
      help: "Financial data blocked"
    }
  };

  return values[metricKey];
}

function renderPermissions(profile) {
  const permissionList = document.querySelector("#permissionList");
  permissionList.innerHTML = "";

  profile.permissions.forEach((permission) => {
    const item = document.createElement("li");
    item.textContent = permission;
    permissionList.appendChild(item);
  });
}

function renderLeadOffers() {
  const leadOfferList = document.querySelector("#leadOfferList");
  const leads = getVisibleLeads(activeRole).filter(matchesSearch);
  const offers = getVisibleOffers(activeRole).filter(matchesSearch);
  leadOfferList.innerHTML = "";
  setText("#visibleLeadCount", `${leads.length + offers.length} visible`);

  if (leads.length + offers.length === 0) {
    leadOfferList.appendChild(createEmptyState("No leads or offers are visible for this role."));
    return;
  }

  [...leads, ...offers].forEach((item) => {
    const customer = item.accountNumber ? window.crmFindCustomer("accountNumber", item.accountNumber) : null;
    const card = document.createElement("section");
    const amount = item.amount ? window.crmFormatCurrency(item.amount) : item.audience;
    const badge = item.type === "PL" ? "Personal Loan" : "Business Loan";
    const canOpen = customer && canOpenCustomerProfile(activeRole);

    card.className = `opportunity-card priority-${item.priority.toLowerCase()}`;
    card.innerHTML = `
      <div>
        <span>${badge}</span>
        <h3>${item.title}</h3>
        <p>${item.reason}</p>
      </div>
      <div class="opportunity-meta">
        <strong>${amount}</strong>
        <small>${item.status}</small>
        ${canOpen ? `<a href="${window.crmClientUrl(customer.accountNumber)}">View</a>` : "<small>Aggregated</small>"}
      </div>
    `;
    leadOfferList.appendChild(card);
  });
}

function renderFraudWatch() {
  const fraudWatchList = document.querySelector("#fraudWatchList");
  const highRiskCustomers = window.crmCustomers
    .filter((customer) => customer.fraudRiskScore >= 45)
    .filter(matchesSearch)
    .sort((a, b) => b.fraudRiskScore - a.fraudRiskScore);

  fraudWatchList.innerHTML = "";

  highRiskCustomers.slice(0, activeRole === "fraud" ? 5 : 3).forEach((customer) => {
    const item = document.createElement(canOpenFraudDetails(activeRole) ? "a" : "section");
    item.className = `watch-item risk-${customer.fraudRiskTier.toLowerCase()}`;

    if (canOpenFraudDetails(activeRole)) {
      item.href = `fraud.html?accountNumber=${encodeURIComponent(customer.accountNumber)}`;
    }

    item.innerHTML = `
      <span>${customer.name}</span>
      <strong>${customer.fraudRiskScore} / 100</strong>
      <small>${canOpenFraudDetails(activeRole) ? `${customer.fraudRiskTier} risk` : "High-level risk only"}</small>
    `;
    fraudWatchList.appendChild(item);
  });
}

function renderMeetings() {
  const meetingList = document.querySelector("#meetingList");
  const meetings = getVisibleMeetings(activeRole).filter(matchesSearch);
  meetingList.innerHTML = "";

  if (meetings.length === 0) {
    meetingList.appendChild(createEmptyState("No meetings are visible for this role."));
    return;
  }

  meetings.forEach((meeting) => {
    const customer = window.crmFindCustomer("accountNumber", meeting.accountNumber);
    const item = document.createElement("section");
    item.className = "meeting-item";
    item.innerHTML = `
      <div>
        <strong>${meeting.title}</strong>
        <span>${customer && canOpenCustomerProfile(activeRole) ? customer.name : meeting.client}</span>
      </div>
      <small>${meeting.date} | ${meeting.owner}</small>
    `;
    meetingList.appendChild(item);
  });
}

function renderPipeline() {
  const clientPipeline = document.querySelector("#clientPipeline");
  clientPipeline.innerHTML = "";

  if (activeRole === "hr") {
    setText("#pipelineTitle", "Employee Readiness");
    window.crmHrTasks.filter(matchesSearch).forEach((task) => {
      clientPipeline.appendChild(createRecord(task.title, `Owner: ${task.owner}`, task.status));
    });
    return;
  }

  if (activeRole === "marketing") {
    setText("#pipelineTitle", "Campaign Segments");
    window.crmMarketingSegments.filter(matchesSearch).forEach((segment) => {
      clientPipeline.appendChild(createRecord(segment.name, segment.signal, segment.audience));
    });
    return;
  }

  if (activeRole === "loans") {
    setText("#pipelineTitle", "Lending Pipeline");
    getVisibleLeads("loans").filter(matchesSearch).forEach((lead) => {
      clientPipeline.appendChild(createRecord(lead.title, lead.reason, `${lead.type} | ${window.crmFormatCurrency(lead.amount)}`, window.crmClientUrl(lead.accountNumber)));
    });
    return;
  }

  if (activeRole === "wealth") {
    setText("#pipelineTitle", "Wealth Portfolio");
    getWealthCustomers().filter(matchesSearch).forEach((customer) => {
      clientPipeline.appendChild(createRecord(customer.name, `${customer.wealthAdvisor} | Affluency tier ${customer.affluencyTier}`, window.crmFormatCurrency(customer.investedBalance), `wealth.html?accountNumber=${encodeURIComponent(customer.accountNumber)}`));
    });
    return;
  }

  setText("#pipelineTitle", activeRole === "fraud" ? "Fraud Watchlist" : "Client Pipeline");

  const customers = window.crmCustomers
    .slice()
    .filter(matchesSearch)
    .sort((a, b) => activeRole === "fraud" ? b.fraudRiskScore - a.fraudRiskScore : b.household - a.household)
    .slice(0, 5);

  customers.forEach((customer) => {
    const meta = activeRole === "fraud" ? `${customer.fraudRiskScore} / 100` : window.crmFormatCurrency(customer.household);
    const detail = activeRole === "fraud"
      ? `${customer.fraudRiskTier} risk | ${customer.fraudCases} cases | ${customer.frontlineNotes} notes`
      : `${customer.personalBanker} | ${customer.primaryBranch}`;
    const href = activeRole === "fraud"
      ? `fraud.html?accountNumber=${encodeURIComponent(customer.accountNumber)}`
      : window.crmClientUrl(customer.accountNumber);

    clientPipeline.appendChild(createRecord(customer.name, detail, meta, href));
  });
}

function renderInsights() {
  const profitabilityList = document.querySelector("#profitabilityList");
  profitabilityList.innerHTML = "";

  if (activeRole === "marketing") {
    setText("#insightTitle", "Product Usage Signals");
    window.crmMarketingSegments.filter(matchesSearch).forEach((segment) => {
      profitabilityList.appendChild(createRecord(segment.name, segment.signal, segment.audience));
    });
    return;
  }

  if (activeRole === "fraud") {
    setText("#insightTitle", "Fraud Score Inputs");
    window.crmCustomers
      .filter(matchesSearch)
      .sort((a, b) => b.fraudRiskScore - a.fraudRiskScore)
      .slice(0, 5)
      .forEach((customer) => {
        profitabilityList.appendChild(createRecord(customer.name, `${customer.fraudCases} cases | ${customer.frontlineNotes} frontline notes`, `${customer.fraudRiskScore} / 100`));
      });
    return;
  }

  if (activeRole === "loans") {
    setText("#insightTitle", "Lending Insights");
    getVisibleLeads("loans").filter(matchesSearch).forEach((lead) => {
      profitabilityList.appendChild(createRecord(lead.title, lead.status, window.crmFormatCurrency(lead.amount), window.crmClientUrl(lead.accountNumber)));
    });
    return;
  }

  if (activeRole === "wealth") {
    setText("#insightTitle", "Investment Portfolio Signals");
    getWealthCustomers().filter(matchesSearch).forEach((customer) => {
      profitabilityList.appendChild(createRecord(customer.name, `${customer.profitability.tier} profitability | ${customer.profitability.mainDriver}`, window.crmFormatCurrency(customer.investedBalance), `wealth.html?accountNumber=${encodeURIComponent(customer.accountNumber)}`));
    });
    return;
  }

  setText("#insightTitle", "Profitability by Account");
  renderProfitabilityRows();
}

function renderProfitabilityRows() {
  const profitabilityList = document.querySelector("#profitabilityList");
  const customers = window.crmCustomers
    .slice()
    .filter(matchesSearch)
    .sort((a, b) => b.profitability.annualContribution - a.profitability.annualContribution);

  if (customers.length === 0) {
    profitabilityList.appendChild(createEmptyState("No profitability records match this search."));
    return;
  }

  const maxContribution = Math.max(...customers.map((customer) => customer.profitability.annualContribution));

  customers.forEach((customer) => {
    const item = document.createElement("section");
    const percent = Math.max(8, Math.round((customer.profitability.annualContribution / maxContribution) * 100));
    item.className = "profitability-row";
    item.innerHTML = `
      <div class="profitability-label">
        <strong>${customer.name}</strong>
        <span>${customer.profitability.tier} | ${customer.profitability.mainDriver}</span>
      </div>
      <div class="profitability-track" aria-hidden="true">
        <i style="width: ${percent}%"></i>
      </div>
      <strong>${window.crmFormatCurrency(customer.profitability.annualContribution)}</strong>
    `;
    profitabilityList.appendChild(item);
  });
}

function createRecord(title, detail, meta, href) {
  const item = document.createElement(href ? "a" : "section");
  item.className = "pipeline-item";
  if (href) {
    item.href = href;
  }

  item.innerHTML = `
    <div>
      <strong>${title}</strong>
      <span>${detail}</span>
    </div>
    <div class="record-meta">
      <strong>${meta}</strong>
    </div>
  `;
  return item;
}

function getDashboardMetrics() {
  const businessRelationship = window.crmCustomers.reduce((total, customer) => {
    return total + customer.businessAccounts.reduce((businessTotal, account) => businessTotal + account.relationshipValue, 0);
  }, 0);
  const loanBalance = window.crmCustomers.reduce((total, customer) => {
    return total + customer.loans.reduce((loanTotal, loan) => loanTotal + loan.balance, 0);
  }, 0);
  const fraudScoreTotal = window.crmCustomers.reduce((total, customer) => total + customer.fraudRiskScore, 0);

  return {
    totalRelationship: window.crmCustomers.reduce((total, customer) => total + customer.household, 0) + businessRelationship,
    annualContribution: window.crmCustomers.reduce((total, customer) => total + customer.profitability.annualContribution, 0),
    highRiskCount: window.crmCustomers.filter((customer) => customer.fraudRiskScore >= 60).length,
    wealthClientCount: getWealthCustomers().length,
    investedAssets: window.crmCustomers.reduce((total, customer) => total + customer.investedBalance, 0),
    fraudCaseCount: window.crmCustomers.reduce((total, customer) => total + customer.fraudCases, 0),
    frontlineNoteCount: window.crmCustomers.reduce((total, customer) => total + customer.frontlineNotes, 0),
    averageFraudScore: Math.round(fraudScoreTotal / window.crmCustomers.length),
    loanBalance
  };
}

function getVisibleLeads(role) {
  if (role === "marketing") {
    return [];
  }

  if (role === "admin") {
    return window.crmLeads;
  }

  return window.crmLeads.filter((lead) => lead.visibleTo.includes(role));
}

function getVisibleOffers(role) {
  if (role === "admin") {
    return window.crmOffers;
  }

  if (role === "wealth") {
    return window.crmOffers;
  }

  if (!["marketing"].includes(role)) {
    return [];
  }

  return window.crmOffers.filter((offer) => offer.visibleTo.includes(role));
}

function getVisibleMeetings(role) {
  if (role === "admin") {
    return window.crmMeetings;
  }

  if (role === "wealth") {
    return window.crmMeetings.filter((meeting) => {
      const customer = window.crmFindCustomer("accountNumber", meeting.accountNumber);
      return window.crmIsWealthClient(customer);
    });
  }

  return window.crmMeetings.filter((meeting) => meeting.visibleTo.includes(role));
}

function canOpenCustomerProfile(role) {
  return window.crmHasAnyPermission
    ? window.crmHasAnyPermission(["search_customers", "search_wealth_customers", "search_loan_customers"])
    : ["admin", "banker", "loans", "wealth"].includes(role);
}

function canOpenFraudDetails(role) {
  return window.crmHasPermission ? window.crmHasPermission("view_fraud_detail") : ["admin", "fraud"].includes(role);
}

function matchesSearch(item) {
  if (!activeSearch) {
    return true;
  }

  return JSON.stringify(item).toLowerCase().includes(activeSearch);
}

function getWealthCustomers() {
  return window.crmCustomers
    .filter((customer) => window.crmIsWealthClient(customer))
    .sort((a, b) => b.investedBalance - a.investedBalance);
}

function createEmptyState(message) {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}
