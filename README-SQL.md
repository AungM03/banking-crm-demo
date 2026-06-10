# CRM Prototype SQL Mode

This prototype still opens as static HTML, but it can also run as a local SQLite-backed demo.

## Run The SQL Demo

From this folder:

```bash
node server.mjs
```

Then open:

```text
http://localhost:4173/login.html
```

## Authenticated API Flow

The local API now requires a session token for every data route. Log in first:

```text
POST http://localhost:4173/api/auth/login
Content-Type: application/json

{
  "email": "banker.crm.demo@gmail.com",
  "password": "<demo password>"
}
```

The response includes a 32-byte hex session token plus the current role's machine-readable permission codes. Send the token on later API calls:

```text
http://localhost:4173/api/status
Authorization: Bearer <token>

http://localhost:4173/api/auth/me
http://localhost:4173/api/bootstrap
http://localhost:4173/api/customers/find?type=accountNumber&value=10024588
http://localhost:4173/api/businesses/find?type=businessId&value=BUS-9007
```

`/api/auth/me` returns:

```json
{
  "user": {
    "email": "banker.crm.demo@gmail.com",
    "role": "banker"
  },
  "permissions": ["view_dashboard", "search_customers", "manage_leads"]
}
```

## Files

- `schema.sql` defines the CRM tables, including `users` for login credentials.
- `seed.sql` inserts the test customers, employee accounts, business accounts, leads, offers, meetings, fraud details, Discover Needs, notes, role profiles, and salted password hashes.
- `crm.sqlite` is the generated local database.
- `server.mjs` serves the HTML pages and API.
- `api.js` lets each page use SQL data when the server is running, while keeping the static `data.js` fallback.
- API requests include a bearer token. The server derives the active role and permission list from that token and returns `Restricted Access` when the user is not allowed to read or write that data type.
- `role_permissions` stores permission codes such as `search_customers`, `search_employees`, `manage_leads`, `manage_bank_notes`, and `view_fraud_detail`.
- Current test roles are Admin, HR, Banker, Wealth, Fraud, Loans, and Marketing.
- New workflow pages include `leads.html`, `lead-detail.html`, `offers.html`, `offer-detail.html`, `fraud-watch.html`, `meetings.html`, `meeting-detail.html`, `pipeline.html`, `profitability.html`, and `activity.html`.

To rebuild the database from `schema.sql` and `seed.sql`, run:

```bash
node server.mjs --reset-db
```
