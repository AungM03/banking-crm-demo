# CRM Prototype SQL Mode

This prototype still opens as static HTML, but it can also run as a local SQLite-backed demo.

## No-Node Static Demo

If a work computer cannot run Node.js, unzip the prototype and open:

```text
crm-prototype/home.html
```

That opens the browser-only demo mode. Use the role switcher on the Home page to compare Admin, HR, Banker, Wealth, Fraud, Loans, and Marketing views. Role-based pages load from `data.js`.

Static demo limits:

- SQLite API permissions are not active.
- Server-backed edits for the new Wealth and Lending pages are not saved.

For the full secure demo with SQLite, run the local server or host it once somewhere interns can reach by URL.

## Run The SQL Demo

From this folder:

```bash
node server.mjs
```

Then open:

```text
http://localhost:4173/
```

## Prototype Role API Flow

The executive demo no longer starts with a login screen. The Home page sends the selected prototype role with API requests:

```text
X-CRM-Role: banker
```

The server uses that role to apply the same permission matrix:

```text
http://localhost:4173/api/status

http://localhost:4173/api/auth/me
http://localhost:4173/api/bootstrap
http://localhost:4173/api/customers/find?type=accountNumber&value=10024588
http://localhost:4173/api/businesses/find?type=businessId&value=BUS-9007
```

`/api/auth/me` returns:

```json
{
  "user": {
    "name": "Nora Whitfield",
    "role": "banker"
  },
  "permissions": ["view_dashboard", "search_customers", "manage_leads"]
}
```

## Files

- `schema.sql` defines the CRM tables, including role and permission tables.
- `seed.sql` inserts the test customers, employee accounts, business accounts, leads, offers, meetings, fraud details, Discover Needs, notes, role profiles, and permissions.
- `crm.sqlite` is the generated local database. If it is not included in the zip, `server.mjs` creates it on first run from `schema.sql` and `seed.sql`, then applies startup demo backfills.
- `server.mjs` serves the HTML pages and API.
- `api.js` lets each page use SQL data when the server is running, while keeping the static `data.js` fallback.
- API requests include the active prototype role. The server derives the permission list from that role and returns `Restricted Access` when the role is not allowed to read or write that data type.
- `role_permissions` stores permission codes such as `search_customers`, `search_employees`, `manage_leads`, `manage_bank_notes`, and `view_fraud_detail`.
- Current test roles are Admin, HR, Banker, Wealth, Fraud, Loans, and Marketing.
- New workflow pages include `leads.html`, `lead-detail.html`, `offers.html`, `offer-detail.html`, `fraud-watch.html`, `meetings.html`, `meeting-detail.html`, `pipeline.html`, `profitability.html`, and `activity.html`.

To rebuild the database from `schema.sql` and `seed.sql`, run:

```bash
node server.mjs --reset-db
```

## Optional: AI-assisted fraud note analysis

The fraud rule engine matches Fraud Notes against a fixed phrase library
(instant, no dependencies). You can optionally layer a semantic classifier on
top that reads each note for *meaning* — so paraphrases and aliases like "BTC",
"crypto wallet", or "a man she met online told her to invest" are caught even
when the exact keywords are absent.

This layer runs **server-side only** (the API key never reaches the browser)
and is **fully optional**: with no key set, the engine scores notes exactly as
before. To enable it, set an Anthropic API key before starting the server:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node server.mjs
```

When active, AI-detected matches are merged with keyword matches (per category,
the higher score lift wins, so nothing is double-counted) and are tagged
"AI detected" on the fraud detail page. If the key is missing, the network is
unavailable, or the call errors/times out, the engine silently falls back to
keyword-only scoring. The static (file://) demo always runs keyword-only, since
it has no server to hold the key.
