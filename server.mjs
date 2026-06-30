import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import "./lendingRules.js";
import "./wealthRules.js";
import "./discoverRules.js";
import "./trainingDataGenerator.js";
import "./mlModelTrainer.js";
import "./mlPredictor.js";
import "./models/activeMlModels.js";
import "./fraudEngine.js";
import "./recommendationEngine.js";
import { classifyFraudNote, llmClassifierAvailable } from "./fraudLlmClassifier.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DB_PATH = (globalThis.process && globalThis.process.env && globalThis.process.env.DB_PATH)
  ? globalThis.process.env.DB_PATH
  : join(ROOT, "crm.sqlite");
const SCHEMA_PATH = join(ROOT, "schema.sql");
const SEED_PATH = join(ROOT, "seed.sql");
const PROCESS_ENV = globalThis.process && globalThis.process.env ? globalThis.process.env : {};
const PROCESS_ARGS = globalThis.process && globalThis.process.argv ? globalThis.process.argv : [];
const PORT = Number(PROCESS_ENV.PORT || 4173);
const HOST = PROCESS_ENV.HOST || "0.0.0.0";
const SHOULD_RESET = PROCESS_ARGS.includes("--reset-db");
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const { evaluateFraudRules } = globalThis.crmFraudEngine;
const { FRAUD_TEXT_RULES } = globalThis.crmFraudEngine;
const { evaluateRecommendations } = globalThis.crmRecommendationEngine;
const sessions = new Map();
const EDIT_PERMISSION_SEEDS = {
  admin: ["edit_leads", "edit_bank_notes", "edit_meetings", "edit_customers", "edit_offers", "edit_businesses", "edit_employees", "view_wealth_profile", "edit_wealth_profile", "manage_wealth_notes", "view_lending_profile", "edit_lending_profile", "manage_lending_notes", "manage_fraud_notes"],
  banker: ["edit_leads", "edit_bank_notes", "edit_meetings", "edit_customers", "edit_businesses", "view_lending_profile"],
  wealth: ["edit_bank_notes", "edit_meetings", "edit_customers", "view_wealth_profile", "edit_wealth_profile", "manage_wealth_notes"],
  loans: ["edit_leads", "edit_bank_notes", "edit_meetings", "edit_customers", "edit_businesses", "view_lending_profile", "edit_lending_profile", "manage_lending_notes"],
  fraud: ["manage_fraud_notes"],
  marketing: ["edit_offers"],
  hr: ["edit_employees"]
};
const DEMO_LOGIN_USERS = [
  { username: "Aung", firstName: "Aung", email: "admin.crm.demo@gmail.com", role: "admin" },
  { username: "Abby", firstName: "Abby", email: "admin.abby.crm.demo@gmail.com", role: "admin", passwordSourceEmail: "admin.crm.demo@gmail.com" },
  { username: "Lizzie", firstName: "Lizzie", email: "hr.crm.demo@gmail.com", role: "hr" },
  { username: "Sydney", firstName: "Sydney", email: "hr.sydney.crm.demo@gmail.com", role: "hr", passwordSourceEmail: "hr.crm.demo@gmail.com" },
  { username: "Nora Whitfield", firstName: "Nora", email: "banker.crm.demo@gmail.com", role: "banker" },
  { username: "Luke", firstName: "Luke", email: "wealth.crm.demo@gmail.com", role: "wealth" },
  { username: "Preston", firstName: "Preston", email: "fraud.crm.demo@gmail.com", role: "fraud" },
  { username: "Gavin", firstName: "Gavin", email: "loans.crm.demo@gmail.com", role: "loans" },
  { username: "Alex", firstName: "Alex", email: "marketing.crm.demo@gmail.com", role: "marketing" }
];
const DEMO_EMPLOYEE_RECORDS = [
  ["EMP-1000", "Aung", "admin.crm.demo@gmail.com", "Administration", "CRM Admin", "Corporate Office", "Board Oversight", "Full CRM administration", "Active", "06/01/2024", "Current", "Admin test account", ""],
  ["EMP-1001", "Lizzie", "hr.crm.demo@gmail.com", "Human Resources", "HR Business Partner", "Corporate Office", "Aung", "Employee records and access readiness", "Active", "08/14/2019", "Current", "No outside business relationship on file", ""],
  ["EMP-1003", "Preston", "fraud.crm.demo@gmail.com", "Fraud Team", "Fraud Analyst", "Operations Center", "Aung", "Fraud matrix and case investigation", "Active", "11/09/2020", "Fraud access recertification pending", "No outside business relationship on file", ""],
  ["EMP-1004", "Gavin", "loans.crm.demo@gmail.com", "Loans and Mortgage", "Loan Specialist", "Carmel", "Victor Hale", "Lending pipeline and loan review", "Active", "04/18/2021", "Lending role onboarding current", "Outside business account disclosed", "BUS-9005"],
  ["EMP-1005", "Alex", "marketing.crm.demo@gmail.com", "Marketing", "Campaign Manager", "Corporate Office", "Aung", "Aggregated campaign and segment data", "Active", "06/22/2022", "Privacy training scheduled", "No outside business relationship on file", ""],
  ["EMP-1006", "Luke", "wealth.crm.demo@gmail.com", "Wealth Management", "Wealth Advisor", "Indianapolis Downtown", "Aung", "Wealth client profile and investment portfolio", "Active", "09/12/2018", "Current", "No outside business relationship on file", ""],
  ["EMP-1008", "Sydney", "hr.sydney.crm.demo@gmail.com", "Human Resources", "HR Specialist", "Corporate Office", "Aung", "Employee records and access readiness", "Active", "03/11/2024", "Current", "HR test account", ""],
  ["EMP-1009", "Abby", "admin.abby.crm.demo@gmail.com", "Administration", "CRM Admin", "Corporate Office", "Board Oversight", "Full CRM administration", "Active", "06/01/2024", "Current", "Admin test account", ""]
];

initializeDatabase(SHOULD_RESET);

const db = new DatabaseSync(DB_PATH);
const AUTHENTICATED_ROLES = ["admin", "hr", "banker", "wealth", "fraud", "loans", "marketing"];
ensureEditPermissions();
ensureDepartmentTables();
ensureDemoLoginUsers();
ensureRegularCustomerExpansion();
ensureHouseholdWealthProfiles();
ensureLendingProfilesForLoanCustomers();

const ACCESS_PASSWORD = PROCESS_ENV.ACCESS_PASSWORD || "";
const ACCESS_USER = PROCESS_ENV.ACCESS_USER || "demo";

// Optional site-wide password gate (HTTP Basic Auth). Activates only when
// ACCESS_PASSWORD is set -- so local and static use are unaffected, but a
// public deploy can be locked behind a shared password. Covers both static
// files and the API. The browser shows a native login prompt.
function passesAccessGate(request, response) {
  if (!ACCESS_PASSWORD) {
    return true; // gate disabled
  }
  const header = request.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    let decoded = "";
    try {
      decoded = Buffer.from(encoded, "base64").toString("utf8");
    } catch (err) {
      decoded = "";
    }
    const sep = decoded.indexOf(":");
    const user = sep >= 0 ? decoded.slice(0, sep) : "";
    const pass = sep >= 0 ? decoded.slice(sep + 1) : "";
    if (user === ACCESS_USER && pass === ACCESS_PASSWORD) {
      return true;
    }
  }
  response.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="CRM prototype", charset="UTF-8"',
    "Content-Type": "text/plain"
  });
  response.end("Authentication required.");
  return false;
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (!passesAccessGate(request, response)) {
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    handleApi(request, requestUrl, response);
    return;
  }

  serveStaticFile(requestUrl, response);
});

server.listen(PORT, HOST, () => {
  const shownHost = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`CRM prototype running at http://${shownHost}:${PORT}`);
  console.log("SQLite database:", DB_PATH);
});

export { db, server };

function initializeDatabase(forceReset) {
  if (existsSync(DB_PATH) && !forceReset) {
    return;
  }

  const setupDb = new DatabaseSync(DB_PATH);
  setupDb.exec(readFileSync(SCHEMA_PATH, "utf8"));
  setupDb.exec(readFileSync(SEED_PATH, "utf8"));
  setupDb.close();
}

function ensureEditPermissions() {
  Object.entries(EDIT_PERMISSION_SEEDS).forEach(([role, permissions]) => {
    permissions.forEach((permission) => {
      const exists = db.prepare("SELECT 1 FROM role_permissions WHERE role = ? AND permission = ? LIMIT 1").get(role, permission);

      if (exists) {
        return;
      }

      const nextOrder = db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM role_permissions WHERE role = ?").get(role).next_order;
      db.prepare("INSERT INTO role_permissions (role, permission, sort_order) VALUES (?, ?, ?)").run(role, permission, nextOrder);
    });
  });
}

function ensureDemoLoginUsers() {
  DEMO_LOGIN_USERS.forEach((demoUser) => {
    db.prepare(`
      UPDATE role_test_users
      SET name = ?, first_name = ?, email = ?
      WHERE role = ?
    `).run(demoUser.username, demoUser.firstName, demoUser.email, demoUser.role);

    const passwordSource = db.prepare(`
      SELECT password_hash, password_salt
      FROM users
      WHERE lower(email) = lower(?)
      LIMIT 1
    `).get(demoUser.passwordSourceEmail || demoUser.email);

    if (!passwordSource) {
      return;
    }

    const existing = db.prepare("SELECT user_id FROM users WHERE lower(email) = lower(?) LIMIT 1").get(demoUser.email);

    if (existing) {
      db.prepare(`
        UPDATE users
        SET username = ?, role = ?, password_hash = ?, password_salt = ?, is_active = 1
        WHERE user_id = ?
      `).run(demoUser.username, demoUser.role, passwordSource.password_hash, passwordSource.password_salt, existing.user_id);
      return;
    }

    db.prepare(`
      INSERT INTO users (username, email, password_hash, password_salt, role, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(demoUser.username, demoUser.email, passwordSource.password_hash, passwordSource.password_salt, demoUser.role);
  });

  ensureDemoEmployeeRecords();
}

function ensureDemoEmployeeRecords() {
  DEMO_EMPLOYEE_RECORDS.forEach((employee) => {
    const existing = db.prepare("SELECT employee_id FROM employees WHERE employee_id = ? LIMIT 1").get(employee[0]);

    if (existing) {
      db.prepare(`
        UPDATE employees
        SET
          name = ?,
          email = ?,
          department = ?,
          employee_role = ?,
          branch = ?,
          manager = ?,
          access_level = ?,
          status = ?,
          hire_date = ?,
          training_status = ?,
          disclosures = ?,
          linked_business_id = ?
        WHERE employee_id = ?
      `).run(...employee.slice(1), employee[0]);
      return;
    }

    db.prepare(`
      INSERT INTO employees (employee_id, name, email, department, employee_role, branch, manager, access_level, status, hire_date, training_status, disclosures, linked_business_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...employee);
  });

  db.prepare("UPDATE business_records SET owner_name = ? WHERE business_id = ?").run("Gavin", "BUS-9005");
  db.prepare("UPDATE customers SET wealth_advisor = ? WHERE wealth_advisor = ?").run("Luke", "Avery Chen");
  db.prepare("UPDATE customer_notes SET author = ? WHERE author = ?").run("Luke", "Avery Chen");
  db.prepare("UPDATE wealth_interactions SET owner = ? WHERE owner = ?").run("Luke", "Avery Chen");
  db.prepare("UPDATE lending_contact_history SET owner = ? WHERE owner = ?").run("Gavin", "Taylor Brooks");
}

function ensureRegularCustomerExpansion() {
  const regularCustomers = [
    {
      core: ["10310422", "Ava Brooks", "000-12-1011", "CIF-3104220", "06/08/1989", "46220", "4 years", "1182 Keystone Ave, Indianapolis, IN 46220", "317-555-0122", "ava.brooks@example.com", "Broad Ripple", "Nora Whitfield", "Not assigned", 6420, 51820, 58240, 0, 1, 24, "Low", 0, 1, "05/18/2026"],
      profitability: ["Medium", 640, "Growing deposits and active digital banking", "New mortgage interest may create future lending conversation"],
      accounts: [
        ["Everyday Checking", "10310422", "Open", "08/14/2022", 6420],
        ["Statement Savings", "20310422", "Open", "08/14/2022", 51820]
      ],
      members: [
        ["Ava Brooks", "Primary", "Checking, Savings"]
      ],
      businessAccounts: [],
      fraudHistory: [
        ["Account Takeover", 0, 0],
        ["Card Fraud", 0, 0],
        ["Suspicious Login", 1, 7],
        ["Phishing Concern", 0, 0]
      ],
      fraudDrivers: ["Low fraud exposure", "One routine device verification"],
      discoverNeeds: [
        ["First Home Savings Review", "Medium", "Savings balance is growing and client has asked about home buying timelines.", "Ask about down payment target and home purchase window.", "Discovery needed"],
        ["High Yield Savings Education", "Low", "Client keeps most relationship value in savings.", "Review savings goals and liquidity needs.", "Optional discussion"]
      ],
      nextBestAction: ["Ask about first home goals", "Medium", "Deposit growth suggests a home purchase conversation may be useful.", "Nora Whitfield", "06/24/2026"],
      alerts: [
        ["First home savings signal", "Opportunity"],
        ["Routine device verification", "Service"]
      ],
      notes: [
        ["Nora Whitfield", "05/18/2026", "Client mentioned saving for a possible first home within two years."]
      ],
      loans: []
    },
    {
      core: ["10344891", "Carlos Vega", "000-12-1012", "CIF-3448910", "12/11/1982", "46227", "6 years", "4420 Madison Ave, Indianapolis, IN 46227", "317-555-0191", "carlos.vega@example.com", "Southport", "Maya Thompson", "Not assigned", 12890, 60600, 73490, 0, 1, 36, "Low", 0, 2, "05/19/2026"],
      profitability: ["Medium", 980, "Deposit relationship and small business service potential", "Business cash flow is seasonal"],
      accounts: [
        ["Everyday Checking", "10344891", "Open", "03/02/2020", 12890],
        ["Statement Savings", "20344891", "Open", "03/02/2020", 60600]
      ],
      members: [
        ["Carlos Vega", "Primary", "Checking, Savings, Business"]
      ],
      businessAccounts: [
        ["Vega Auto Detail", "Owner", "Business Checking", 22500]
      ],
      fraudHistory: [
        ["Account Takeover", 0, 0],
        ["Card Fraud", 1, 11],
        ["Suspicious Login", 1, 8],
        ["Phishing Concern", 0, 0]
      ],
      fraudDrivers: ["Card replacement completed", "Business deposits vary by season"],
      discoverNeeds: [
        ["Business Line of Credit", "Medium", "Small business relationship may need flexible cash flow support.", "Ask about seasonal inventory and receivables timing.", "Needs lending review"],
        ["Merchant Services", "Low", "Business checking relationship does not yet show payment processing products.", "Ask how customers pay for services today.", "Discovery needed"]
      ],
      nextBestAction: ["Review business cash flow needs", "Medium", "Business relationship may benefit from working capital and merchant services.", "Maya Thompson", "06/18/2026"],
      alerts: [
        ["Business owner relationship", "Business"],
        ["Line of credit opportunity", "Lending"]
      ],
      notes: [
        ["Maya Thompson", "05/19/2026", "Client asked about separating business expenses from personal checking."]
      ],
      loans: [
        ["Business Line", 15000, "Current", "Next due 06/26/2026"]
      ]
    },
    {
      core: ["10378215", "Hannah Ellis", "000-12-1013", "CIF-3782150", "04/23/1994", "46032", "2 years", "771 Oak Ridge Dr, Carmel, IN 46032", "317-555-0185", "hannah.ellis@example.com", "Carmel", "Caleb Martin", "Not assigned", 8420, 32800, 41220, 0, 1, 29, "Low", 0, 1, "05/17/2026"],
      profitability: ["Low", 410, "Starter relationship with credit card activity", "Help build savings and avoid revolving debt growth"],
      accounts: [
        ["Student-to-Everyday Checking", "10378215", "Open", "01/05/2024", 8420],
        ["Statement Savings", "20378215", "Open", "01/05/2024", 32800],
        ["Rewards Credit Card", "40378215", "Active", "02/15/2024", 1850]
      ],
      members: [
        ["Hannah Ellis", "Primary", "Checking, Savings, Credit Card"]
      ],
      businessAccounts: [],
      fraudHistory: [
        ["Account Takeover", 0, 0],
        ["Card Fraud", 0, 0],
        ["Suspicious Login", 1, 7],
        ["Phishing Concern", 1, 6]
      ],
      fraudDrivers: ["Newer digital user", "Phishing education completed"],
      discoverNeeds: [
        ["Credit Builder Review", "Medium", "Client has a newer credit card and may benefit from usage and autopay guidance.", "Discuss credit score goals and monthly payment habits.", "Ready for outreach"],
        ["Emergency Savings Plan", "Low", "Savings balance is healthy for a starter relationship but goals are not documented.", "Ask about target reserve and upcoming expenses.", "Discovery needed"]
      ],
      nextBestAction: ["Complete credit builder review", "Medium", "Client has a newer card and could benefit from proactive education.", "Caleb Martin", "06/27/2026"],
      alerts: [
        ["Newer card relationship", "Opportunity"],
        ["Phishing education completed", "Service"]
      ],
      notes: [
        ["Caleb Martin", "05/17/2026", "Client asked how credit utilization affects score."]
      ],
      loans: [
        ["Credit Card", 1850, "Active", "Minimum due 06/20/2026"]
      ]
    },
    {
      core: ["10402673", "Ben Carter", "000-12-1014", "CIF-4026730", "09/02/1979", "46038", "11 years", "305 Lantern Rd, Fishers, IN 46038", "317-555-0167", "ben.carter@example.com", "Fishers", "Nora Whitfield", "Not assigned", 17600, 78900, 96500, 0, 2, 41, "Medium", 0, 2, "05/25/2026"],
      profitability: ["Medium", 1320, "Deposit balances and mortgage relationship", "Near wealth threshold but remains regular banking under household policy"],
      accounts: [
        ["Premier Checking", "10402673", "Open", "06/12/2015", 17600],
        ["Money Market Savings", "20402673", "Open", "06/12/2015", 78900]
      ],
      members: [
        ["Ben Carter", "Primary", "Checking, Savings, Mortgage"],
        ["Mia Carter", "Spouse", "Joint Savings"]
      ],
      businessAccounts: [],
      fraudHistory: [
        ["Account Takeover", 0, 0],
        ["Card Fraud", 1, 12],
        ["Suspicious Login", 1, 9],
        ["Phishing Concern", 1, 8]
      ],
      fraudDrivers: ["Moderate digital risk", "Recent card dispute resolved"],
      discoverNeeds: [
        ["Mortgage Refinance Review", "Medium", "Mortgage relationship and stable deposit balances could support a rate review.", "Ask about current home plans and payment comfort.", "Needs lending review"],
        ["Savings Goal Review", "Low", "Household balance is close to the wealth threshold but no investment relationship is assigned.", "Document goals before any wealth referral.", "Discovery needed"]
      ],
      nextBestAction: ["Review mortgage and savings goals", "Medium", "Client is near the wealth threshold and has a mortgage relationship.", "Nora Whitfield", "06/19/2026"],
      alerts: [
        ["Near wealth threshold", "Opportunity"],
        ["Mortgage review available", "Lending"]
      ],
      notes: [
        ["Nora Whitfield", "05/25/2026", "Client asked whether extra monthly mortgage payments would help long term."]
      ],
      loans: [
        ["Mortgage", 124500, "Current", "Next due 07/01/2026"]
      ]
    },
    {
      core: ["10433908", "Nina Patel", "000-12-1015", "CIF-4339080", "01/30/1991", "46236", "3 years", "9902 Geist Pointe Dr, Indianapolis, IN 46236", "317-555-0138", "nina.patel@example.com", "Geist", "Maya Thompson", "Not assigned", 3860, 24700, 28560, 0, 1, 18, "Low", 0, 0, "05/13/2026"],
      profitability: ["Low", 360, "Digital-first checking and savings relationship", "Limited product depth"],
      accounts: [
        ["Everyday Checking", "10433908", "Open", "09/10/2023", 3860],
        ["Statement Savings", "20433908", "Open", "09/10/2023", 24700]
      ],
      members: [
        ["Nina Patel", "Primary", "Checking, Savings"]
      ],
      businessAccounts: [],
      fraudHistory: [
        ["Account Takeover", 0, 0],
        ["Card Fraud", 0, 0],
        ["Suspicious Login", 0, 0],
        ["Phishing Concern", 0, 0]
      ],
      fraudDrivers: ["No recent fraud indicators", "Low transaction exposure"],
      discoverNeeds: [
        ["Direct Deposit Review", "Low", "Client is digital-first and may benefit from deeper primary bank setup.", "Ask if paycheck or recurring deposits are connected.", "Optional discussion"],
        ["Savings Habit Builder", "Low", "Savings relationship is active but goals are undocumented.", "Offer automated savings setup if useful.", "Optional discussion"]
      ],
      nextBestAction: ["Ask about direct deposit setup", "Low", "Client may be using the bank as a secondary relationship.", "Maya Thompson", "06/29/2026"],
      alerts: [
        ["Digital-first relationship", "Service"],
        ["Low product depth", "Opportunity"]
      ],
      notes: [
        ["Contact Center", "05/13/2026", "Client asked about automated savings transfers."]
      ],
      loans: []
    }
  ];

  regularCustomers.forEach((customer) => {
    db.prepare(`
      INSERT OR IGNORE INTO customers (
        account_number, name, ssn, cif, dob, zip, relationship, address, phone, email,
        primary_branch, personal_banker, wealth_advisor, checking_balance, savings_balance,
        household_balance, invested_balance, affluency_tier, fraud_risk_score,
        fraud_risk_tier, fraud_cases, frontline_notes, last_reviewed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...customer.core);

    const accountNumber = customer.core[0];
    db.prepare(`
      INSERT OR IGNORE INTO customer_profitability (account_number, tier, annual_contribution, main_driver, watch_item)
      VALUES (?, ?, ?, ?, ?)
    `).run(accountNumber, ...customer.profitability);

    insertAccountRowsIfMissing("customer_accounts", accountNumber, `
      INSERT INTO customer_accounts (account_number, product_type, product_account, status, open_date, balance, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, customer.accounts);
    insertAccountRowsIfMissing("household_members", accountNumber, `
      INSERT INTO household_members (account_number, member_name, relationship, products, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `, customer.members);
    insertAccountRowsIfMissing("customer_business_accounts", accountNumber, `
      INSERT INTO customer_business_accounts (account_number, business_name, owner_role, products, relationship_value, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, customer.businessAccounts);
    insertAccountRowsIfMissing("fraud_history", accountNumber, `
      INSERT INTO fraud_history (account_number, fraud_type, event_count, impact, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `, customer.fraudHistory);
    insertAccountRowsIfMissing("fraud_drivers", accountNumber, `
      INSERT INTO fraud_drivers (account_number, driver, sort_order)
      VALUES (?, ?, ?)
    `, customer.fraudDrivers.map((driver) => [driver]));
    insertAccountRowsIfMissing("discover_needs", accountNumber, `
      INSERT INTO discover_needs (account_number, product, priority, reason, next_action, status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, customer.discoverNeeds);
    insertAccountRowsIfMissing("customer_alerts", accountNumber, `
      INSERT INTO customer_alerts (account_number, label, alert_type, sort_order)
      VALUES (?, ?, ?, ?)
    `, customer.alerts);
    insertAccountRowsIfMissing("customer_notes", accountNumber, `
      INSERT INTO customer_notes (account_number, author, note_date, note_text, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `, customer.notes);
    insertAccountRowsIfMissing("loans", accountNumber, `
      INSERT INTO loans (account_number, loan_type, balance, status, payment_status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, customer.loans);

    db.prepare(`
      INSERT OR IGNORE INTO next_best_actions (account_number, title, priority, reason, banker, due)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(accountNumber, ...customer.nextBestAction);
  });
}

function ensureHouseholdWealthProfiles() {
  const wealthCustomers = db.prepare("SELECT account_number FROM customers WHERE household_balance > 100000 ORDER BY account_number").all()
    .map((row) => getCustomerRecord(row.account_number))
    .filter(Boolean);

  wealthCustomers.forEach((customer) => {
    db.prepare(`
      INSERT OR IGNORE INTO wealth_profiles (
        account_number, risk_tolerance, liquidity_needs, time_horizon, tax_status,
        other_investments, investment_experience, investment_objectives,
        concentration_concerns, income_needs, last_meeting_date, last_call_date,
        next_meeting_date, follow_up
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customer.accountNumber,
      customer.investedBalance > 500000 ? "Balanced" : "Moderate",
      customer.savings > 100000 ? "Maintain strong cash reserve while reviewing investable excess." : "Maintain emergency reserve and document liquidity needs.",
      customer.investedBalance > 500000 ? "5 to 7 years" : "7 to 10 years",
      "Review with client and tax advisor during annual planning.",
      customer.investedBalance > 0 ? "Bank-managed or outside investment relationship noted." : "Outside investments not documented.",
      customer.affluencyTier >= 3 ? "Intermediate" : "Beginner",
      customer.discoverNeeds.find((need) => /wealth|investment|cd|income/i.test(need.product))?.reason || "Document goals, risk comfort, liquidity needs, and time horizon.",
      customer.savings > customer.investedBalance ? "High deposit concentration; consider gradual diversification." : "Review portfolio concentration at next meeting.",
      customer.relationship.includes("20") || customer.relationship.includes("29") ? "Income planning should be reviewed annually." : "No immediate income draw documented.",
      customer.notes[0]?.date || "Not documented",
      customer.lastReviewed || "Not documented",
      customer.nextBestAction?.due || "Needs scheduling",
      customer.nextBestAction?.reason || "Schedule next wealth planning touchpoint."
    );

    if (db.prepare("SELECT COUNT(*) AS total FROM wealth_accounts WHERE account_number = ?").get(customer.accountNumber).total === 0) {
      const wealthAccounts = customer.accounts.map((account) => [
        account.type.includes("CD") ? "SIS" : "Retail",
        account.type,
        account.account,
        account.balance,
        account.status
      ]);

      if (customer.investedBalance > 0) {
        wealthAccounts.push(["STAR Full Picture", "Investment Portfolio", `STAR-${customer.accountNumber.slice(-5)}`, customer.investedBalance, "Active"]);
      }

      wealthAccounts.forEach((account, index) => {
        db.prepare(`
          INSERT INTO wealth_accounts (account_number, account_group, account_name, account_id, balance, status, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(customer.accountNumber, ...account, index + 1);
      });
    }

    if (db.prepare("SELECT COUNT(*) AS total FROM wealth_life_events WHERE account_number = ?").get(customer.accountNumber).total === 0) {
      [
        ["Annual wealth review", customer.nextBestAction?.due || "06/30/2026", "1 month prior", customer.nextBestAction?.reason || "Prepare annual wealth review."],
        ["Life event check-in", "Next client meeting", "1 month prior", "Ask about retirement, income, home, family, and business changes."]
      ].forEach((event, index) => {
        db.prepare(`
          INSERT INTO wealth_life_events (account_number, event_title, event_date, alert_date, note_text, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(customer.accountNumber, ...event, index + 1);
      });
    }

    if (db.prepare("SELECT COUNT(*) AS total FROM wealth_interactions WHERE account_number = ?").get(customer.accountNumber).total === 0) {
      const interactions = (customer.notes || []).slice(0, 2).map((note, index) => [
        index === 0 ? "Meeting" : "Call",
        note.date,
        note.author,
        note.text,
        0
      ]);

      if (interactions.length === 0) {
        interactions.push(["Meeting", customer.lastReviewed || "Not documented", customer.wealthAdvisor || "Wealth Team", "Initial wealth profile review needed.", 0]);
      }

      interactions.forEach((interaction, index) => {
        db.prepare(`
          INSERT INTO wealth_interactions (account_number, interaction_type, interaction_date, owner, note_text, is_user_created, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(customer.accountNumber, ...interaction, index + 1);
      });
    }
  });
}

function ensureLendingProfilesForLoanCustomers() {
  const lendingCustomers = db.prepare("SELECT DISTINCT account_number FROM loans ORDER BY account_number").all()
    .map((row) => getCustomerRecord(row.account_number))
    .filter(Boolean);

  lendingCustomers.forEach((customer, profileIndex) => {
    const totalLoans = getLoanBalance(customer);
    const hasMortgage = customer.loans.some((loan) => /mortgage|home|heloc/i.test(loan.type));
    const hasCard = customer.loans.some((loan) => /card/i.test(loan.type));
    const monthlyPayment = Math.max(90, Math.round(totalLoans * 0.008));

    db.prepare(`
      INSERT OR IGNORE INTO lending_profiles (
        account_number, loan_status, interest_rate, monthly_payment, yearly_payment,
        monthly_income, pmi_status, pmi_recommendation, home_equity, heloc_status,
        bill_amount_owed, past_due_amount, maturity_date, closing_status,
        split_payment_structure, credit_score, available_loan_products
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customer.accountNumber,
      customer.loans.some((loan) => loan.status === "Current") ? "Active" : customer.loans[0]?.status || "Review",
      hasCard ? "18.99%" : "7.25%",
      monthlyPayment,
      monthlyPayment * 12,
      Math.max(4200, Math.round(customer.household / 42)),
      hasMortgage ? "Review required" : "Not applicable",
      hasMortgage ? "Review PMI eligibility with current home value and loan-to-value." : "No PMI required for this lending product.",
      hasMortgage ? Math.max(35000, Math.round(customer.household * 0.22)) : 0,
      hasMortgage ? "Potential HELOC conversation available" : "Not currently eligible based on profile data",
      totalLoans,
      customer.fraudRiskScore > 65 ? 240 : 0,
      "Review in lending system",
      "Closed",
      customer.loans.length > 1 ? "Multiple monthly payments; consolidation review available." : "Standard monthly payment.",
      Math.max(620, 780 - customer.fraudRiskScore),
      customer.discoverNeeds.filter((need) => /loan|mortgage|equity|heloc|credit/i.test(need.product)).map((need) => need.product).join(", ") || "Personal loan review, credit review"
    );

    if (db.prepare("SELECT COUNT(*) AS total FROM lending_documents WHERE account_number = ?").get(customer.accountNumber).total === 0) {
      [
        ["W2 / income verification", profileIndex % 3 === 0 ? "Needs refresh" : "On file", "05/20/2026"],
        ["Paystubs", "On file", "05/27/2026"],
        ["Employment verification", profileIndex % 2 === 0 ? "Verified" : "Pending lender review", "05/28/2026"],
        ["Credit score tracking", "Updated", "06/01/2026"]
      ].forEach((document, documentIndex) => {
        db.prepare(`
          INSERT INTO lending_documents (account_number, document_name, document_status, last_updated, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `).run(customer.accountNumber, ...document, documentIndex + 1);
      });
    }

    if (db.prepare("SELECT COUNT(*) AS total FROM lending_contact_history WHERE account_number = ?").get(customer.accountNumber).total === 0) {
      const contacts = (customer.notes || []).slice(0, 2).map((note, index) => [
        index % 2 === 0 ? "Phone" : "Email",
        note.date,
        index % 2 === 0 ? customer.phone : customer.email,
        "Gavin",
        note.text,
        0
      ]);

      if (contacts.length === 0) {
        contacts.push(["Phone", customer.lastReviewed || "Not documented", customer.phone, "Gavin", "Initial lending contact review needed.", 0]);
      }

      contacts.forEach((contact, contactIndex) => {
        db.prepare(`
          INSERT INTO lending_contact_history (account_number, contact_type, contact_date, contact_value, owner, note_text, is_user_created, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(customer.accountNumber, ...contact, contactIndex + 1);
      });
    }
  });
}

function insertAccountRowsIfMissing(tableName, accountNumber, sql, rows) {
  const safeTables = new Set([
    "customer_accounts",
    "household_members",
    "customer_business_accounts",
    "fraud_history",
    "fraud_drivers",
    "discover_needs",
    "customer_alerts",
    "customer_notes",
    "loans"
  ]);

  if (!safeTables.has(tableName) || rows.length === 0) {
    return;
  }

  const rowCount = db.prepare(`SELECT COUNT(*) AS total FROM ${tableName} WHERE account_number = ?`).get(accountNumber).total;

  if (rowCount > 0) {
    return;
  }

  rows.forEach((row, index) => {
    db.prepare(sql).run(accountNumber, ...row, index + 1);
  });
}

function ensureDepartmentTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wealth_profiles (
      account_number TEXT PRIMARY KEY REFERENCES customers(account_number) ON DELETE CASCADE,
      risk_tolerance TEXT NOT NULL,
      liquidity_needs TEXT NOT NULL,
      time_horizon TEXT NOT NULL,
      tax_status TEXT NOT NULL,
      other_investments TEXT NOT NULL,
      investment_experience TEXT NOT NULL,
      investment_objectives TEXT NOT NULL,
      concentration_concerns TEXT NOT NULL,
      income_needs TEXT NOT NULL,
      last_meeting_date TEXT NOT NULL,
      last_call_date TEXT NOT NULL,
      next_meeting_date TEXT NOT NULL,
      follow_up TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fraud_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
      author TEXT NOT NULL,
      note_date TEXT NOT NULL,
      note_text TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wealth_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
      account_group TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_id TEXT NOT NULL,
      balance INTEGER NOT NULL,
      status TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wealth_life_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
      event_title TEXT NOT NULL,
      event_date TEXT NOT NULL,
      alert_date TEXT NOT NULL,
      note_text TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wealth_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
      interaction_type TEXT NOT NULL,
      interaction_date TEXT NOT NULL,
      owner TEXT NOT NULL,
      note_text TEXT NOT NULL,
      is_user_created INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lending_profiles (
      account_number TEXT PRIMARY KEY REFERENCES customers(account_number) ON DELETE CASCADE,
      loan_status TEXT NOT NULL,
      interest_rate TEXT NOT NULL,
      monthly_payment INTEGER NOT NULL,
      yearly_payment INTEGER NOT NULL,
      monthly_income INTEGER NOT NULL,
      pmi_status TEXT NOT NULL,
      pmi_recommendation TEXT NOT NULL,
      home_equity INTEGER NOT NULL,
      heloc_status TEXT NOT NULL,
      bill_amount_owed INTEGER NOT NULL,
      past_due_amount INTEGER NOT NULL,
      maturity_date TEXT NOT NULL,
      closing_status TEXT NOT NULL,
      split_payment_structure TEXT NOT NULL,
      credit_score INTEGER NOT NULL,
      available_loan_products TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lending_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
      document_name TEXT NOT NULL,
      document_status TEXT NOT NULL,
      last_updated TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lending_contact_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
      contact_type TEXT NOT NULL,
      contact_date TEXT NOT NULL,
      contact_value TEXT NOT NULL,
      owner TEXT NOT NULL,
      note_text TEXT NOT NULL,
      is_user_created INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL
    );
  `);

  seedWealthDepartmentData();
  seedLendingDepartmentData();
}

function seedWealthDepartmentData() {
  const profiles = [
    {
      accountNumber: "10024588",
      riskTolerance: "Moderate",
      liquidityNeeds: "Maintain 9 months of expenses and a CD ladder for planned home updates.",
      timeHorizon: "7 to 10 years",
      taxStatus: "Joint filer, tax-sensitive income planning",
      otherInvestments: "Employer retirement plan and a small outside brokerage account",
      experience: "Intermediate",
      objectives: "Conservative growth, capital preservation, and retirement income planning",
      concentration: "High cash and CD concentration; review diversification gradually.",
      incomeNeeds: "No immediate income draw, future retirement income planning",
      lastMeeting: "05/29/2026",
      lastCall: "05/21/2026",
      nextMeeting: "06/28/2026",
      followUp: "Prepare conservative model portfolio and beneficiary/titling checklist."
    },
    {
      accountNumber: "10058217",
      riskTolerance: "Moderate growth",
      liquidityNeeds: "Needs flexible liquidity for properties and tax payments.",
      timeHorizon: "10+ years",
      taxStatus: "Pass-through business income; coordinate with CPA",
      otherInvestments: "Rental property equity and outside IRA",
      experience: "Experienced",
      objectives: "Diversification, business-owner liquidity, and retirement planning",
      concentration: "Real estate concentration from Collins Properties LLC.",
      incomeNeeds: "Occasional income needs for property expenses",
      lastMeeting: "05/15/2026",
      lastCall: "05/09/2026",
      nextMeeting: "06/15/2026",
      followUp: "Review HELOC timing with lending and map investable cash reserve."
    },
    {
      accountNumber: "10090866",
      riskTolerance: "Balanced",
      liquidityNeeds: "Preserve high cash reserve while laddering maturities.",
      timeHorizon: "5 to 7 years",
      taxStatus: "Retirement income and estate review needed",
      otherInvestments: "Outside 401(k), brokerage, and insurance policy",
      experience: "Advanced",
      objectives: "Income, estate preparation, and principal protection",
      concentration: "Large CD and savings concentration; beneficiary review recommended.",
      incomeNeeds: "Quarterly income review",
      lastMeeting: "05/07/2026",
      lastCall: "05/24/2026",
      nextMeeting: "06/24/2026",
      followUp: "Schedule annual wealth review and confirm beneficiary documents."
    },
    {
      accountNumber: "10144520",
      riskTolerance: "Growth",
      liquidityNeeds: "Maintain business and household liquidity for construction cycles.",
      timeHorizon: "10+ years",
      taxStatus: "Business owner with seasonal income",
      otherInvestments: "Business equity and SEP IRA",
      experience: "Intermediate",
      objectives: "Grow investable assets and separate business/personal reserves",
      concentration: "Business ownership concentration; review risk spread.",
      incomeNeeds: "No income draw; focus on growth and tax efficiency",
      lastMeeting: "05/30/2026",
      lastCall: "05/22/2026",
      nextMeeting: "06/30/2026",
      followUp: "Set joint treasury, wealth, and banker conversation."
    }
  ];

  profiles.forEach((profile) => {
    db.prepare(`
      INSERT OR IGNORE INTO wealth_profiles (
        account_number, risk_tolerance, liquidity_needs, time_horizon, tax_status,
        other_investments, investment_experience, investment_objectives,
        concentration_concerns, income_needs, last_meeting_date, last_call_date,
        next_meeting_date, follow_up
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      profile.accountNumber,
      profile.riskTolerance,
      profile.liquidityNeeds,
      profile.timeHorizon,
      profile.taxStatus,
      profile.otherInvestments,
      profile.experience,
      profile.objectives,
      profile.concentration,
      profile.incomeNeeds,
      profile.lastMeeting,
      profile.lastCall,
      profile.nextMeeting,
      profile.followUp
    );
  });

  if (db.prepare("SELECT COUNT(*) AS total FROM wealth_accounts").get().total === 0) {
    [
      ["10024588", "Retail", "Premier Checking", "10024588", 24780, "Open"],
      ["10024588", "STAR Full Picture", "Managed Advisory", "STAR-24588", 236520, "Active"],
      ["10024588", "SIS", "12 Month CD", "SIS-24588", 63240, "Matures 09/2026"],
      ["10058217", "Retail", "High Yield Savings", "20058217", 156900, "Open"],
      ["10058217", "STAR Full Picture", "Model Portfolio", "STAR-58217", 188480, "Active"],
      ["10058217", "SIS", "36 Month CD", "SIS-58217", 94000, "Matures 12/2027"],
      ["10090866", "Retail", "Private Client Checking", "10090866", 44210, "Open"],
      ["10090866", "STAR Full Picture", "Private Client Portfolio", "STAR-90866", 984220, "Active"],
      ["10090866", "SIS", "Brokered CD", "SIS-90866", 263820, "Matures 03/2027"],
      ["10144520", "Retail", "Premier Business Owner Checking", "10144520", 36100, "Open"],
      ["10144520", "STAR Full Picture", "Business Owner Portfolio", "STAR-44520", 142300, "Active"],
      ["10144520", "SIS", "Treasury Reserve", "SIS-44520", 78500, "Active"]
    ].forEach((account, index) => {
      db.prepare(`
        INSERT INTO wealth_accounts (account_number, account_group, account_name, account_id, balance, status, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(...account, index + 1);
    });
  }

  if (db.prepare("SELECT COUNT(*) AS total FROM wealth_life_events").get().total === 0) {
    [
      ["10024588", "Home renovation planning", "07/28/2026", "06/28/2026", "Ask about cash needs before shifting more into investments."],
      ["10024588", "Jordan Parker retirement review", "09/18/2026", "08/18/2026", "Review spouse retirement timing and beneficiary updates."],
      ["10058217", "Property tax reserve", "07/15/2026", "06/15/2026", "Confirm liquidity for rental property tax payment."],
      ["10058217", "HELOC renewal window", "08/12/2026", "07/12/2026", "Coordinate with lending one month before HELOC review."],
      ["10090866", "CD maturity strategy", "03/02/2027", "02/02/2027", "Prepare reinvestment and income strategy options."],
      ["10090866", "Annual estate review", "07/24/2026", "06/24/2026", "Collect beneficiary and titling questions before meeting."],
      ["10144520", "Construction season cash review", "07/30/2026", "06/30/2026", "Discuss reserves before peak project disbursements."],
      ["10144520", "SEP IRA funding check-in", "09/01/2026", "08/01/2026", "Coordinate tax-aware contribution planning."]
    ].forEach((event, index) => {
      db.prepare(`
        INSERT INTO wealth_life_events (account_number, event_title, event_date, alert_date, note_text, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(...event, index + 1);
    });
  }

  if (db.prepare("SELECT COUNT(*) AS total FROM wealth_interactions").get().total === 0) {
    [
      ["10024588", "Meeting", "05/29/2026", "Luke", "Discussed conservative investment options and CD maturity timing.", 0],
      ["10024588", "Call", "05/21/2026", "Nora Whitfield", "Client asked for a simple explanation of managed portfolios.", 0],
      ["10058217", "Meeting", "05/15/2026", "Victor Hale", "Reviewed liquidity preference and business-owner risk concentration.", 0],
      ["10058217", "Call", "05/09/2026", "Iris Bennett", "Confirmed preference for in-branch planning conversation.", 0],
      ["10090866", "Meeting", "05/07/2026", "Leah Sullivan", "Reviewed CD reinvestment timing and quarterly income comfort.", 0],
      ["10090866", "Call", "05/24/2026", "Leah Sullivan", "Left message to schedule annual beneficiary review.", 0],
      ["10144520", "Meeting", "05/30/2026", "Luke", "Discussed separating business reserves from investable household funds.", 0],
      ["10144520", "Call", "05/22/2026", "Nora Whitfield", "Client is open to a joint treasury and wealth meeting.", 0]
    ].forEach((interaction, index) => {
      db.prepare(`
        INSERT INTO wealth_interactions (account_number, interaction_type, interaction_date, owner, note_text, is_user_created, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(...interaction, index + 1);
    });
  }
}

function seedLendingDepartmentData() {
  const profiles = [
    ["10024588", "Active mortgage", "6.10%", 2140, 25680, 11800, "Not required", "PMI not required based on equity position.", 126000, "Eligible for HELOC review", 221400, 0, "04/12/2043", "Closed", "Single monthly mortgage payment", 742, "HELOC, mortgage refinance, home equity review"],
    ["10031942", "Active personal loan", "8.40%", 315, 3780, 6200, "Not applicable", "No PMI; consumer loan review only.", 0, "Not eligible until mortgage data is available", 9800, 0, "01/15/2029", "Closed", "Standard monthly payment", 698, "Personal loan refinance, debt consolidation"],
    ["10058217", "Active HELOC", "7.35%", 410, 4920, 14600, "Not required", "PMI not applicable; review draw period and property value.", 184000, "Existing HELOC; review limit and renewal timing", 43600, 0, "08/12/2031", "Closed", "Interest-only draw period", 768, "HELOC renewal, business line of credit"],
    ["10077403", "Active credit card", "18.99%", 92, 1104, 5400, "Not applicable", "No PMI; starter lending education recommended.", 0, "Future home equity after mortgage application", 2140, 0, "10/09/2028", "Open revolving", "Minimum due monthly; encourage autopay", 704, "Starter credit education, future mortgage prequalification"],
    ["10112679", "Active mortgage and personal loan", "6.75%", 1880, 22560, 7800, "PMI active", "Review PMI removal once loan-to-value is under 80%.", 69000, "Potential HELOC after fraud-safe review", 188600, 240, "11/02/2041", "Closed", "Mortgage plus personal loan; review debt consolidation", 662, "Debt consolidation, PMI removal review, refinance review"],
    ["10144520", "Active business loan", "7.90%", 2680, 32160, 18500, "Not applicable", "Business lending; no PMI.", 98000, "Eligible for owner-occupied collateral discussion", 168000, 0, "02/20/2036", "Closed", "Business loan with seasonal principal curtailments", 731, "Business line of credit, equipment finance, treasury services"],
    ["10188764", "Active equipment loan", "8.15%", 1240, 14880, 9300, "Not applicable", "Equipment loan; no PMI.", 42000, "HELOC not in scope for business equipment loan", 48600, 0, "06/16/2030", "Closed", "Monthly equipment payment; split pay available", 709, "Equipment refinance, business line of credit"],
    ["10277455", "Active seasonal business note", "8.75%", 980, 11760, 7200, "Not applicable", "Business seasonal note; no PMI.", 36000, "Potential farm/property HELOC review", 38000, 0, "09/30/2028", "Closed", "Seasonal split payment after peak inventory", 688, "Seasonal line review, equipment finance"]
  ];

  profiles.forEach((profile) => {
    db.prepare(`
      INSERT OR IGNORE INTO lending_profiles (
        account_number, loan_status, interest_rate, monthly_payment, yearly_payment,
        monthly_income, pmi_status, pmi_recommendation, home_equity, heloc_status,
        bill_amount_owed, past_due_amount, maturity_date, closing_status,
        split_payment_structure, credit_score, available_loan_products
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...profile);
  });

  if (db.prepare("SELECT COUNT(*) AS total FROM lending_documents").get().total === 0) {
    profiles.forEach(([accountNumber], profileIndex) => {
      [
        ["W2 / income verification", profileIndex % 3 === 0 ? "Needs refresh" : "On file", "05/20/2026"],
        ["Paystubs", "On file", "05/27/2026"],
        ["Employment verification", profileIndex % 2 === 0 ? "Verified" : "Pending lender review", "05/28/2026"],
        ["Credit score tracking", "Updated", "06/01/2026"]
      ].forEach((document, documentIndex) => {
        db.prepare(`
          INSERT INTO lending_documents (account_number, document_name, document_status, last_updated, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `).run(accountNumber, ...document, (profileIndex * 10) + documentIndex + 1);
      });
    });
  }

  if (db.prepare("SELECT COUNT(*) AS total FROM lending_contact_history").get().total === 0) {
    [
      ["10024588", "Phone", "05/30/2026", "317-555-0188", "Gavin", "Reviewed home equity conversation timing and monthly payment comfort.", 0],
      ["10024588", "Email", "05/31/2026", "elise.parker@example.com", "Gavin", "Sent document checklist for optional HELOC review.", 0],
      ["10031942", "Phone", "05/21/2026", "317-555-0142", "Caleb Martin", "Client asked about lowering personal loan payment.", 0],
      ["10031942", "Email", "05/22/2026", "marcus.reed@example.com", "Gavin", "Requested updated income estimate for refinance review.", 0],
      ["10058217", "Phone", "05/16/2026", "317-555-0103", "Gavin", "Discussed HELOC renewal and property cash reserve.", 0],
      ["10112679", "Phone", "05/26/2026", "317-555-0126", "Sophia Ramirez", "Explained PMI review and past due catch-up options.", 0],
      ["10144520", "Email", "05/30/2026", "grace.bennett@example.com", "Gavin", "Shared business line of credit preparation checklist.", 0],
      ["10188764", "Phone", "05/29/2026", "317-555-0186", "Caleb Martin", "Reviewed equipment refinance interest rate and maturity date.", 0],
      ["10277455", "Email", "05/28/2026", "robert.hayes@example.com", "Gavin", "Outlined seasonal split payment option before inventory build.", 0]
    ].forEach((contact, index) => {
      db.prepare(`
        INSERT INTO lending_contact_history (account_number, contact_type, contact_date, contact_value, owner, note_text, is_user_created, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(...contact, index + 1);
    });
  }
}

async function handleApi(request, requestUrl, response) {
  try {
    if (requestUrl.pathname === "/api/status") {
      sendJson(response, {
        source: "sqlite",
        database: "crm.sqlite"
      });
      return;
    }

    const session = getSessionFromRequest(request);

    if (!session) {
      sendAuthRequired(response);
      return;
    }

    const role = session.user.role;

    if (requestUrl.pathname === "/api/auth/me") {
      sendJson(response, {
        source: "sqlite",
        user: session.user,
        permissions: session.permissions
      });
      return;
    }

    const fraudAnalysisMatch = requestUrl.pathname.match(/^\/api\/fraud-analysis\/([^/]+)$/);

    if (fraudAnalysisMatch) {
      if (request.method !== "GET") {
        sendJson(response, { error: "Use GET to open fraud analysis." }, 405);
        return;
      }

      if (!hasAnyPermission(session, ["view_fraud_summary", "view_fraud_detail"])) {
        sendRestricted(response, role, "fraud analysis");
        return;
      }

      const accountNumber = decodeURIComponent(fraudAnalysisMatch[1]);
      const customer = findCustomer("accountNumber", accountNumber);

      if (!customer || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this fraud analysis");
        return;
      }

      const llmMatches = await classifyCustomerFraudNotes(customer);
      const analysis = evaluateFraudRules(customer, llmMatches.length ? { llmMatches } : undefined);

      sendJson(response, {
        source: "sqlite",
        role,
        customer: {
          accountNumber: customer.accountNumber,
          name: customer.name
        },
        record: sanitizeFraudAnalysisForRole(analysis, role)
      });
      return;
    }

    const recommendationMatch = requestUrl.pathname.match(/^\/api\/recommendations\/([^/]+)$/);

    if (recommendationMatch) {
      if (request.method !== "GET") {
        sendJson(response, { error: "Use GET to open recommendations." }, 405);
        return;
      }

      if (!canViewRecommendations(session)) {
        sendRestricted(response, role, "product recommendations");
        return;
      }

      const accountNumber = decodeURIComponent(recommendationMatch[1]);
      const customer = findCustomer("accountNumber", accountNumber);

      if (!customer || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this recommendation record");
        return;
      }

      const analysis = evaluateRecommendations(customer, getRecommendationContext(accountNumber));

      sendJson(response, {
        source: "sqlite",
        role,
        record: filterRecommendationAnalysisForRole(analysis, role)
      });
      return;
    }

    if (requestUrl.pathname === "/api/bootstrap") {
      if (!requirePermission(response, session, "view_dashboard", "dashboard data")) {
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        user: session.user,
        permissions: session.permissions,
        customers: getCustomersForRole(role),
        employees: getEmployeesForRole(role),
        businessRecords: getBusinessRecordsForRole(role),
        leads: getLeadsForRole(role),
        offers: getOffersForRole(role),
        meetings: getMeetingsForRole(role)
      });
      return;
    }

    if (requestUrl.pathname === "/api/customers") {
      if (request.method !== "GET") {
        sendJson(response, { error: "Use GET to list customers." }, 405);
        return;
      }

      if (!canAccessCustomer(session)) {
        sendRestricted(response, role, "customer records");
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        ...getPagedCustomersForAuth(session, requestUrl)
      });
      return;
    }

    if (requestUrl.pathname === "/api/businesses") {
      if (request.method !== "GET") {
        sendJson(response, { error: "Use GET to list businesses." }, 405);
        return;
      }

      if (!canSearchBusiness(session)) {
        sendRestricted(response, role, "business records");
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        ...getPagedBusinessRecordsForAuth(session, requestUrl)
      });
      return;
    }

    if (requestUrl.pathname === "/api/leads") {
      if (request.method !== "GET") {
        sendJson(response, { error: "Use GET to list leads." }, 405);
        return;
      }

      if (!requirePermission(response, session, "view_leads", "lead records")) {
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        ...getPagedLeadsForAuth(session, requestUrl)
      });
      return;
    }

    if (requestUrl.pathname === "/api/offers") {
      if (request.method !== "GET") {
        sendJson(response, { error: "Use GET to list offers." }, 405);
        return;
      }

      if (!requirePermission(response, session, "view_offers", "offer records")) {
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        ...getPagedOffersForAuth(session, requestUrl)
      });
      return;
    }

    if (requestUrl.pathname === "/api/meetings") {
      if (request.method !== "GET") {
        sendJson(response, { error: "Use GET to list meetings." }, 405);
        return;
      }

      if (!requirePermission(response, session, "view_meetings", "meeting records")) {
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        ...getPagedMeetingsForAuth(session, requestUrl)
      });
      return;
    }

    if (requestUrl.pathname === "/api/wealth/profile") {
      if (request.method !== "GET") {
        sendJson(response, { error: "Use GET to open wealth profiles." }, 405);
        return;
      }

      if (!canViewWealthProfile(session)) {
        sendRestricted(response, role, "wealth profile");
        return;
      }

      const accountNumber = requestUrl.searchParams.get("accountNumber");
      const customer = findCustomer("accountNumber", accountNumber);

      if (!customer || !isWealthCustomer(customer) || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this wealth profile");
        return;
      }

      const profile = getWealthProfile(accountNumber);

      if (!profile) {
        sendJson(response, { source: "sqlite", role, record: null });
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        record: {
          customer: sanitizeCustomerForRole(customer, role),
          profile
        }
      });
      return;
    }

    if (requestUrl.pathname === "/api/wealth/profile/update") {
      if (request.method !== "PUT") {
        sendJson(response, { error: "Use PUT to update wealth profiles." }, 405);
        return;
      }

      if (!canEditWealthProfile(session)) {
        sendRestricted(response, role, "wealth profile editing");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateWealthProfilePayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Wealth profile validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const customer = findCustomer("accountNumber", validation.profile.accountNumber);

      if (!customer || !isWealthCustomer(customer) || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this wealth profile");
        return;
      }

      const updatedProfile = updateWealthProfile(validation.profile);

      sendJson(response, {
        source: "sqlite",
        role,
        record: updatedProfile,
        message: "Wealth profile updated."
      });
      return;
    }

    if (requestUrl.pathname === "/api/wealth/interactions/create") {
      if (request.method !== "POST") {
        sendJson(response, { error: "Use POST to add wealth interactions." }, 405);
        return;
      }

      if (!canManageWealthNotes(session)) {
        sendRestricted(response, role, "wealth interaction notes");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateWealthInteractionPayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Wealth interaction validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const customer = findCustomer("accountNumber", validation.interaction.accountNumber);

      if (!customer || !isWealthCustomer(customer) || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this wealth profile");
        return;
      }

      const createdInteraction = createWealthInteraction(validation.interaction, session.user.username);

      sendJson(response, {
        source: "sqlite",
        role,
        record: createdInteraction,
        message: "Wealth interaction saved."
      }, 201);
      return;
    }

    if (requestUrl.pathname === "/api/wealth/interactions/update") {
      if (request.method !== "PUT") {
        sendJson(response, { error: "Use PUT to update wealth interactions." }, 405);
        return;
      }

      if (!canManageWealthNotes(session)) {
        sendRestricted(response, role, "wealth interaction editing");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateWealthInteractionUpdatePayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Wealth interaction validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const interaction = findWealthInteractionById(validation.interaction.id);
      const customer = interaction ? findCustomer("accountNumber", interaction.accountNumber) : null;

      if (!interaction || !interaction.userCreated) {
        sendJson(response, { error: "Only interactions added through this prototype can be edited." }, 400);
        return;
      }

      if (!customer || !isWealthCustomer(customer) || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this wealth profile");
        return;
      }

      const updatedInteraction = updateWealthInteraction(validation.interaction, interaction);

      sendJson(response, {
        source: "sqlite",
        role,
        record: updatedInteraction,
        message: "Wealth interaction updated."
      });
      return;
    }

    if (requestUrl.pathname === "/api/wealth/interactions/delete") {
      if (request.method !== "DELETE") {
        sendJson(response, { error: "Use DELETE to remove wealth interactions." }, 405);
        return;
      }

      if (!canManageWealthNotes(session)) {
        sendRestricted(response, role, "wealth interaction removal");
        return;
      }

      const interactionId = Number(requestUrl.searchParams.get("id"));

      if (!Number.isInteger(interactionId) || interactionId <= 0) {
        sendJson(response, { error: "A valid interaction id is required." }, 400);
        return;
      }

      const removed = deleteWealthInteraction(interactionId);

      if (!removed) {
        sendJson(response, { error: "Only interactions added through this prototype can be removed." }, 400);
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        message: "Wealth interaction removed."
      });
      return;
    }

    if (requestUrl.pathname === "/api/lending/profile") {
      if (request.method !== "GET") {
        sendJson(response, { error: "Use GET to open lending profiles." }, 405);
        return;
      }

      if (!canViewLendingProfile(session)) {
        sendRestricted(response, role, "lending profile");
        return;
      }

      const accountNumber = requestUrl.searchParams.get("accountNumber");
      const customer = findCustomer("accountNumber", accountNumber);

      if (!customer || !customer.loans.length || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this lending profile");
        return;
      }

      const profile = getLendingProfile(accountNumber);

      if (!profile) {
        sendJson(response, { source: "sqlite", role, record: null });
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        record: {
          customer: sanitizeCustomerForRole(customer, role),
          profile
        }
      });
      return;
    }

    if (requestUrl.pathname === "/api/lending/profile/update") {
      if (request.method !== "PUT") {
        sendJson(response, { error: "Use PUT to update lending profiles." }, 405);
        return;
      }

      if (!canEditLendingProfile(session)) {
        sendRestricted(response, role, "lending profile editing");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateLendingProfilePayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Lending profile validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const customer = findCustomer("accountNumber", validation.profile.accountNumber);

      if (!customer || !customer.loans.length || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this lending profile");
        return;
      }

      const updatedProfile = updateLendingProfile(validation.profile);

      sendJson(response, {
        source: "sqlite",
        role,
        record: updatedProfile,
        message: "Lending profile updated."
      });
      return;
    }

    if (requestUrl.pathname === "/api/lending/documents/update") {
      if (request.method !== "PUT") {
        sendJson(response, { error: "Use PUT to update lending documents." }, 405);
        return;
      }

      if (!canEditLendingProfile(session)) {
        sendRestricted(response, role, "lending document editing");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateLendingDocumentPayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Lending document validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const document = findLendingDocumentById(validation.document.id);
      const customer = document ? findCustomer("accountNumber", document.accountNumber) : null;

      if (!document || !customer || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this lending document");
        return;
      }

      const updatedDocument = updateLendingDocument(validation.document);

      sendJson(response, {
        source: "sqlite",
        role,
        record: updatedDocument,
        message: "Lending document updated."
      });
      return;
    }

    if (requestUrl.pathname === "/api/lending/contact-history/create") {
      if (request.method !== "POST") {
        sendJson(response, { error: "Use POST to add lending contact notes." }, 405);
        return;
      }

      if (!canManageLendingNotes(session)) {
        sendRestricted(response, role, "lending contact notes");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateLendingContactPayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Lending contact validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const customer = findCustomer("accountNumber", validation.contact.accountNumber);

      if (!customer || !customer.loans.length || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this lending profile");
        return;
      }

      const createdContact = createLendingContact(validation.contact, session.user.username);

      sendJson(response, {
        source: "sqlite",
        role,
        record: createdContact,
        message: "Lending contact note saved."
      }, 201);
      return;
    }

    if (requestUrl.pathname === "/api/lending/contact-history/update") {
      if (request.method !== "PUT") {
        sendJson(response, { error: "Use PUT to update lending contact notes." }, 405);
        return;
      }

      if (!canManageLendingNotes(session)) {
        sendRestricted(response, role, "lending contact editing");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateLendingContactUpdatePayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Lending contact validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const contact = findLendingContactById(validation.contact.id);
      const customer = contact ? findCustomer("accountNumber", contact.accountNumber) : null;

      if (!contact || !contact.userCreated) {
        sendJson(response, { error: "Only contact notes added through this prototype can be edited." }, 400);
        return;
      }

      if (!customer || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this lending profile");
        return;
      }

      const updatedContact = updateLendingContact(validation.contact, contact);

      sendJson(response, {
        source: "sqlite",
        role,
        record: updatedContact,
        message: "Lending contact note updated."
      });
      return;
    }

    if (requestUrl.pathname === "/api/lending/contact-history/delete") {
      if (request.method !== "DELETE") {
        sendJson(response, { error: "Use DELETE to remove lending contact notes." }, 405);
        return;
      }

      if (!canManageLendingNotes(session)) {
        sendRestricted(response, role, "lending contact removal");
        return;
      }

      const contactId = Number(requestUrl.searchParams.get("id"));

      if (!Number.isInteger(contactId) || contactId <= 0) {
        sendJson(response, { error: "A valid contact note id is required." }, 400);
        return;
      }

      const removed = deleteLendingContact(contactId);

      if (!removed) {
        sendJson(response, { error: "Only contact notes added through this prototype can be removed." }, 400);
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        message: "Lending contact note removed."
      });
      return;
    }

    if (requestUrl.pathname === "/api/customers/find") {
      const type = requestUrl.searchParams.get("type");
      const value = requestUrl.searchParams.get("value");

      if (!canAccessCustomer(session)) {
        sendRestricted(response, role, "customer or fraud risk record");
        return;
      }

      const record = findCustomer(type, value);

      if (record && !canAccessCustomer(session, record)) {
        sendRestricted(response, role, "this customer record");
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        query: getCustomerLookupSql(type),
        record: record ? sanitizeCustomerForRole(record, role) : null
      });
      return;
    }

    if (requestUrl.pathname === "/api/employees/find") {
      const type = requestUrl.searchParams.get("type");
      const value = requestUrl.searchParams.get("value");

      if (!canAccessEmployee(session)) {
        sendRestricted(response, role, "employee record");
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        query: getEmployeeLookupSql(type),
        record: findEmployee(type, value)
      });
      return;
    }

    if (requestUrl.pathname === "/api/businesses/find") {
      const type = requestUrl.searchParams.get("type");
      const value = requestUrl.searchParams.get("value");

      if (!canSearchBusiness(session)) {
        sendRestricted(response, role, "business account");
        return;
      }

      const record = findBusiness(type, value);

      if (record && !canAccessBusiness(session, record)) {
        sendRestricted(response, role, "business account");
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        query: getBusinessLookupSql(type),
        record: record ? sanitizeBusinessForRole(record, role) : null
      });
      return;
    }

    if (requestUrl.pathname === "/api/customers/update") {
      if (request.method !== "PUT") {
        sendJson(response, { error: "Use PUT to update customers." }, 405);
        return;
      }

      if (!canEditCustomer(session)) {
        sendRestricted(response, role, "customer editing");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateCustomerUpdatePayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Customer validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const customer = findCustomer("accountNumber", validation.customer.accountNumber);

      if (!customer || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this customer record");
        return;
      }

      const updatedCustomer = updateCustomer(validation.customer, role);

      sendJson(response, {
        source: "sqlite",
        role,
        record: updatedCustomer,
        message: "Customer updated."
      });
      return;
    }

    if (requestUrl.pathname === "/api/businesses/update") {
      if (request.method !== "PUT") {
        sendJson(response, { error: "Use PUT to update businesses." }, 405);
        return;
      }

      if (!canEditBusiness(session)) {
        sendRestricted(response, role, "business editing");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateBusinessUpdatePayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Business validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const business = findBusiness("businessId", validation.business.businessId);

      if (!business || !canAccessBusiness(session, business)) {
        sendRestricted(response, role, "this business record");
        return;
      }

      const updatedBusiness = updateBusiness(validation.business, role);

      sendJson(response, {
        source: "sqlite",
        role,
        record: updatedBusiness,
        message: "Business account updated."
      });
      return;
    }

    if (requestUrl.pathname === "/api/employees/update") {
      if (request.method !== "PUT") {
        sendJson(response, { error: "Use PUT to update employees." }, 405);
        return;
      }

      if (!canEditEmployee(session)) {
        sendRestricted(response, role, "employee editing");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateEmployeeUpdatePayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Employee validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const employee = findEmployee("employeeId", validation.employee.employeeId);

      if (!employee || !canAccessEmployee(session)) {
        sendRestricted(response, role, "this employee record");
        return;
      }

      const updatedEmployee = updateEmployee(validation.employee);

      sendJson(response, {
        source: "sqlite",
        role,
        record: updatedEmployee,
        message: "Employee record updated."
      });
      return;
    }

    if (requestUrl.pathname === "/api/leads/create") {
      if (request.method !== "POST") {
        sendJson(response, { error: "Use POST to create leads." }, 405);
        return;
      }

      if (!canCreateLead(session)) {
        sendRestricted(response, role, "lead creation");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateLeadPayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Lead validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const customer = findCustomer("accountNumber", validation.lead.accountNumber);

      if (!customer) {
        sendJson(response, {
          error: "No customer matches that account number.",
          fieldErrors: {
            accountNumber: "Use an existing test account number."
          }
        }, 400);
        return;
      }

      if (!canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this customer record");
        return;
      }

      const createdLead = createLead(validation.lead, customer, role);

      sendJson(response, {
        source: "sqlite",
        role,
        record: createdLead,
        message: "Lead created."
      }, 201);
      return;
    }

    if (requestUrl.pathname === "/api/leads/update") {
      if (request.method !== "PUT") {
        sendJson(response, { error: "Use PUT to update leads." }, 405);
        return;
      }

      if (!canEditLead(session)) {
        sendRestricted(response, role, "lead editing");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateLeadUpdatePayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Lead validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const lead = findLeadById(validation.lead.id);
      const customer = findCustomer("accountNumber", validation.lead.accountNumber);

      if (!lead || !canAccessLead(session, lead)) {
        sendRestricted(response, role, "this lead record");
        return;
      }

      if (!customer) {
        sendJson(response, {
          error: "No customer matches that account number.",
          fieldErrors: {
            accountNumber: "Use an existing test account number."
          }
        }, 400);
        return;
      }

      if (!canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this customer record");
        return;
      }

      const updatedLead = updateLead(validation.lead, customer);

      sendJson(response, {
        source: "sqlite",
        role,
        record: updatedLead,
        message: "Lead updated."
      });
      return;
    }

    if (requestUrl.pathname === "/api/leads/delete") {
      if (request.method !== "DELETE") {
        sendJson(response, { error: "Use DELETE to remove leads." }, 405);
        return;
      }

      if (!canCreateLead(session)) {
        sendRestricted(response, role, "lead removal");
        return;
      }

      const leadId = Number(requestUrl.searchParams.get("id"));

      if (!Number.isInteger(leadId) || leadId <= 0) {
        sendJson(response, { error: "A valid lead id is required." }, 400);
        return;
      }

      const removed = deleteLead(leadId);

      if (!removed) {
        sendJson(response, { error: "Only newly created leads can be removed in this prototype." }, 400);
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        message: "Lead removed."
      });
      return;
    }

    if (requestUrl.pathname === "/api/notes/create") {
      if (request.method !== "POST") {
        sendJson(response, { error: "Use POST to create notes." }, 405);
        return;
      }

      if (!canWriteBankNote(session)) {
        sendRestricted(response, role, "bank note creation");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateNotePayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Bank note validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const customer = findCustomer("accountNumber", validation.note.accountNumber);

      if (!customer || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this customer record");
        return;
      }

      const createdNote = createBankNote(validation.note, getSessionDisplayName(session));

      sendJson(response, {
        source: "sqlite",
        role,
        record: createdNote,
        message: "Bank note saved."
      }, 201);
      return;
    }

    if (requestUrl.pathname === "/api/notes/update") {
      if (request.method !== "PUT") {
        sendJson(response, { error: "Use PUT to update notes." }, 405);
        return;
      }

      if (!canEditBankNote(session)) {
        sendRestricted(response, role, "bank note editing");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateNoteUpdatePayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Bank note validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const note = findBankNoteById(validation.note.id);
      const customer = note ? findCustomer("accountNumber", note.accountNumber) : null;

      if (!note || note.author !== getSessionDisplayName(session)) {
        sendJson(response, { error: "Only notes added by the active user can be edited." }, 400);
        return;
      }

      if (!customer || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this customer record");
        return;
      }

      const updatedNote = updateBankNote(validation.note);

      sendJson(response, {
        source: "sqlite",
        role,
        record: updatedNote,
        message: "Bank note updated."
      });
      return;
    }

    if (requestUrl.pathname === "/api/notes/delete") {
      if (request.method !== "DELETE") {
        sendJson(response, { error: "Use DELETE to remove notes." }, 405);
        return;
      }

      if (!canWriteBankNote(session)) {
        sendRestricted(response, role, "bank note removal");
        return;
      }

      const noteId = Number(requestUrl.searchParams.get("id"));

      if (!Number.isInteger(noteId) || noteId <= 0) {
        sendJson(response, { error: "A valid note id is required." }, 400);
        return;
      }

      const removed = deleteBankNote(noteId, getSessionDisplayName(session));

      if (!removed) {
        sendJson(response, { error: "Only notes added by the active user can be removed." }, 400);
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        message: "Bank note removed."
      });
      return;
    }

    if (requestUrl.pathname === "/api/fraud-notes/create") {
      if (request.method !== "POST") {
        sendJson(response, { error: "Use POST to create fraud notes." }, 405);
        return;
      }

      if (!canManageFraudNotes(session)) {
        sendRestricted(response, role, "fraud note creation");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateFraudNotePayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Fraud note validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const customer = findCustomer("accountNumber", validation.note.accountNumber);

      if (!customer || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this fraud matrix");
        return;
      }

      const createdNote = createFraudNote(validation.note, getSessionDisplayName(session));

      sendJson(response, {
        source: "sqlite",
        role,
        record: createdNote,
        customer: sanitizeCustomerForRole(getCustomerRecord(validation.note.accountNumber), role),
        message: "Fraud note saved and score recalculated."
      }, 201);
      return;
    }

    if (requestUrl.pathname === "/api/fraud-notes/delete") {
      if (request.method !== "DELETE") {
        sendJson(response, { error: "Use DELETE to remove fraud notes." }, 405);
        return;
      }

      if (!canManageFraudNotes(session)) {
        sendRestricted(response, role, "fraud note removal");
        return;
      }

      const noteId = Number(requestUrl.searchParams.get("id"));

      if (!Number.isInteger(noteId) || noteId <= 0) {
        sendJson(response, { error: "A valid fraud note id is required." }, 400);
        return;
      }

      const note = findFraudNoteById(noteId);
      const customer = note ? findCustomer("accountNumber", note.accountNumber) : null;

      if (!note || !customer || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this fraud note");
        return;
      }

      if (note.author !== getSessionDisplayName(session)) {
        sendJson(response, { error: "Only Fraud Notes added by the active user can be removed." }, 400);
        return;
      }

      const removed = deleteFraudNote(noteId);

      if (!removed) {
        sendJson(response, { error: "Fraud note could not be removed." }, 400);
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        customer: sanitizeCustomerForRole(getCustomerRecord(note.accountNumber), role),
        message: "Fraud note removed and score recalculated."
      });
      return;
    }

    if (requestUrl.pathname === "/api/offers/update") {
      if (request.method !== "PUT") {
        sendJson(response, { error: "Use PUT to update offers." }, 405);
        return;
      }

      if (!canEditOffer(session)) {
        sendRestricted(response, role, "offer editing");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateOfferUpdatePayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Offer validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const offer = findOfferById(validation.offer.id);

      if (!offer || !canAccessOffer(session, offer)) {
        sendRestricted(response, role, "this offer record");
        return;
      }

      const updatedOffer = updateOffer(validation.offer);

      sendJson(response, {
        source: "sqlite",
        role,
        record: updatedOffer,
        message: "Offer updated."
      });
      return;
    }

    if (requestUrl.pathname === "/api/meetings/create") {
      if (request.method !== "POST") {
        sendJson(response, { error: "Use POST to schedule meetings." }, 405);
        return;
      }

      if (!canScheduleMeeting(session)) {
        sendRestricted(response, role, "meeting scheduling");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateMeetingPayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Meeting validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const customer = findCustomer("accountNumber", validation.meeting.accountNumber);

      if (!customer || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this customer record");
        return;
      }

      const createdMeeting = createMeeting(validation.meeting, customer, session.user.username);

      sendJson(response, {
        source: "sqlite",
        role,
        record: createdMeeting,
        message: "Meeting scheduled."
      }, 201);
      return;
    }

    if (requestUrl.pathname === "/api/meetings/update") {
      if (request.method !== "PUT") {
        sendJson(response, { error: "Use PUT to update meetings." }, 405);
        return;
      }

      if (!canEditMeeting(session)) {
        sendRestricted(response, role, "meeting editing");
        return;
      }

      const payload = await readJsonBody(request);
      const validation = validateMeetingUpdatePayload(payload);

      if (!validation.valid) {
        sendJson(response, {
          error: "Meeting validation failed.",
          fieldErrors: validation.fieldErrors
        }, 400);
        return;
      }

      const meeting = findMeetingById(validation.meeting.id);
      const customer = findCustomer("accountNumber", validation.meeting.accountNumber);

      if (!meeting || !canAccessMeeting(session, meeting)) {
        sendRestricted(response, role, "this meeting record");
        return;
      }

      if (!customer || !canAccessCustomer(session, customer)) {
        sendRestricted(response, role, "this customer record");
        return;
      }

      const updatedMeeting = updateMeeting(validation.meeting, customer, meeting);

      sendJson(response, {
        source: "sqlite",
        role,
        record: updatedMeeting,
        message: "Meeting updated."
      });
      return;
    }

    if (requestUrl.pathname === "/api/meetings/delete") {
      if (request.method !== "DELETE") {
        sendJson(response, { error: "Use DELETE to cancel meetings." }, 405);
        return;
      }

      if (!canScheduleMeeting(session)) {
        sendRestricted(response, role, "meeting cancellation");
        return;
      }

      const meetingId = Number(requestUrl.searchParams.get("id"));

      if (!Number.isInteger(meetingId) || meetingId <= 0) {
        sendJson(response, { error: "A valid meeting id is required." }, 400);
        return;
      }

      const removed = deleteMeeting(meetingId);

      if (!removed) {
        sendJson(response, { error: "Only newly scheduled meetings can be canceled in this prototype." }, 400);
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        message: "Meeting canceled."
      });
      return;
    }

    sendJson(response, { error: "API route not found" }, 404);
  } catch (error) {
    sendJson(response, { error: error.message }, 500);
  }
}

function getSessionFromRequest(request) {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const requestedRole = normalizeRole(request.headers["x-crm-role"] || requestUrl.searchParams.get("role") || "");

  if (requestedRole) {
    return getPrototypeRoleSession(request, requestedRole);
  }

  const token = getBearerToken(request);

  if (token) {
    const session = sessions.get(token);

    if (session && session.expiresAt > Date.now()) {
      session.permissions = getPermissionsForRole(session.user.role);
      session.expiresAt = Date.now() + SESSION_TTL_MS;
      return session;
    }

    sessions.delete(token);
  }

  return getPrototypeRoleSession(request);
}

function getBearerToken(request) {
  const authHeader = request.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return "";
  }

  return token.trim();
}

function getPrototypeRoleSession(request, requestedRole = "") {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const role = normalizeRole(requestedRole || request.headers["x-crm-role"] || requestUrl.searchParams.get("role") || "admin");

  if (!role) {
    return null;
  }

  return {
    token: `prototype-${role}`,
    user: getPrototypeUserForRole(role),
    permissions: getPermissionsForRole(role),
    prototype: true,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS
  };
}

function getPrototypeUserForRole(role) {
  const row = db.prepare(`
    SELECT role, label, department, name, first_name, email
    FROM role_test_users
    WHERE role = ?
    LIMIT 1
  `).get(role);
  const fallbackName = role.charAt(0).toUpperCase() + role.slice(1);
  const name = (row && (row.name || row.first_name)) || fallbackName;

  return {
    id: `prototype-${role}`,
    username: name,
    email: row ? row.email : "",
    role,
    label: row ? row.label : fallbackName,
    department: row ? row.department : "Prototype",
    name,
    firstName: getFirstName(name),
    page: `home.html?role=${encodeURIComponent(role)}`,
    prototype: true
  };
}

function getFirstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

function getPermissionsForRole(role) {
  return db.prepare("SELECT permission FROM role_permissions WHERE role = ? ORDER BY sort_order")
    .all(role)
    .map((row) => row.permission);
}

function hasPermission(auth, permission) {
  const session = getAuthSession(auth);
  return Boolean(session.permissions && session.permissions.includes(permission));
}

function hasAnyPermission(auth, permissions) {
  return [].concat(permissions || []).some((permission) => hasPermission(auth, permission));
}

function requirePermission(response, auth, permissions, dataType) {
  if (hasAnyPermission(auth, permissions)) {
    return true;
  }

  sendRestricted(response, getAuthRole(auth), dataType);
  return false;
}

function getAuthSession(auth) {
  if (auth && typeof auth === "object" && auth.user) {
    return {
      ...auth,
      permissions: auth.permissions || getPermissionsForRole(auth.user.role)
    };
  }

  const role = normalizeRole(auth);
  return {
    user: { role },
    permissions: role ? getPermissionsForRole(role) : []
  };
}

function getAuthRole(auth) {
  return getAuthSession(auth).user.role;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeRole(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  return AUTHENTICATED_ROLES.includes(normalizedRole) ? normalizedRole : "";
}

function isAuthenticatedRole(role) {
  return AUTHENTICATED_ROLES.includes(role);
}

function canAccessCustomer(auth, customer = null) {
  if (hasAnyPermission(auth, ["search_customers", "search_fraud_risk"])) {
    return true;
  }

  if (hasPermission(auth, "search_wealth_customers")) {
    return customer ? isWealthCustomer(customer) : true;
  }

  if (hasPermission(auth, "search_loan_customers")) {
    return customer ? customer.loans.length > 0 : true;
  }

  return false;
}

function canAccessEmployee(auth) {
  return hasPermission(auth, "search_employees");
}

function canSearchBusiness(auth) {
  return hasAnyPermission(auth, ["search_businesses", "search_employee_businesses"]);
}

function canAccessBusiness(auth, business = null) {
  if (hasPermission(auth, "search_businesses")) {
    return true;
  }

  return hasPermission(auth, "search_employee_businesses") && (!business || business.ownerType === "Employee");
}

function canCreateLead(auth) {
  return hasPermission(auth, "manage_leads");
}

function canEditLead(auth) {
  return hasPermission(auth, "edit_leads");
}

function canWriteBankNote(auth) {
  return hasPermission(auth, "manage_bank_notes");
}

function canEditBankNote(auth) {
  return hasPermission(auth, "edit_bank_notes");
}

function canManageFraudNotes(auth) {
  return hasPermission(auth, "manage_fraud_notes");
}

function canScheduleMeeting(auth) {
  return hasPermission(auth, "manage_meetings");
}

function canEditMeeting(auth) {
  return hasPermission(auth, "edit_meetings");
}

function canEditCustomer(auth) {
  return hasPermission(auth, "edit_customers");
}

function canEditOffer(auth) {
  return hasPermission(auth, "edit_offers");
}

function canEditBusiness(auth) {
  return hasPermission(auth, "edit_businesses");
}

function canEditEmployee(auth) {
  return hasPermission(auth, "edit_employees");
}

function canViewWealthProfile(auth) {
  return hasPermission(auth, "view_wealth_profile");
}

function canEditWealthProfile(auth) {
  return hasPermission(auth, "edit_wealth_profile");
}

function canManageWealthNotes(auth) {
  return hasPermission(auth, "manage_wealth_notes");
}

function canViewLendingProfile(auth) {
  return hasPermission(auth, "view_lending_profile");
}

function canViewRecommendations(auth) {
  return hasAnyPermission(auth, ["view_discover_needs", "view_lending_profile", "view_wealth_profile"]);
}

function canEditLendingProfile(auth) {
  return hasPermission(auth, "edit_lending_profile");
}

function canManageLendingNotes(auth) {
  return hasPermission(auth, "manage_lending_notes");
}

function sanitizeFraudAnalysisForRole(analysis, role) {
  if (role === "admin" || role === "fraud") {
    return analysis;
  }

  return {
    baseScore: analysis.baseScore,
    adjustedScore: analysis.adjustedScore,
    scoreLift: analysis.scoreLift,
    riskTier: analysis.riskTier,
    topCategory: "Fraud score summary only",
    summary: "Detailed fraud rule matches are restricted to Fraud and Admin roles.",
    topAction: "Use standard service procedures and escalate to Fraud if the customer raises a concern.",
    actions: [],
    matches: [],
    sourcesAnalyzed: analysis.sourcesAnalyzed,
    ruleCount: analysis.ruleCount,
    scoringModel: "Fraud score summary is visible; detailed rule evidence is restricted."
  };
}

function getRecommendationContext(accountNumber) {
  return {
    today: "2026-06-10",
    lendingProfile: getLendingProfile(accountNumber),
    wealthProfile: getWealthProfile(accountNumber)
  };
}

function filterRecommendationAnalysisForRole(analysis, role) {
  const allowedCategoriesByRole = {
    admin: ["lending", "wealth", "discover"],
    banker: ["lending", "discover"],
    wealth: ["wealth", "discover"],
    loans: ["lending", "discover"]
  };
  const allowedCategories = allowedCategoriesByRole[role] || [];
  const recommendations = analysis.recommendations.filter((recommendation) => {
    return allowedCategories.includes(recommendation.category);
  });
  const categories = {
    lending: recommendations.filter((recommendation) => recommendation.category === "lending"),
    wealth: recommendations.filter((recommendation) => recommendation.category === "wealth"),
    discover: recommendations.filter((recommendation) => recommendation.category === "discover")
  };

  return {
    ...analysis,
    recommendationCount: recommendations.length,
    recommendations,
    categories,
    nextBestAction: getFilteredNextBestAction(recommendations)
  };
}

function getFilteredNextBestAction(recommendations) {
  const discoverAction = recommendations.find((recommendation) => {
    return recommendation.category === "discover" && recommendation.priority === "High";
  });
  const top = discoverAction || recommendations[0] || null;

  if (!top) {
    return null;
  }

  return {
    title: top.product,
    priority: top.priority,
    reason: top.reason,
    nextAction: top.nextAction,
    score: top.score,
    sourceRule: top.ruleName
  };
}

function getPaginationParams(requestUrl) {
  const requestedPage = Number.parseInt(requestUrl.searchParams.get("page") || "1", 10);
  const requestedPageSize = Number.parseInt(requestUrl.searchParams.get("pageSize") || "25", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.min(Math.max(requestedPageSize, 1), 100)
    : 25;

  return { page, pageSize };
}

function runPagedQuery({ requestUrl, countSql, dataSql, params, mapper, metaBuilder = null }) {
  const { page: requestedPage, pageSize } = getPaginationParams(requestUrl);
  const countRow = db.prepare(countSql).get(...params);
  const total = Number(countRow?.total || 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pages);
  const offset = (page - 1) * pageSize;
  const rows = total > 0 ? db.prepare(dataSql).all(...params, pageSize, offset) : [];
  const result = {
    data: rows.map(mapper),
    page,
    pageSize,
    total,
    pages
  };

  if (metaBuilder) {
    result.meta = metaBuilder(params);
  }

  return result;
}

function getPagedCustomersForAuth(auth, requestUrl) {
  const role = getAuthRole(auth);
  const clauses = [];
  const params = [];
  const hasBroadCustomerSearch = hasAnyPermission(auth, ["search_customers", "search_fraud_risk"]);

  if (!hasBroadCustomerSearch && hasPermission(auth, "search_wealth_customers")) {
    clauses.push("customers.household_balance > 100000");
  }

  if (!hasBroadCustomerSearch && hasPermission(auth, "search_loan_customers")) {
    clauses.push("EXISTS (SELECT 1 FROM loans WHERE loans.account_number = customers.account_number)");
  }

  addTextSearchClause(
    clauses,
    params,
    requestUrl,
    [
      "customers.name",
      "customers.account_number",
      "customers.cif",
      "customers.email",
      "customers.primary_branch",
      "customers.personal_banker",
      "customer_profitability.main_driver",
      "customer_profitability.watch_item",
      "customer_profitability.tier"
    ]
  );

  const filter = getFilterValue(requestUrl);
  if (filter) {
    clauses.push("customer_profitability.tier = ?");
    params.push(filter);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const fromSql = `
    FROM customers
    INNER JOIN customer_profitability
      ON customer_profitability.account_number = customers.account_number
  `;
  const orderBy = getOrderBy(requestUrl, {
    "contribution-desc": "customer_profitability.annual_contribution DESC, customers.name ASC",
    "contribution-asc": "customer_profitability.annual_contribution ASC, customers.name ASC",
    "name-asc": "customers.name ASC",
    "tier-desc": "CASE customer_profitability.tier WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 1 ELSE 0 END DESC, customer_profitability.annual_contribution DESC"
  }, "customers.name ASC");

  return runPagedQuery({
    requestUrl,
    countSql: `SELECT COUNT(*) AS total ${fromSql} ${whereSql}`,
    dataSql: `
      SELECT customers.account_number
      ${fromSql}
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `,
    params,
    mapper: (row) => sanitizeCustomerForRole(getCustomerRecord(row.account_number), role),
    metaBuilder: (queryParams) => getCustomerPageMeta(fromSql, whereSql, queryParams)
  });
}

function getPagedBusinessRecordsForAuth(auth, requestUrl) {
  const role = getAuthRole(auth);
  const clauses = [];
  const params = [];

  if (!hasPermission(auth, "search_businesses") && hasPermission(auth, "search_employee_businesses")) {
    clauses.push("owner_type = 'Employee'");
  }

  addTextSearchClause(
    clauses,
    params,
    requestUrl,
    ["business_name", "business_id", "owner_name", "owner_type", "banker", "lending_opportunity", "products"]
  );

  const filter = getFilterValue(requestUrl);
  if (filter) {
    clauses.push("(owner_type = ? OR status = ?)");
    params.push(filter, filter);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const orderBy = getOrderBy(requestUrl, {
    "value-desc": "relationship_value DESC, business_name ASC",
    "value-asc": "relationship_value ASC, business_name ASC",
    "name-asc": "business_name ASC",
    "owner-asc": "owner_name ASC",
    "status-asc": "status ASC, business_name ASC"
  }, "business_name ASC");

  return runPagedQuery({
    requestUrl,
    countSql: `SELECT COUNT(*) AS total FROM business_records ${whereSql}`,
    dataSql: `
      SELECT *
      FROM business_records
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `,
    params,
    mapper: (row) => sanitizeBusinessForRole(mapBusiness(row), role)
  });
}

function getPagedLeadsForAuth(auth, requestUrl) {
  const role = getAuthRole(auth);
  const clauses = [];
  const params = [];

  if (!hasPermission(auth, "view_all_leads")) {
    clauses.push("leads.visible_to LIKE ?");
    params.push(`%"${role}"%`);
  }

  addTextSearchClause(
    clauses,
    params,
    requestUrl,
    [
      "leads.lead_type",
      "leads.title",
      "leads.priority",
      "leads.status",
      "leads.reason",
      "leads.account_number",
      "customers.name",
      "customers.personal_banker"
    ]
  );

  const filter = getFilterValue(requestUrl);
  if (filter) {
    clauses.push("(leads.lead_type = ? OR leads.priority = ? OR leads.status = ?)");
    params.push(filter, filter, filter);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const fromSql = `
    FROM leads
    LEFT JOIN customers ON customers.account_number = leads.account_number
  `;
  const orderBy = getOrderBy(requestUrl, {
    "amount-desc": "leads.amount DESC, leads.id ASC",
    "amount-asc": "leads.amount ASC, leads.id ASC",
    "priority-desc": "CASE leads.priority WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 1 ELSE 0 END DESC, leads.amount DESC",
    "customer-asc": "customers.name ASC, leads.id ASC",
    "status-asc": "leads.status ASC, leads.id ASC"
  }, "leads.id DESC");

  return runPagedQuery({
    requestUrl,
    countSql: `SELECT COUNT(*) AS total ${fromSql} ${whereSql}`,
    dataSql: `
      SELECT leads.*
      ${fromSql}
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `,
    params,
    mapper: mapLead
  });
}

function getPagedOffersForAuth(auth, requestUrl) {
  const role = getAuthRole(auth);
  const clauses = [];
  const params = [];

  if (!hasPermission(auth, "view_all_offers")) {
    clauses.push("visible_to LIKE ?");
    params.push(`%"${role}"%`);
  }

  addTextSearchClause(
    clauses,
    params,
    requestUrl,
    ["offer_type", "title", "audience", "priority", "status", "reason"]
  );

  const filter = getFilterValue(requestUrl);
  if (filter) {
    clauses.push("(offer_type = ? OR priority = ? OR status = ?)");
    params.push(filter, filter, filter);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const orderBy = getOrderBy(requestUrl, {
    "priority-desc": "CASE priority WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 1 ELSE 0 END DESC, title ASC",
    "title-asc": "title ASC",
    "status-asc": "status ASC, title ASC"
  }, "id ASC");

  return runPagedQuery({
    requestUrl,
    countSql: `SELECT COUNT(*) AS total FROM offers ${whereSql}`,
    dataSql: `
      SELECT *
      FROM offers
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `,
    params,
    mapper: mapOffer
  });
}

function getPagedMeetingsForAuth(auth, requestUrl) {
  const role = getAuthRole(auth);
  const clauses = [];
  const params = [];

  if (!hasPermission(auth, "view_all_meetings")) {
    if (role === "wealth") {
      clauses.push("(customers.affluency_tier >= 3 OR customers.invested_balance >= 100000)");
    } else {
      clauses.push("meetings.visible_to LIKE ?");
      params.push(`%"${role}"%`);
    }
  }

  addTextSearchClause(
    clauses,
    params,
    requestUrl,
    ["meetings.title", "meetings.client", "meetings.meeting_date", "meetings.owner", "meetings.account_number"]
  );

  const filter = getFilterValue(requestUrl);
  if (filter) {
    clauses.push("meetings.owner = ?");
    params.push(filter);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const fromSql = `
    FROM meetings
    LEFT JOIN customers ON customers.account_number = meetings.account_number
  `;
  const orderBy = getOrderBy(requestUrl, {
    "date-asc": "meetings.meeting_date ASC, meetings.id ASC",
    "date-desc": "meetings.meeting_date DESC, meetings.id DESC",
    "client-asc": "meetings.client ASC, meetings.id ASC",
    "owner-asc": "meetings.owner ASC, meetings.meeting_date ASC"
  }, "meetings.meeting_date ASC");

  return runPagedQuery({
    requestUrl,
    countSql: `SELECT COUNT(*) AS total ${fromSql} ${whereSql}`,
    dataSql: `
      SELECT meetings.*
      ${fromSql}
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `,
    params,
    mapper: mapMeeting
  });
}

function getCustomerPageMeta(fromSql, whereSql, params) {
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(customer_profitability.annual_contribution), 0) AS totalContribution
    ${fromSql}
    ${whereSql}
  `).get(...params);
  const topCustomer = db.prepare(`
    SELECT customers.name
    ${fromSql}
    ${whereSql}
    ORDER BY customer_profitability.annual_contribution DESC
    LIMIT 1
  `).get(...params);

  return {
    totalContribution: Number(totals?.totalContribution || 0),
    topCustomer: topCustomer?.name || "None"
  };
}

function addTextSearchClause(clauses, params, requestUrl, columns) {
  const search = normalizeValue(requestUrl.searchParams.get("search"));

  if (!search) {
    return;
  }

  clauses.push(`(${columns.map((column) => `lower(CAST(${column} AS TEXT)) LIKE ?`).join(" OR ")})`);
  columns.forEach(() => params.push(`%${search}%`));
}

function getFilterValue(requestUrl) {
  const filter = String(requestUrl.searchParams.get("filter") || "").trim();
  return filter && filter !== "all" ? filter : "";
}

function getOrderBy(requestUrl, allowedSorts, fallback) {
  const sort = String(requestUrl.searchParams.get("sort") || "").trim();
  return allowedSorts[sort] || fallback;
}

function getCustomersForRole(role) {
  if (!canAccessCustomer(role)) {
    return [];
  }

  return getCustomers()
    .filter((customer) => canAccessCustomer(role, customer))
    .map((customer) => sanitizeCustomerForRole(customer, role));
}

function getEmployeesForRole(role) {
  return canAccessEmployee(role) ? getEmployees() : [];
}

function getBusinessRecordsForRole(role) {
  if (hasPermission(role, "search_businesses")) {
    return getBusinessRecords();
  }

  if (hasPermission(role, "search_employee_businesses")) {
    return getBusinessRecords()
      .filter((business) => business.ownerType === "Employee")
      .map((business) => sanitizeBusinessForRole(business, role));
  }

  return [];
}

function sanitizeCustomerForRole(customer, role) {
  if (role === "admin") {
    return customer;
  }

  if (role === "fraud") {
    return {
      accountNumber: customer.accountNumber,
      name: customer.name,
      cif: customer.cif,
      household: 0,
      businessAccounts: [],
      loans: [],
      profitability: {
        tier: "Restricted",
        annualContribution: 0,
        mainDriver: "Restricted outside fraud workflow",
        watchItem: "Restricted outside fraud workflow"
      },
      fraudRiskScore: customer.fraudRiskScore,
      fraudRiskTier: customer.fraudRiskTier,
      fraudCases: customer.fraudCases,
      frontlineNotes: customer.frontlineNotes,
      lastReviewed: customer.lastReviewed,
      fraudHistory: customer.fraudHistory,
      fraudDrivers: customer.fraudDrivers,
      fraudNotes: customer.fraudNotes,
      alerts: customer.alerts,
      notes: customer.notes
    };
  }

  if (role === "wealth") {
    return {
      ...customer,
      fraudDetailAccess: "score_only",
      fraudCases: null,
      frontlineNotes: null,
      lastReviewed: "Restricted to Fraud Team",
      fraudHistory: [],
      fraudDrivers: []
    };
  }

  if (role === "banker") {
    const isWealthClient = isWealthCustomer(customer);

    return {
      ...customer,
      wealthDataAccess: isWealthClient ? "restricted" : "full",
      wealthAdvisor: isWealthClient ? "Restricted to Wealth" : customer.wealthAdvisor,
      investedBalance: isWealthClient ? 0 : customer.investedBalance,
      affluencyTier: isWealthClient ? 0 : customer.affluencyTier,
      fraudDetailAccess: "score_only",
      fraudCases: null,
      frontlineNotes: null,
      lastReviewed: "Restricted to Fraud Team",
      fraudHistory: [],
      fraudDrivers: []
    };
  }

  if (role === "loans") {
    return {
      ...customer,
      limitedProfile: true,
      checking: 0,
      savings: 0,
      household: getLoanBalance(customer),
      wealthDataAccess: "restricted",
      wealthAdvisor: "Restricted to Wealth",
      investedBalance: 0,
      affluencyTier: 0,
      profitability: {
        tier: "Restricted",
        annualContribution: 0,
        mainDriver: "Restricted outside lending workflow",
        watchItem: "Restricted outside lending workflow"
      },
      businessAccounts: [],
      accounts: customer.accounts.map((account) => ({
        ...account,
        balance: 0
      })),
      fraudDetailAccess: "score_only",
      fraudCases: null,
      frontlineNotes: null,
      lastReviewed: "Restricted to Fraud Team",
      fraudHistory: [],
      fraudDrivers: []
    };
  }

  return null;
}

function isWealthCustomer(customer) {
  return Number(customer.household || 0) > 100000;
}

function getFraudRiskTier(score) {
  const numericScore = Number(score || 0);

  if (numericScore >= 81) return "Critical";
  if (numericScore >= 61) return "High";
  if (numericScore >= 31) return "Medium";
  return "Low";
}

function getLoanBalance(customer) {
  return customer.loans.reduce((total, loan) => total + loan.balance, 0);
}

function sanitizeBusinessForRole(business, role) {
  if (role === "hr") {
    return {
      businessId: business.businessId,
      businessName: business.businessName,
      ownerName: business.ownerName,
      ownerType: business.ownerType,
      linkedEmployeeId: business.linkedEmployeeId,
      products: business.products,
      relationshipValue: business.relationshipValue,
      status: business.status,
      banker: business.banker,
      lendingOpportunity: "Disclosure review only"
    };
  }

  return business;
}

function sendRestricted(response, role, dataType) {
  sendJson(response, {
    restricted: true,
    error: "Restricted Access",
    message: `Role ${role || "unknown"} cannot access ${dataType}.`,
    role,
    dataType
  }, 403);
}

function sendAuthRequired(response) {
  sendJson(response, {
    authRequired: true,
    error: "Role Required",
    message: "Choose a prototype role before using this API."
  }, 401);
}

function serveStaticFile(requestUrl, response) {
  const requestedPath = requestUrl.pathname === "/" ? "/home.html" : requestUrl.pathname;
  const filePath = normalize(join(ROOT, decodeURIComponent(requestedPath)));
  const safeRoot = resolve(ROOT);
  const safePath = resolve(filePath);

  if (!safePath.startsWith(safeRoot)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (!existsSync(safePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": getContentType(safePath) });
  response.end(readFileSync(safePath));
}

function getCustomers() {
  return db.prepare("SELECT account_number FROM customers ORDER BY account_number").all()
    .map((row) => getCustomerRecord(row.account_number));
}

function findCustomer(type, value) {
  const normalizedValue = normalizeValue(value);
  const lookup = getCustomerLookup(type, normalizedValue);

  if (!lookup) {
    return null;
  }

  const row = db.prepare(lookup.sql).get(...lookup.params);
  return row ? getCustomerRecord(row.account_number) : null;
}

function getCustomerRecord(accountNumber) {
  const row = db.prepare("SELECT * FROM customers WHERE account_number = ?").get(accountNumber);

  if (!row) {
    return null;
  }

  return {
    accountNumber: row.account_number,
    name: row.name,
    ssn: row.ssn,
    cif: row.cif,
    dob: row.dob,
    zip: row.zip,
    relationship: row.relationship,
    address: row.address,
    phone: row.phone,
    email: row.email,
    primaryBranch: row.primary_branch,
    personalBanker: row.personal_banker,
    wealthAdvisor: row.wealth_advisor,
    checking: row.checking_balance,
    savings: row.savings_balance,
    household: row.household_balance,
    investedBalance: row.invested_balance,
    affluencyTier: row.affluency_tier,
    profitability: getProfitability(accountNumber),
    businessAccounts: getCustomerBusinessAccounts(accountNumber),
    accounts: getCustomerAccounts(accountNumber),
    householdMembers: getHouseholdMembers(accountNumber),
    fraudRiskScore: row.fraud_risk_score,
    fraudRiskTier: getFraudRiskTier(row.fraud_risk_score),
    fraudCases: row.fraud_cases,
    frontlineNotes: row.frontline_notes,
    lastReviewed: row.last_reviewed,
    fraudHistory: getFraudHistory(accountNumber),
    fraudDrivers: getFraudDrivers(accountNumber),
    fraudNotes: getFraudNotes(accountNumber),
    discoverNeeds: getDiscoverNeeds(accountNumber),
    nextBestAction: getNextBestAction(accountNumber),
    alerts: getAlerts(accountNumber),
    notes: getNotes(accountNumber),
    loans: getLoans(accountNumber)
  };
}

function updateCustomer(customer, role) {
  db.prepare(`
    UPDATE customers
    SET
      zip = ?,
      address = ?,
      phone = ?,
      email = ?,
      primary_branch = ?,
      personal_banker = ?,
      wealth_advisor = ?
    WHERE account_number = ?
  `).run(
    customer.zip,
    customer.address,
    customer.phone,
    customer.email,
    customer.primaryBranch,
    customer.personalBanker,
    customer.wealthAdvisor,
    customer.accountNumber
  );

  return sanitizeCustomerForRole(getCustomerRecord(customer.accountNumber), role);
}

function getProfitability(accountNumber) {
  const row = db.prepare("SELECT * FROM customer_profitability WHERE account_number = ?").get(accountNumber);

  return {
    tier: row.tier,
    annualContribution: row.annual_contribution,
    mainDriver: row.main_driver,
    watchItem: row.watch_item
  };
}

function getCustomerAccounts(accountNumber) {
  return db.prepare("SELECT * FROM customer_accounts WHERE account_number = ? ORDER BY sort_order").all(accountNumber)
    .map((row) => ({
      type: row.product_type,
      account: row.product_account,
      status: row.status,
      openDate: row.open_date,
      balance: row.balance
    }));
}

function getLoans(accountNumber) {
  return db.prepare("SELECT * FROM loans WHERE account_number = ? ORDER BY sort_order").all(accountNumber)
    .map((row) => ({
      type: row.loan_type,
      balance: row.balance,
      status: row.status,
      paymentStatus: row.payment_status
    }));
}

function getHouseholdMembers(accountNumber) {
  return db.prepare("SELECT * FROM household_members WHERE account_number = ? ORDER BY sort_order").all(accountNumber)
    .map((row) => ({
      name: row.member_name,
      relationship: row.relationship,
      products: row.products
    }));
}

function getCustomerBusinessAccounts(accountNumber) {
  return db.prepare("SELECT * FROM customer_business_accounts WHERE account_number = ? ORDER BY sort_order").all(accountNumber)
    .map((row) => ({
      businessName: row.business_name,
      role: row.owner_role,
      products: row.products,
      relationshipValue: row.relationship_value
    }));
}

function getFraudHistory(accountNumber) {
  return db.prepare("SELECT * FROM fraud_history WHERE account_number = ? ORDER BY sort_order").all(accountNumber)
    .map((row) => ({
      type: row.fraud_type,
      count: row.event_count,
      impact: row.impact
    }));
}

function getFraudDrivers(accountNumber) {
  return db.prepare("SELECT driver FROM fraud_drivers WHERE account_number = ? ORDER BY sort_order").all(accountNumber)
    .map((row) => row.driver);
}

function getDiscoverNeeds(accountNumber) {
  return db.prepare("SELECT * FROM discover_needs WHERE account_number = ? ORDER BY sort_order").all(accountNumber)
    .map((row) => ({
      product: row.product,
      priority: row.priority,
      reason: row.reason,
      nextAction: row.next_action,
      status: row.status
    }));
}

function getNextBestAction(accountNumber) {
  const row = db.prepare("SELECT * FROM next_best_actions WHERE account_number = ?").get(accountNumber);

  return {
    title: row.title,
    priority: row.priority,
    reason: row.reason,
    banker: row.banker,
    due: row.due
  };
}

function getAlerts(accountNumber) {
  return db.prepare("SELECT * FROM customer_alerts WHERE account_number = ? ORDER BY sort_order").all(accountNumber)
    .map((row) => ({
      label: row.label,
      type: row.alert_type
    }));
}

function getNotes(accountNumber) {
  return db.prepare("SELECT * FROM customer_notes WHERE account_number = ? ORDER BY sort_order").all(accountNumber)
    .map((row) => ({
      dbId: row.id,
      author: row.author,
      date: row.note_date,
      text: row.note_text
    }));
}

function getFraudNotes(accountNumber) {
  return db.prepare("SELECT * FROM fraud_notes WHERE account_number = ? ORDER BY sort_order DESC").all(accountNumber)
    .map(mapFraudNote);
}

function createBankNote(note, author) {
  const sortOrder = getNextSortOrder("customer_notes", "account_number", note.accountNumber);
  const result = db.prepare(`
    INSERT INTO customer_notes (account_number, author, note_date, note_text, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(note.accountNumber, author || "Current User", getTodayLabel(), note.text, sortOrder);

  return mapBankNote(db.prepare("SELECT * FROM customer_notes WHERE id = ?").get(result.lastInsertRowid));
}

function findBankNoteById(noteId) {
  const row = db.prepare("SELECT * FROM customer_notes WHERE id = ?").get(noteId);
  return row ? mapBankNote(row) : null;
}

function updateBankNote(note) {
  db.prepare("UPDATE customer_notes SET note_text = ? WHERE id = ?").run(note.text, note.id);
  return findBankNoteById(note.id);
}

function deleteBankNote(noteId, author) {
  const row = db.prepare("SELECT id, author FROM customer_notes WHERE id = ?").get(noteId);

  if (!row || row.author !== author) {
    return false;
  }

  const result = db.prepare("DELETE FROM customer_notes WHERE id = ?").run(noteId);
  return result.changes > 0;
}

function mapBankNote(row) {
  return {
    dbId: row.id,
    accountNumber: row.account_number,
    author: row.author,
    date: row.note_date,
    text: row.note_text
  };
}

// Run the optional LLM classifier over a customer's active fraud notes.
// Returns an array of LLM-derived matches (possibly empty). Always safe: if the
// classifier is unavailable or errors, this resolves to [] and the caller falls
// back to keyword-only scoring. Notes are classified concurrently.
async function classifyCustomerFraudNotes(customer) {
  if (!llmClassifierAvailable(PROCESS_ENV)) {
    return [];
  }
  const notes = Array.isArray(customer && customer.fraudNotes) ? customer.fraudNotes : [];
  if (!notes.length) {
    return [];
  }
  const taxonomy = Array.isArray(FRAUD_TEXT_RULES) ? FRAUD_TEXT_RULES : [];

  try {
    const results = await Promise.all(notes.map(function classifyOne(note) {
      const text = note && (note.text || note.note || note.noteText || "");
      return classifyFraudNote(text, taxonomy, PROCESS_ENV).then(function tag(match) {
        if (!match) {
          return null;
        }
        return {
          ...match,
          sourceLabel: `AI review of Fraud Note by ${note.author || "Fraud Team"}`,
          sourceText: text
        };
      });
    }));
    return results.filter(Boolean);
  } catch (err) {
    return [];
  }
}

function createFraudNote(note, author) {
  const sortOrder = getNextSortOrder("fraud_notes", "account_number", note.accountNumber);
  const result = db.prepare(`
    INSERT INTO fraud_notes (account_number, author, note_date, note_text, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(note.accountNumber, author || "Fraud Team", getTodayLabel(), note.text, sortOrder);

  return mapFraudNote(db.prepare("SELECT * FROM fraud_notes WHERE id = ?").get(result.lastInsertRowid));
}

function findFraudNoteById(noteId) {
  const row = db.prepare("SELECT * FROM fraud_notes WHERE id = ?").get(noteId);
  return row ? mapFraudNote(row) : null;
}

function deleteFraudNote(noteId) {
  const result = db.prepare("DELETE FROM fraud_notes WHERE id = ?").run(noteId);
  return result.changes > 0;
}

function mapFraudNote(row) {
  return {
    dbId: row.id,
    accountNumber: row.account_number,
    author: row.author,
    date: row.note_date,
    text: row.note_text
  };
}

function getWealthProfile(accountNumber) {
  const row = db.prepare("SELECT * FROM wealth_profiles WHERE account_number = ?").get(accountNumber);

  if (!row) {
    return null;
  }

  return {
    accountNumber: row.account_number,
    riskTolerance: row.risk_tolerance,
    liquidityNeeds: row.liquidity_needs,
    timeHorizon: row.time_horizon,
    taxStatus: row.tax_status,
    otherInvestments: row.other_investments,
    investmentExperience: row.investment_experience,
    investmentObjectives: row.investment_objectives,
    concentrationConcerns: row.concentration_concerns,
    incomeNeeds: row.income_needs,
    lastMeetingDate: row.last_meeting_date,
    lastCallDate: row.last_call_date,
    nextMeetingDate: row.next_meeting_date,
    followUp: row.follow_up,
    accounts: getWealthAccounts(accountNumber),
    lifeEvents: getWealthLifeEvents(accountNumber),
    interactions: getWealthInteractions(accountNumber)
  };
}

function updateWealthProfile(profile) {
  db.prepare(`
    UPDATE wealth_profiles
    SET
      risk_tolerance = ?,
      liquidity_needs = ?,
      time_horizon = ?,
      tax_status = ?,
      other_investments = ?,
      investment_experience = ?,
      investment_objectives = ?,
      concentration_concerns = ?,
      income_needs = ?,
      last_meeting_date = ?,
      last_call_date = ?,
      next_meeting_date = ?,
      follow_up = ?
    WHERE account_number = ?
  `).run(
    profile.riskTolerance,
    profile.liquidityNeeds,
    profile.timeHorizon,
    profile.taxStatus,
    profile.otherInvestments,
    profile.investmentExperience,
    profile.investmentObjectives,
    profile.concentrationConcerns,
    profile.incomeNeeds,
    profile.lastMeetingDate,
    profile.lastCallDate,
    profile.nextMeetingDate,
    profile.followUp,
    profile.accountNumber
  );

  return getWealthProfile(profile.accountNumber);
}

function getWealthAccounts(accountNumber) {
  return db.prepare("SELECT * FROM wealth_accounts WHERE account_number = ? ORDER BY sort_order").all(accountNumber)
    .map((row) => ({
      id: row.id,
      group: row.account_group,
      name: row.account_name,
      accountId: row.account_id,
      balance: row.balance,
      status: row.status
    }));
}

function getWealthLifeEvents(accountNumber) {
  return db.prepare("SELECT * FROM wealth_life_events WHERE account_number = ? ORDER BY sort_order").all(accountNumber)
    .map((row) => ({
      dbId: row.id,
      title: row.event_title,
      date: row.event_date,
      alertDate: row.alert_date,
      note: row.note_text
    }));
}

function getWealthInteractions(accountNumber) {
  return db.prepare("SELECT * FROM wealth_interactions WHERE account_number = ? ORDER BY sort_order DESC, id DESC").all(accountNumber)
    .map(mapWealthInteraction);
}

function findWealthInteractionById(interactionId) {
  const row = db.prepare("SELECT * FROM wealth_interactions WHERE id = ?").get(interactionId);
  return row ? mapWealthInteraction(row) : null;
}

function createWealthInteraction(interaction, role) {
  const owner = getRoleOwner(role);
  const sortOrder = getNextSortOrder("wealth_interactions", "account_number", interaction.accountNumber);
  const result = db.prepare(`
    INSERT INTO wealth_interactions (account_number, interaction_type, interaction_date, owner, note_text, is_user_created, sort_order)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(
    interaction.accountNumber,
    interaction.type,
    interaction.date,
    owner,
    interaction.note,
    sortOrder
  );

  return findWealthInteractionById(result.lastInsertRowid);
}

function updateWealthInteraction(interaction, existingInteraction) {
  db.prepare(`
    UPDATE wealth_interactions
    SET interaction_type = ?, interaction_date = ?, owner = ?, note_text = ?
    WHERE id = ?
  `).run(
    interaction.type,
    interaction.date,
    existingInteraction.owner,
    interaction.note,
    interaction.id
  );

  return findWealthInteractionById(interaction.id);
}

function deleteWealthInteraction(interactionId) {
  const row = db.prepare("SELECT id, is_user_created FROM wealth_interactions WHERE id = ?").get(interactionId);

  if (!row || !row.is_user_created) {
    return false;
  }

  const result = db.prepare("DELETE FROM wealth_interactions WHERE id = ?").run(interactionId);
  return result.changes > 0;
}

function mapWealthInteraction(row) {
  return {
    dbId: row.id,
    accountNumber: row.account_number,
    type: row.interaction_type,
    date: row.interaction_date,
    owner: row.owner,
    note: row.note_text,
    userCreated: Boolean(row.is_user_created)
  };
}

function getLendingProfile(accountNumber) {
  const row = db.prepare("SELECT * FROM lending_profiles WHERE account_number = ?").get(accountNumber);

  if (!row) {
    return null;
  }

  return {
    accountNumber: row.account_number,
    loanStatus: row.loan_status,
    interestRate: row.interest_rate,
    monthlyPayment: row.monthly_payment,
    yearlyPayment: row.yearly_payment,
    monthlyIncome: row.monthly_income,
    pmiStatus: row.pmi_status,
    pmiRecommendation: row.pmi_recommendation,
    homeEquity: row.home_equity,
    helocStatus: row.heloc_status,
    billAmountOwed: row.bill_amount_owed,
    pastDueAmount: row.past_due_amount,
    maturityDate: row.maturity_date,
    closingStatus: row.closing_status,
    splitPaymentStructure: row.split_payment_structure,
    creditScore: row.credit_score,
    availableLoanProducts: row.available_loan_products,
    documents: getLendingDocuments(accountNumber),
    contactHistory: getLendingContactHistory(accountNumber)
  };
}

function updateLendingProfile(profile) {
  db.prepare(`
    UPDATE lending_profiles
    SET
      loan_status = ?,
      interest_rate = ?,
      monthly_payment = ?,
      yearly_payment = ?,
      monthly_income = ?,
      pmi_status = ?,
      pmi_recommendation = ?,
      home_equity = ?,
      heloc_status = ?,
      bill_amount_owed = ?,
      past_due_amount = ?,
      maturity_date = ?,
      closing_status = ?,
      split_payment_structure = ?,
      credit_score = ?,
      available_loan_products = ?
    WHERE account_number = ?
  `).run(
    profile.loanStatus,
    profile.interestRate,
    profile.monthlyPayment,
    profile.yearlyPayment,
    profile.monthlyIncome,
    profile.pmiStatus,
    profile.pmiRecommendation,
    profile.homeEquity,
    profile.helocStatus,
    profile.billAmountOwed,
    profile.pastDueAmount,
    profile.maturityDate,
    profile.closingStatus,
    profile.splitPaymentStructure,
    profile.creditScore,
    profile.availableLoanProducts,
    profile.accountNumber
  );

  return getLendingProfile(profile.accountNumber);
}

function getLendingDocuments(accountNumber) {
  return db.prepare("SELECT * FROM lending_documents WHERE account_number = ? ORDER BY sort_order").all(accountNumber)
    .map(mapLendingDocument);
}

function findLendingDocumentById(documentId) {
  const row = db.prepare("SELECT * FROM lending_documents WHERE id = ?").get(documentId);
  return row ? mapLendingDocument(row) : null;
}

function updateLendingDocument(document) {
  db.prepare("UPDATE lending_documents SET document_status = ?, last_updated = ? WHERE id = ?")
    .run(document.status, document.lastUpdated, document.id);

  return findLendingDocumentById(document.id);
}

function mapLendingDocument(row) {
  return {
    dbId: row.id,
    accountNumber: row.account_number,
    name: row.document_name,
    status: row.document_status,
    lastUpdated: row.last_updated
  };
}

function getLendingContactHistory(accountNumber) {
  return db.prepare("SELECT * FROM lending_contact_history WHERE account_number = ? ORDER BY sort_order DESC, id DESC").all(accountNumber)
    .map(mapLendingContact);
}

function findLendingContactById(contactId) {
  const row = db.prepare("SELECT * FROM lending_contact_history WHERE id = ?").get(contactId);
  return row ? mapLendingContact(row) : null;
}

function createLendingContact(contact, role) {
  const owner = getRoleOwner(role);
  const sortOrder = getNextSortOrder("lending_contact_history", "account_number", contact.accountNumber);
  const result = db.prepare(`
    INSERT INTO lending_contact_history (account_number, contact_type, contact_date, contact_value, owner, note_text, is_user_created, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    contact.accountNumber,
    contact.type,
    contact.date,
    contact.value,
    owner,
    contact.note,
    sortOrder
  );

  return findLendingContactById(result.lastInsertRowid);
}

function updateLendingContact(contact, existingContact) {
  db.prepare(`
    UPDATE lending_contact_history
    SET contact_type = ?, contact_date = ?, contact_value = ?, owner = ?, note_text = ?
    WHERE id = ?
  `).run(
    contact.type,
    contact.date,
    contact.value,
    existingContact.owner,
    contact.note,
    contact.id
  );

  return findLendingContactById(contact.id);
}

function deleteLendingContact(contactId) {
  const row = db.prepare("SELECT id, is_user_created FROM lending_contact_history WHERE id = ?").get(contactId);

  if (!row || !row.is_user_created) {
    return false;
  }

  const result = db.prepare("DELETE FROM lending_contact_history WHERE id = ?").run(contactId);
  return result.changes > 0;
}

function mapLendingContact(row) {
  return {
    dbId: row.id,
    accountNumber: row.account_number,
    type: row.contact_type,
    date: row.contact_date,
    value: row.contact_value,
    owner: row.owner,
    note: row.note_text,
    userCreated: Boolean(row.is_user_created)
  };
}

function getEmployees() {
  return db.prepare("SELECT * FROM employees ORDER BY employee_id").all().map(mapEmployee);
}

function findEmployee(type, value) {
  const normalizedValue = normalizeValue(value);
  const lookup = getEmployeeLookup(type, normalizedValue);

  if (!lookup) {
    return null;
  }

  const row = db.prepare(lookup.sql).get(...lookup.params);
  return row ? mapEmployee(row) : null;
}

function mapEmployee(row) {
  return {
    employeeId: row.employee_id,
    name: row.name,
    email: row.email,
    department: row.department,
    role: row.employee_role,
    branch: row.branch,
    manager: row.manager,
    accessLevel: row.access_level,
    status: row.status,
    hireDate: row.hire_date,
    trainingStatus: row.training_status,
    disclosures: row.disclosures,
    linkedBusinessId: row.linked_business_id
  };
}

function updateEmployee(employee) {
  db.prepare(`
    UPDATE employees
    SET
      name = ?,
      email = ?,
      department = ?,
      employee_role = ?,
      branch = ?,
      manager = ?,
      access_level = ?,
      status = ?,
      training_status = ?,
      disclosures = ?
    WHERE employee_id = ?
  `).run(
    employee.name,
    employee.email,
    employee.department,
    employee.role,
    employee.branch,
    employee.manager,
    employee.accessLevel,
    employee.status,
    employee.trainingStatus,
    employee.disclosures,
    employee.employeeId
  );

  return findEmployee("employeeId", employee.employeeId);
}

function getBusinessRecords() {
  return db.prepare("SELECT * FROM business_records ORDER BY business_id").all().map(mapBusiness);
}

function findBusiness(type, value) {
  const normalizedValue = normalizeValue(value);
  const lookup = getBusinessLookup(type, normalizedValue);

  if (!lookup) {
    return null;
  }

  const row = db.prepare(lookup.sql).get(...lookup.params);
  return row ? mapBusiness(row) : null;
}

function mapBusiness(row) {
  return {
    businessId: row.business_id,
    businessName: row.business_name,
    ownerName: row.owner_name,
    ownerType: row.owner_type,
    linkedAccountNumber: row.linked_account_number,
    linkedEmployeeId: row.linked_employee_id,
    products: row.products,
    relationshipValue: row.relationship_value,
    status: row.status,
    banker: row.banker,
    lendingOpportunity: row.lending_opportunity
  };
}

function updateBusiness(business, role) {
  db.prepare(`
    UPDATE business_records
    SET
      business_name = ?,
      owner_name = ?,
      owner_type = ?,
      products = ?,
      relationship_value = ?,
      status = ?,
      banker = ?,
      lending_opportunity = ?
    WHERE business_id = ?
  `).run(
    business.businessName,
    business.ownerName,
    business.ownerType,
    business.products,
    business.relationshipValue,
    business.status,
    business.banker,
    business.lendingOpportunity,
    business.businessId
  );

  return sanitizeBusinessForRole(findBusiness("businessId", business.businessId), role);
}

function getLeads() {
  return db.prepare("SELECT * FROM leads ORDER BY id").all().map(mapLead);
}

function getLeadsForRole(role) {
  if (!hasPermission(role, "view_leads")) {
    return [];
  }

  if (hasPermission(role, "view_all_leads")) {
    return getLeads();
  }

  return getLeads().filter((lead) => lead.visibleTo.includes(role));
}

function canAccessLead(auth, lead) {
  if (!lead || !hasPermission(auth, "view_leads")) {
    return false;
  }

  return hasPermission(auth, "view_all_leads") || lead.visibleTo.includes(getAuthRole(auth));
}

function createLead(lead, customer, role) {
  const visibleTo = getLeadVisibility(lead.type);
  const title = lead.title || `${lead.type === "BL" ? "Business loan" : "Personal loan"} conversation`;
  const reason = lead.reason || `${customer.name} lead entered by ${role}.`;

  const result = db.prepare(`
    INSERT INTO leads (lead_type, title, account_number, amount, priority, status, reason, visible_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    lead.type,
    title,
    lead.accountNumber,
    lead.amount,
    lead.priority,
    "New lead",
    reason,
    JSON.stringify(visibleTo)
  );

  return mapLead(db.prepare("SELECT * FROM leads WHERE id = ?").get(result.lastInsertRowid));
}

function findLeadById(leadId) {
  const row = db.prepare("SELECT * FROM leads WHERE id = ?").get(leadId);
  return row ? mapLead(row) : null;
}

function updateLead(lead, customer) {
  const title = lead.title || `${lead.type === "BL" ? "Business loan" : "Personal loan"} conversation for ${customer.name}`;
  const visibleTo = getLeadVisibility(lead.type);

  db.prepare(`
    UPDATE leads
    SET
      lead_type = ?,
      title = ?,
      account_number = ?,
      amount = ?,
      priority = ?,
      status = ?,
      reason = ?,
      visible_to = ?
    WHERE id = ?
  `).run(
    lead.type,
    title,
    lead.accountNumber,
    lead.amount,
    lead.priority,
    lead.status,
    lead.reason,
    JSON.stringify(visibleTo),
    lead.id
  );

  return findLeadById(lead.id);
}

function deleteLead(leadId) {
  const row = db.prepare("SELECT id, status FROM leads WHERE id = ?").get(leadId);

  if (!row || row.status !== "New lead") {
    return false;
  }

  const result = db.prepare("DELETE FROM leads WHERE id = ?").run(leadId);
  return result.changes > 0;
}

function mapLead(row) {
  return {
    id: `LD${row.id}`,
    dbId: row.id,
    type: row.lead_type,
    title: row.title,
    accountNumber: row.account_number,
    amount: row.amount,
    priority: row.priority,
    status: row.status,
    reason: row.reason,
    visibleTo: JSON.parse(row.visible_to)
  };
}

function getLeadVisibility(type) {
  return type === "BL"
    ? ["admin", "banker", "loans", "marketing"]
    : ["admin", "banker", "loans"];
}

function validateLeadPayload(payload) {
  const fieldErrors = {};
  const leadType = String(payload?.type || "").trim().toUpperCase();
  const accountNumber = String(payload?.accountNumber || "").trim();
  const amount = Number(payload?.amount);
  const priority = String(payload?.priority || "").trim();
  const reason = String(payload?.reason || "").trim();

  if (!accountNumber) {
    fieldErrors.accountNumber = "Account number is required.";
  }

  if (!["PL", "BL"].includes(leadType)) {
    fieldErrors.type = "Choose personal loan or business loan.";
  }

  if (!Number.isFinite(amount)) {
    fieldErrors.amount = "Amount must be a number.";
  } else if (amount < 1000) {
    fieldErrors.amount = "Amount must be at least $1,000.";
  } else if (amount > 5000000) {
    fieldErrors.amount = "Amount cannot be above $5,000,000.";
  }

  if (!["High", "Medium", "Low"].includes(priority)) {
    fieldErrors.priority = "Choose a priority.";
  }

  if (reason.length > 500) {
    fieldErrors.reason = "Notes must be 500 characters or fewer.";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    lead: {
      type: leadType,
      title: String(payload?.title || "").trim(),
      accountNumber,
      amount: Math.round(amount),
      priority,
      reason
    }
  };
}

function validateLeadUpdatePayload(payload) {
  const validation = validateLeadPayload(payload);
  const id = parseRecordId(payload?.id || payload?.dbId);
  const status = String(payload?.status || "").trim();
  const title = String(payload?.title || "").trim();

  if (!id) {
    validation.fieldErrors.id = "A valid lead id is required.";
  }

  if (!title) {
    validation.fieldErrors.title = "Lead title is required.";
  } else if (title.length > 120) {
    validation.fieldErrors.title = "Lead title must be 120 characters or fewer.";
  }

  if (!status) {
    validation.fieldErrors.status = "Lead status is required.";
  } else if (status.length > 80) {
    validation.fieldErrors.status = "Lead status must be 80 characters or fewer.";
  }

  return {
    valid: validation.valid && Object.keys(validation.fieldErrors).length === 0,
    fieldErrors: validation.fieldErrors,
    lead: {
      ...validation.lead,
      id,
      title,
      status
    }
  };
}

function validateNotePayload(payload) {
  const fieldErrors = {};
  const accountNumber = String(payload?.accountNumber || "").trim();
  const text = String(payload?.text || "").trim();

  if (!accountNumber) {
    fieldErrors.accountNumber = "Account number is required.";
  }

  if (!text) {
    fieldErrors.text = "Bank note text is required.";
  } else if (text.length > 500) {
    fieldErrors.text = "Bank notes must be 500 characters or fewer.";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    note: {
      accountNumber,
      text
    }
  };
}

function validateNoteUpdatePayload(payload) {
  const fieldErrors = {};
  const id = parseRecordId(payload?.id || payload?.dbId);
  const text = String(payload?.text || "").trim();

  if (!id) {
    fieldErrors.id = "A valid note id is required.";
  }

  if (!text) {
    fieldErrors.text = "Bank note text is required.";
  } else if (text.length > 500) {
    fieldErrors.text = "Bank notes must be 500 characters or fewer.";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    note: {
      id,
      text
    }
  };
}

function validateFraudNotePayload(payload) {
  const fieldErrors = {};
  const accountNumber = String(payload?.accountNumber || "").trim();
  const text = String(payload?.text || "").trim();

  if (!accountNumber) {
    fieldErrors.accountNumber = "Account number is required.";
  }

  if (!text) {
    fieldErrors.text = "Fraud note text is required.";
  } else if (text.length > 500) {
    fieldErrors.text = "Fraud notes must be 500 characters or fewer.";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    note: {
      accountNumber,
      text
    }
  };
}

function validateMeetingPayload(payload) {
  const fieldErrors = {};
  const accountNumber = String(payload?.accountNumber || "").trim();
  const title = String(payload?.title || "").trim();
  const date = String(payload?.date || "").trim();

  if (!accountNumber) {
    fieldErrors.accountNumber = "Account number is required.";
  }

  if (!title) {
    fieldErrors.title = "Meeting title is required.";
  } else if (title.length > 90) {
    fieldErrors.title = "Meeting title must be 90 characters or fewer.";
  }

  if (!date) {
    fieldErrors.date = "Meeting date is required.";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    meeting: {
      accountNumber,
      title,
      date
    }
  };
}

function validateMeetingUpdatePayload(payload) {
  const validation = validateMeetingPayload(payload);
  const id = parseRecordId(payload?.id || payload?.dbId);

  if (!id) {
    validation.fieldErrors.id = "A valid meeting id is required.";
  }

  return {
    valid: validation.valid && Object.keys(validation.fieldErrors).length === 0,
    fieldErrors: validation.fieldErrors,
    meeting: {
      ...validation.meeting,
      id
    }
  };
}

function validateCustomerUpdatePayload(payload) {
  const fieldErrors = {};
  const customer = {
    accountNumber: String(payload?.accountNumber || "").trim(),
    zip: String(payload?.zip || "").trim(),
    address: String(payload?.address || "").trim(),
    phone: String(payload?.phone || "").trim(),
    email: String(payload?.email || "").trim(),
    primaryBranch: String(payload?.primaryBranch || "").trim(),
    personalBanker: String(payload?.personalBanker || "").trim(),
    wealthAdvisor: String(payload?.wealthAdvisor || "").trim()
  };

  requireTextField(fieldErrors, customer.accountNumber, "accountNumber", "Account number", 32);
  requireTextField(fieldErrors, customer.zip, "zip", "ZIP", 10);
  requireTextField(fieldErrors, customer.address, "address", "Address", 140);
  requireTextField(fieldErrors, customer.phone, "phone", "Phone", 24);
  requireTextField(fieldErrors, customer.primaryBranch, "primaryBranch", "Primary branch", 80);
  requireTextField(fieldErrors, customer.personalBanker, "personalBanker", "Personal banker", 80);
  requireTextField(fieldErrors, customer.wealthAdvisor, "wealthAdvisor", "Wealth advisor", 80);

  if (!customer.email) {
    fieldErrors.email = "Email is required.";
  } else if (!customer.email.includes("@") || customer.email.length > 120) {
    fieldErrors.email = "Use a valid email address.";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    customer
  };
}

function validateOfferUpdatePayload(payload) {
  const fieldErrors = {};
  const offer = {
    id: parseRecordId(payload?.id || payload?.dbId),
    type: String(payload?.type || "").trim().toUpperCase(),
    title: String(payload?.title || "").trim(),
    audience: String(payload?.audience || "").trim(),
    priority: String(payload?.priority || "").trim(),
    status: String(payload?.status || "").trim(),
    reason: String(payload?.reason || "").trim()
  };

  if (!offer.id) {
    fieldErrors.id = "A valid offer id is required.";
  }

  if (!["PL", "BL"].includes(offer.type)) {
    fieldErrors.type = "Choose personal loan or business loan.";
  }

  requireTextField(fieldErrors, offer.title, "title", "Offer title", 120);
  requireTextField(fieldErrors, offer.audience, "audience", "Audience", 80);

  if (!["High", "Medium", "Low"].includes(offer.priority)) {
    fieldErrors.priority = "Choose a priority.";
  }

  requireTextField(fieldErrors, offer.status, "status", "Status", 80);
  requireTextField(fieldErrors, offer.reason, "reason", "Offer notes", 500);

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    offer
  };
}

function validateBusinessUpdatePayload(payload) {
  const fieldErrors = {};
  const relationshipValue = Number(payload?.relationshipValue);
  const business = {
    businessId: String(payload?.businessId || "").trim(),
    businessName: String(payload?.businessName || "").trim(),
    ownerName: String(payload?.ownerName || "").trim(),
    ownerType: String(payload?.ownerType || "").trim(),
    products: String(payload?.products || "").trim(),
    relationshipValue: Math.round(relationshipValue),
    status: String(payload?.status || "").trim(),
    banker: String(payload?.banker || "").trim(),
    lendingOpportunity: String(payload?.lendingOpportunity || "").trim()
  };

  requireTextField(fieldErrors, business.businessId, "businessId", "Business ID", 32);
  requireTextField(fieldErrors, business.businessName, "businessName", "Business name", 120);
  requireTextField(fieldErrors, business.ownerName, "ownerName", "Owner", 120);
  requireTextField(fieldErrors, business.ownerType, "ownerType", "Owner type", 40);
  requireTextField(fieldErrors, business.products, "products", "Products", 180);
  requireTextField(fieldErrors, business.status, "status", "Status", 90);
  requireTextField(fieldErrors, business.banker, "banker", "Banker", 80);
  requireTextField(fieldErrors, business.lendingOpportunity, "lendingOpportunity", "Lending opportunity", 180);

  if (!Number.isFinite(relationshipValue) || relationshipValue < 0) {
    fieldErrors.relationshipValue = "Relationship value must be a positive number.";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    business
  };
}

function validateEmployeeUpdatePayload(payload) {
  const fieldErrors = {};
  const employee = {
    employeeId: String(payload?.employeeId || "").trim(),
    name: String(payload?.name || "").trim(),
    email: String(payload?.email || "").trim(),
    department: String(payload?.department || "").trim(),
    role: String(payload?.role || "").trim(),
    branch: String(payload?.branch || "").trim(),
    manager: String(payload?.manager || "").trim(),
    accessLevel: String(payload?.accessLevel || "").trim(),
    status: String(payload?.status || "").trim(),
    trainingStatus: String(payload?.trainingStatus || "").trim(),
    disclosures: String(payload?.disclosures || "").trim()
  };

  requireTextField(fieldErrors, employee.employeeId, "employeeId", "Employee ID", 32);
  requireTextField(fieldErrors, employee.name, "name", "Employee name", 120);
  requireTextField(fieldErrors, employee.department, "department", "Department", 80);
  requireTextField(fieldErrors, employee.role, "role", "Role", 80);
  requireTextField(fieldErrors, employee.branch, "branch", "Branch", 80);
  requireTextField(fieldErrors, employee.manager, "manager", "Manager", 80);
  requireTextField(fieldErrors, employee.accessLevel, "accessLevel", "Access level", 180);
  requireTextField(fieldErrors, employee.status, "status", "Status", 60);
  requireTextField(fieldErrors, employee.trainingStatus, "trainingStatus", "Training status", 120);
  requireTextField(fieldErrors, employee.disclosures, "disclosures", "Disclosures", 180);

  if (!employee.email) {
    fieldErrors.email = "Email is required.";
  } else if (!employee.email.includes("@") || employee.email.length > 120) {
    fieldErrors.email = "Use a valid email address.";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    employee
  };
}

function validateWealthProfilePayload(payload) {
  const fieldErrors = {};
  const profile = {
    accountNumber: String(payload?.accountNumber || "").trim(),
    riskTolerance: String(payload?.riskTolerance || "").trim(),
    liquidityNeeds: String(payload?.liquidityNeeds || "").trim(),
    timeHorizon: String(payload?.timeHorizon || "").trim(),
    taxStatus: String(payload?.taxStatus || "").trim(),
    otherInvestments: String(payload?.otherInvestments || "").trim(),
    investmentExperience: String(payload?.investmentExperience || "").trim(),
    investmentObjectives: String(payload?.investmentObjectives || "").trim(),
    concentrationConcerns: String(payload?.concentrationConcerns || "").trim(),
    incomeNeeds: String(payload?.incomeNeeds || "").trim(),
    lastMeetingDate: String(payload?.lastMeetingDate || "").trim(),
    lastCallDate: String(payload?.lastCallDate || "").trim(),
    nextMeetingDate: String(payload?.nextMeetingDate || "").trim(),
    followUp: String(payload?.followUp || "").trim()
  };

  requireTextField(fieldErrors, profile.accountNumber, "accountNumber", "Account number", 32);
  requireTextField(fieldErrors, profile.riskTolerance, "riskTolerance", "Risk tolerance", 80);
  requireTextField(fieldErrors, profile.liquidityNeeds, "liquidityNeeds", "Liquidity needs", 240);
  requireTextField(fieldErrors, profile.timeHorizon, "timeHorizon", "Time horizon", 80);
  requireTextField(fieldErrors, profile.taxStatus, "taxStatus", "Tax status", 160);
  requireTextField(fieldErrors, profile.otherInvestments, "otherInvestments", "Other investments", 220);
  requireTextField(fieldErrors, profile.investmentExperience, "investmentExperience", "Investment experience", 80);
  requireTextField(fieldErrors, profile.investmentObjectives, "investmentObjectives", "Investment objectives", 240);
  requireTextField(fieldErrors, profile.concentrationConcerns, "concentrationConcerns", "Concentration concerns", 220);
  requireTextField(fieldErrors, profile.incomeNeeds, "incomeNeeds", "Income needs", 180);
  requireTextField(fieldErrors, profile.lastMeetingDate, "lastMeetingDate", "Last meeting date", 24);
  requireTextField(fieldErrors, profile.lastCallDate, "lastCallDate", "Last call date", 24);
  requireTextField(fieldErrors, profile.nextMeetingDate, "nextMeetingDate", "Next meeting date", 24);
  requireTextField(fieldErrors, profile.followUp, "followUp", "Follow-up", 240);

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    profile
  };
}

function validateWealthInteractionPayload(payload) {
  const fieldErrors = {};
  const interaction = {
    accountNumber: String(payload?.accountNumber || "").trim(),
    type: String(payload?.type || "").trim(),
    date: String(payload?.date || "").trim(),
    note: String(payload?.note || "").trim()
  };

  requireTextField(fieldErrors, interaction.accountNumber, "accountNumber", "Account number", 32);

  if (!["Meeting", "Call", "Follow-up", "Life event"].includes(interaction.type)) {
    fieldErrors.type = "Choose a wealth interaction type.";
  }

  requireTextField(fieldErrors, interaction.date, "date", "Date", 24);
  requireTextField(fieldErrors, interaction.note, "note", "Interaction note", 500);

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    interaction
  };
}

function validateWealthInteractionUpdatePayload(payload) {
  const validation = validateWealthInteractionPayload(payload);
  const id = parseRecordId(payload?.id || payload?.dbId);

  if (!id) {
    validation.fieldErrors.id = "A valid interaction id is required.";
  }

  return {
    valid: validation.valid && Object.keys(validation.fieldErrors).length === 0,
    fieldErrors: validation.fieldErrors,
    interaction: {
      ...validation.interaction,
      id
    }
  };
}

function validateLendingProfilePayload(payload) {
  const fieldErrors = {};
  const profile = {
    accountNumber: String(payload?.accountNumber || "").trim(),
    loanStatus: String(payload?.loanStatus || "").trim(),
    interestRate: String(payload?.interestRate || "").trim(),
    monthlyPayment: Math.round(Number(payload?.monthlyPayment)),
    yearlyPayment: Math.round(Number(payload?.yearlyPayment)),
    monthlyIncome: Math.round(Number(payload?.monthlyIncome)),
    pmiStatus: String(payload?.pmiStatus || "").trim(),
    pmiRecommendation: String(payload?.pmiRecommendation || "").trim(),
    homeEquity: Math.round(Number(payload?.homeEquity)),
    helocStatus: String(payload?.helocStatus || "").trim(),
    billAmountOwed: Math.round(Number(payload?.billAmountOwed)),
    pastDueAmount: Math.round(Number(payload?.pastDueAmount)),
    maturityDate: String(payload?.maturityDate || "").trim(),
    closingStatus: String(payload?.closingStatus || "").trim(),
    splitPaymentStructure: String(payload?.splitPaymentStructure || "").trim(),
    creditScore: Math.round(Number(payload?.creditScore)),
    availableLoanProducts: String(payload?.availableLoanProducts || "").trim()
  };

  requireTextField(fieldErrors, profile.accountNumber, "accountNumber", "Account number", 32);
  requireTextField(fieldErrors, profile.loanStatus, "loanStatus", "Loan status", 90);
  requireTextField(fieldErrors, profile.interestRate, "interestRate", "Interest rate", 24);
  requireTextField(fieldErrors, profile.pmiStatus, "pmiStatus", "PMI status", 90);
  requireTextField(fieldErrors, profile.pmiRecommendation, "pmiRecommendation", "PMI recommendation", 240);
  requireTextField(fieldErrors, profile.helocStatus, "helocStatus", "HELOC status", 140);
  requireTextField(fieldErrors, profile.maturityDate, "maturityDate", "Maturity date", 24);
  requireTextField(fieldErrors, profile.closingStatus, "closingStatus", "Closing status", 90);
  requireTextField(fieldErrors, profile.splitPaymentStructure, "splitPaymentStructure", "Split payment structure", 180);
  requireTextField(fieldErrors, profile.availableLoanProducts, "availableLoanProducts", "Available loan products", 220);

  validateMoneyField(fieldErrors, profile.monthlyPayment, "monthlyPayment", "Monthly payment");
  validateMoneyField(fieldErrors, profile.yearlyPayment, "yearlyPayment", "Yearly payment");
  validateMoneyField(fieldErrors, profile.monthlyIncome, "monthlyIncome", "Monthly income");
  validateMoneyField(fieldErrors, profile.homeEquity, "homeEquity", "Home equity");
  validateMoneyField(fieldErrors, profile.billAmountOwed, "billAmountOwed", "Bill amount owed");
  validateMoneyField(fieldErrors, profile.pastDueAmount, "pastDueAmount", "Past due amount");

  if (!Number.isFinite(profile.creditScore) || profile.creditScore < 300 || profile.creditScore > 850) {
    fieldErrors.creditScore = "Credit score must be between 300 and 850.";
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    profile
  };
}

function validateLendingDocumentPayload(payload) {
  const fieldErrors = {};
  const document = {
    id: parseRecordId(payload?.id || payload?.dbId),
    status: String(payload?.status || "").trim(),
    lastUpdated: String(payload?.lastUpdated || "").trim()
  };

  if (!document.id) {
    fieldErrors.id = "A valid document id is required.";
  }

  requireTextField(fieldErrors, document.status, "status", "Document status", 90);
  requireTextField(fieldErrors, document.lastUpdated, "lastUpdated", "Last updated", 24);

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    document
  };
}

function validateLendingContactPayload(payload) {
  const fieldErrors = {};
  const contact = {
    accountNumber: String(payload?.accountNumber || "").trim(),
    type: String(payload?.type || "").trim(),
    date: String(payload?.date || "").trim(),
    value: String(payload?.value || "").trim(),
    note: String(payload?.note || "").trim()
  };

  requireTextField(fieldErrors, contact.accountNumber, "accountNumber", "Account number", 32);

  if (!["Phone", "Email", "Meeting", "Document"].includes(contact.type)) {
    fieldErrors.type = "Choose a lending contact type.";
  }

  requireTextField(fieldErrors, contact.date, "date", "Date", 24);
  requireTextField(fieldErrors, contact.value, "value", "Phone/email/contact value", 140);
  requireTextField(fieldErrors, contact.note, "note", "Contact note", 500);

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    contact
  };
}

function validateLendingContactUpdatePayload(payload) {
  const validation = validateLendingContactPayload(payload);
  const id = parseRecordId(payload?.id || payload?.dbId);

  if (!id) {
    validation.fieldErrors.id = "A valid contact note id is required.";
  }

  return {
    valid: validation.valid && Object.keys(validation.fieldErrors).length === 0,
    fieldErrors: validation.fieldErrors,
    contact: {
      ...validation.contact,
      id
    }
  };
}

function parseRecordId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

function requireTextField(fieldErrors, value, field, label, maxLength) {
  if (!value) {
    fieldErrors[field] = `${label} is required.`;
  } else if (value.length > maxLength) {
    fieldErrors[field] = `${label} must be ${maxLength} characters or fewer.`;
  }
}

function validateMoneyField(fieldErrors, value, field, label) {
  if (!Number.isFinite(value) || value < 0) {
    fieldErrors[field] = `${label} must be a positive number.`;
  }
}

function getOffers() {
  return db.prepare("SELECT * FROM offers ORDER BY id").all().map(mapOffer);
}

function findOfferById(offerId) {
  const row = db.prepare("SELECT * FROM offers WHERE id = ?").get(offerId);
  return row ? mapOffer(row) : null;
}

function mapOffer(row) {
  return {
    id: `OD${row.id}`,
    dbId: row.id,
    type: row.offer_type,
    title: row.title,
    audience: row.audience,
    priority: row.priority,
    status: row.status,
    reason: row.reason,
    visibleTo: JSON.parse(row.visible_to)
  };
}

function getOffersForRole(role) {
  if (!hasPermission(role, "view_offers")) {
    return [];
  }

  if (hasPermission(role, "view_all_offers")) {
    return getOffers();
  }

  return getOffers().filter((offer) => offer.visibleTo.includes(role));
}

function updateOffer(offer) {
  db.prepare(`
    UPDATE offers
    SET
      offer_type = ?,
      title = ?,
      audience = ?,
      priority = ?,
      status = ?,
      reason = ?
    WHERE id = ?
  `).run(
    offer.type,
    offer.title,
    offer.audience,
    offer.priority,
    offer.status,
    offer.reason,
    offer.id
  );

  return findOfferById(offer.id);
}

function canAccessOffer(auth, offer) {
  if (!offer || !hasPermission(auth, "view_offers")) {
    return false;
  }

  return hasPermission(auth, "view_all_offers") || offer.visibleTo.includes(getAuthRole(auth));
}

function getMeetings() {
  return db.prepare("SELECT * FROM meetings ORDER BY id").all().map(mapMeeting);
}

function findMeetingById(meetingId) {
  const row = db.prepare("SELECT * FROM meetings WHERE id = ?").get(meetingId);
  return row ? mapMeeting(row) : null;
}

function mapMeeting(row) {
  return {
    id: `MD${row.id}`,
    dbId: row.id,
    title: row.title,
    accountNumber: row.account_number,
    client: row.client,
    date: row.meeting_date,
    owner: row.owner,
    visibleTo: JSON.parse(row.visible_to),
    userCreated: Boolean(row.is_user_created)
  };
}

function getMeetingsForRole(role) {
  if (!hasPermission(role, "view_meetings")) {
    return [];
  }

  if (hasPermission(role, "view_all_meetings")) {
    return getMeetings();
  }

  if (role === "wealth") {
    return getMeetings().filter((meeting) => {
      const customer = findCustomer("accountNumber", meeting.accountNumber);
      return customer && isWealthCustomer(customer);
    });
  }

  return getMeetings().filter((meeting) => meeting.visibleTo.includes(role));
}

function canAccessMeeting(auth, meeting) {
  if (!meeting || !hasPermission(auth, "view_meetings")) {
    return false;
  }

  if (hasPermission(auth, "view_all_meetings")) {
    return true;
  }

  const role = getAuthRole(auth);
  if (role === "wealth") {
    const customer = findCustomer("accountNumber", meeting.accountNumber);
    return Boolean(customer && isWealthCustomer(customer));
  }

  return meeting.visibleTo.includes(role);
}

function createMeeting(meeting, customer, role) {
  const visibleTo = getMeetingVisibility(customer);
  const owner = getRoleOwner(role);
  const result = db.prepare(`
    INSERT INTO meetings (title, account_number, client, meeting_date, owner, visible_to, is_user_created)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(
    meeting.title,
    meeting.accountNumber,
    customer.name,
    meeting.date,
    owner,
    JSON.stringify(visibleTo)
  );

  return mapMeeting(db.prepare("SELECT * FROM meetings WHERE id = ?").get(result.lastInsertRowid));
}

function updateMeeting(meeting, customer, existingMeeting) {
  const visibleTo = getMeetingVisibility(customer);

  db.prepare(`
    UPDATE meetings
    SET
      title = ?,
      account_number = ?,
      client = ?,
      meeting_date = ?,
      owner = ?,
      visible_to = ?
    WHERE id = ?
  `).run(
    meeting.title,
    meeting.accountNumber,
    customer.name,
    meeting.date,
    existingMeeting.owner,
    JSON.stringify(visibleTo),
    meeting.id
  );

  return findMeetingById(meeting.id);
}

function deleteMeeting(meetingId) {
  const row = db.prepare("SELECT id, is_user_created FROM meetings WHERE id = ?").get(meetingId);

  if (!row || !row.is_user_created) {
    return false;
  }

  const result = db.prepare("DELETE FROM meetings WHERE id = ?").run(meetingId);
  return result.changes > 0;
}

function getMeetingVisibility(customer) {
  const visibleTo = ["admin", "banker", "loans"];

  if (isWealthCustomer(customer)) {
    visibleTo.push("wealth");
  }

  return visibleTo;
}

function getRoleOwner(role) {
  if (role && !AUTHENTICATED_ROLES.includes(role)) {
    return role;
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

function getSessionDisplayName(session) {
  return session?.user?.username || session?.user?.name || getRoleOwner(session?.user?.role);
}

function getTodayLabel() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${month}/${day}/${today.getFullYear()}`;
}

function getCustomerLookup(type, normalizedValue) {
  const lookups = {
    accountNumber: {
      sql: "SELECT account_number FROM customers WHERE lower(account_number) = lower(?)",
      params: [normalizedValue]
    },
    name: {
      sql: "SELECT account_number FROM customers WHERE lower(name) LIKE ? ORDER BY name LIMIT 1",
      params: [`%${normalizedValue}%`]
    },
    ssn: {
      sql: "SELECT account_number FROM customers WHERE lower(ssn) = lower(?)",
      params: [normalizedValue]
    },
    cif: {
      sql: "SELECT account_number FROM customers WHERE lower(cif) = lower(?)",
      params: [normalizedValue]
    }
  };

  return lookups[type] || null;
}

function getEmployeeLookup(type, normalizedValue) {
  const lookups = {
    employeeId: {
      sql: "SELECT * FROM employees WHERE lower(employee_id) = lower(?)",
      params: [normalizedValue]
    },
    employeeName: {
      sql: "SELECT * FROM employees WHERE lower(name) LIKE ? ORDER BY name LIMIT 1",
      params: [`%${normalizedValue}%`]
    },
    employeeEmail: {
      sql: "SELECT * FROM employees WHERE lower(email) = lower(?)",
      params: [normalizedValue]
    },
    department: {
      sql: "SELECT * FROM employees WHERE lower(department) LIKE ? ORDER BY name LIMIT 1",
      params: [`%${normalizedValue}%`]
    }
  };

  return lookups[type] || null;
}

function getBusinessLookup(type, normalizedValue) {
  const lookups = {
    businessId: {
      sql: "SELECT * FROM business_records WHERE lower(business_id) = lower(?)",
      params: [normalizedValue]
    },
    businessName: {
      sql: "SELECT * FROM business_records WHERE lower(business_name) LIKE ? ORDER BY business_name LIMIT 1",
      params: [`%${normalizedValue}%`]
    }
  };

  return lookups[type] || null;
}

function getCustomerLookupSql(type) {
  return {
    accountNumber: "SELECT account_number FROM customers WHERE lower(account_number) = lower(?)",
    name: "SELECT account_number FROM customers WHERE lower(name) LIKE ? ORDER BY name LIMIT 1",
    ssn: "SELECT account_number FROM customers WHERE lower(ssn) = lower(?)",
    cif: "SELECT account_number FROM customers WHERE lower(cif) = lower(?)"
  }[type] || "";
}

function getEmployeeLookupSql(type) {
  return {
    employeeId: "SELECT * FROM employees WHERE lower(employee_id) = lower(?)",
    employeeName: "SELECT * FROM employees WHERE lower(name) LIKE ? ORDER BY name LIMIT 1",
    employeeEmail: "SELECT * FROM employees WHERE lower(email) = lower(?)",
    department: "SELECT * FROM employees WHERE lower(department) LIKE ? ORDER BY name LIMIT 1"
  }[type] || "";
}

function getBusinessLookupSql(type) {
  return {
    businessId: "SELECT * FROM business_records WHERE lower(business_id) = lower(?)",
    businessName: "SELECT * FROM business_records WHERE lower(business_name) LIKE ? ORDER BY business_name LIMIT 1"
  }[type] || "";
}

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getNextSortOrder(tableName, columnName, value) {
  const safeTables = new Set(["customer_notes", "fraud_notes", "wealth_interactions", "lending_contact_history"]);
  const safeColumns = new Set(["account_number"]);

  if (!safeTables.has(tableName) || !safeColumns.has(columnName)) {
    throw new Error("Unsupported sort-order lookup.");
  }

  const row = db.prepare(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM ${tableName} WHERE ${columnName} = ?`).get(value);
  return row.next_order;
}

async function readJsonBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;

    if (body.length > 20000) {
      throw new Error("Request body is too large.");
    }
  }

  if (!body) {
    return {};
  }

  return JSON.parse(body);
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function getContentType(filePath) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".sql": "text/plain; charset=utf-8",
    ".sqlite": "application/octet-stream"
  };

  return types[extname(filePath).toLowerCase()] || "application/octet-stream";
}
