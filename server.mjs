import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(ROOT, "crm.sqlite");
const SCHEMA_PATH = join(ROOT, "schema.sql");
const SEED_PATH = join(ROOT, "seed.sql");
const PROCESS_ENV = globalThis.process && globalThis.process.env ? globalThis.process.env : {};
const PROCESS_ARGS = globalThis.process && globalThis.process.argv ? globalThis.process.argv : [];
const PORT = Number(PROCESS_ENV.PORT || 4173);
const SHOULD_RESET = PROCESS_ARGS.includes("--reset-db");
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;
const scrypt = promisify(scryptCallback);
const sessions = new Map();
const EDIT_PERMISSION_SEEDS = {
  admin: ["edit_leads", "edit_bank_notes", "edit_meetings", "edit_customers", "edit_offers", "edit_businesses", "edit_employees"],
  banker: ["edit_leads", "edit_bank_notes", "edit_meetings", "edit_customers", "edit_businesses"],
  wealth: ["edit_bank_notes", "edit_meetings", "edit_customers"],
  loans: ["edit_leads", "edit_bank_notes", "edit_meetings", "edit_customers", "edit_businesses"],
  marketing: ["edit_offers"],
  hr: ["edit_employees"]
};

initializeDatabase(SHOULD_RESET);

const db = new DatabaseSync(DB_PATH);
const AUTHENTICATED_ROLES = ["admin", "hr", "banker", "wealth", "fraud", "loans", "marketing"];
ensureEditPermissions();

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname.startsWith("/api/")) {
    handleApi(request, requestUrl, response);
    return;
  }

  serveStaticFile(requestUrl, response);
});

server.listen(PORT, () => {
  console.log(`CRM prototype running at http://localhost:${PORT}`);
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

async function handleApi(request, requestUrl, response) {
  try {
    if (requestUrl.pathname === "/api/status") {
      sendJson(response, {
        source: "sqlite",
        database: "crm.sqlite"
      });
      return;
    }

    if (requestUrl.pathname === "/api/auth/login") {
      if (request.method !== "POST") {
        sendJson(response, { error: "Use POST to log in." }, 405);
        return;
      }

      const payload = await readJsonBody(request);
      const loginResult = await loginUser(payload);

      if (!loginResult) {
        sendJson(response, { error: "Invalid email or password." }, 401);
        return;
      }

      sendJson(response, {
        source: "sqlite",
        token: loginResult.token,
        user: loginResult.user,
        permissions: loginResult.permissions
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

      const createdNote = createBankNote(validation.note);

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

      if (!note || note.author !== "Current User") {
        sendJson(response, { error: "Only notes added by Current User can be edited." }, 400);
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

      const removed = deleteBankNote(noteId);

      if (!removed) {
        sendJson(response, { error: "Only notes added by Current User can be removed." }, 400);
        return;
      }

      sendJson(response, {
        source: "sqlite",
        role,
        message: "Bank note removed."
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

      const createdMeeting = createMeeting(validation.meeting, customer, role);

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

async function loginUser(payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");

  if (!email || !password) {
    return null;
  }

  const userRow = getUserByEmail(email);

  if (!userRow || !userRow.is_active) {
    return null;
  }

  const isPasswordValid = await verifyPassword(password, userRow.password_hash, userRow.password_salt);

  if (!isPasswordValid) {
    return null;
  }

  const token = createSessionToken(userRow);
  const user = serializeUser(userRow);
  const permissions = getPermissionsForRole(user.role);

  return { token, user, permissions };
}

async function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derivedKey = await scrypt(String(password), Buffer.from(salt, "hex"), 64);
  return {
    hash: derivedKey.toString("hex"),
    salt
  };
}

async function verifyPassword(password, expectedHash, salt) {
  const passwordHash = await hashPassword(password, salt);
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(passwordHash.hash, "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function createSessionToken(userRow) {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const user = serializeUser(userRow);

  sessions.set(token, {
    token,
    user,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS
  });

  return token;
}

function getSessionFromRequest(request) {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const session = sessions.get(token);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  session.permissions = getPermissionsForRole(session.user.role);
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}

function getBearerToken(request) {
  const authHeader = request.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return "";
  }

  return token.trim();
}

function getUserByEmail(email) {
  return db.prepare(`
    SELECT
      users.user_id,
      users.username,
      users.email,
      users.password_hash,
      users.password_salt,
      users.role,
      users.is_active,
      role_test_users.label,
      role_test_users.department,
      role_test_users.name,
      role_test_users.first_name
    FROM users
    INNER JOIN role_test_users ON role_test_users.role = users.role
    WHERE lower(users.email) = lower(?)
    LIMIT 1
  `).get(email);
}

function serializeUser(row) {
  return {
    id: row.user_id,
    username: row.username,
    email: row.email,
    role: normalizeRole(row.role),
    label: row.label,
    department: row.department,
    name: row.name,
    firstName: row.first_name,
    page: `home.html?role=${encodeURIComponent(normalizeRole(row.role))}`
  };
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
    clauses.push("(customers.affluency_tier >= 3 OR customers.invested_balance >= 100000)");
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
      fraudDrivers: customer.fraudDrivers
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
    return {
      ...customer,
      wealthDataAccess: "restricted",
      wealthAdvisor: "Restricted to Wealth",
      investedBalance: 0,
      affluencyTier: 0,
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
  return customer.affluencyTier >= 3 || customer.investedBalance >= 100000;
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
    error: "Authentication Required",
    message: "Log in to the CRM before using this API."
  }, 401);
}

function serveStaticFile(requestUrl, response) {
  const requestedPath = requestUrl.pathname === "/" ? "/login.html" : requestUrl.pathname;
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
    fraudRiskTier: row.fraud_risk_tier,
    fraudCases: row.fraud_cases,
    frontlineNotes: row.frontline_notes,
    lastReviewed: row.last_reviewed,
    fraudHistory: getFraudHistory(accountNumber),
    fraudDrivers: getFraudDrivers(accountNumber),
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

function createBankNote(note) {
  const sortOrder = getNextSortOrder("customer_notes", "account_number", note.accountNumber);
  const result = db.prepare(`
    INSERT INTO customer_notes (account_number, author, note_date, note_text, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(note.accountNumber, "Current User", "Today", note.text, sortOrder);

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

function deleteBankNote(noteId) {
  const row = db.prepare("SELECT id, author FROM customer_notes WHERE id = ?").get(noteId);

  if (!row || row.author !== "Current User") {
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
  return {
    admin: "Morgan Lee",
    banker: "Nora Whitfield",
    wealth: "Avery Chen",
    loans: "Taylor Brooks"
  }[role] || "Current User";
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
  const safeTables = new Set(["customer_notes"]);
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
