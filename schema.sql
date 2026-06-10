PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS role_test_users;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS offers;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS business_records;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS customer_notes;
DROP TABLE IF EXISTS customer_alerts;
DROP TABLE IF EXISTS next_best_actions;
DROP TABLE IF EXISTS discover_needs;
DROP TABLE IF EXISTS fraud_drivers;
DROP TABLE IF EXISTS fraud_history;
DROP TABLE IF EXISTS customer_business_accounts;
DROP TABLE IF EXISTS household_members;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS customer_accounts;
DROP TABLE IF EXISTS customer_profitability;
DROP TABLE IF EXISTS customers;

CREATE TABLE customers (
  account_number TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ssn TEXT NOT NULL,
  cif TEXT NOT NULL UNIQUE,
  dob TEXT NOT NULL,
  zip TEXT NOT NULL,
  relationship TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  primary_branch TEXT NOT NULL,
  personal_banker TEXT NOT NULL,
  wealth_advisor TEXT NOT NULL,
  checking_balance INTEGER NOT NULL,
  savings_balance INTEGER NOT NULL,
  household_balance INTEGER NOT NULL,
  invested_balance INTEGER NOT NULL,
  affluency_tier INTEGER NOT NULL,
  fraud_risk_score INTEGER NOT NULL,
  fraud_risk_tier TEXT NOT NULL,
  fraud_cases INTEGER NOT NULL,
  frontline_notes INTEGER NOT NULL,
  last_reviewed TEXT NOT NULL
);

CREATE TABLE customer_profitability (
  account_number TEXT PRIMARY KEY REFERENCES customers(account_number) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  annual_contribution INTEGER NOT NULL,
  main_driver TEXT NOT NULL,
  watch_item TEXT NOT NULL
);

CREATE TABLE customer_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  product_account TEXT NOT NULL,
  status TEXT NOT NULL,
  open_date TEXT NOT NULL,
  balance INTEGER NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
  loan_type TEXT NOT NULL,
  balance INTEGER NOT NULL,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE household_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  products TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE customer_business_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  owner_role TEXT NOT NULL,
  products TEXT NOT NULL,
  relationship_value INTEGER NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE fraud_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
  fraud_type TEXT NOT NULL,
  event_count INTEGER NOT NULL,
  impact INTEGER NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE fraud_drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
  driver TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE discover_needs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
  product TEXT NOT NULL,
  priority TEXT NOT NULL,
  reason TEXT NOT NULL,
  next_action TEXT NOT NULL,
  status TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE next_best_actions (
  account_number TEXT PRIMARY KEY REFERENCES customers(account_number) ON DELETE CASCADE,
  title TEXT NOT NULL,
  priority TEXT NOT NULL,
  reason TEXT NOT NULL,
  banker TEXT NOT NULL,
  due TEXT NOT NULL
);

CREATE TABLE customer_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
  label TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE customer_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_number TEXT NOT NULL REFERENCES customers(account_number) ON DELETE CASCADE,
  author TEXT NOT NULL,
  note_date TEXT NOT NULL,
  note_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE employees (
  employee_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT NOT NULL,
  employee_role TEXT NOT NULL,
  branch TEXT NOT NULL,
  manager TEXT NOT NULL,
  access_level TEXT NOT NULL,
  status TEXT NOT NULL,
  hire_date TEXT NOT NULL,
  training_status TEXT NOT NULL,
  disclosures TEXT NOT NULL,
  linked_business_id TEXT NOT NULL DEFAULT ''
);

CREATE TABLE business_records (
  business_id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_type TEXT NOT NULL,
  linked_account_number TEXT NOT NULL DEFAULT '',
  linked_employee_id TEXT NOT NULL DEFAULT '',
  products TEXT NOT NULL,
  relationship_value INTEGER NOT NULL,
  status TEXT NOT NULL,
  banker TEXT NOT NULL,
  lending_opportunity TEXT NOT NULL
);

CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_type TEXT NOT NULL,
  title TEXT NOT NULL,
  account_number TEXT NOT NULL,
  amount INTEGER NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  visible_to TEXT NOT NULL
);

CREATE TABLE offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offer_type TEXT NOT NULL,
  title TEXT NOT NULL,
  audience TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  visible_to TEXT NOT NULL
);

CREATE TABLE meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  account_number TEXT NOT NULL,
  client TEXT NOT NULL,
  meeting_date TEXT NOT NULL,
  owner TEXT NOT NULL,
  visible_to TEXT NOT NULL,
  is_user_created INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE role_test_users (
  role TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  department TEXT NOT NULL,
  name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  dashboard_focus TEXT NOT NULL,
  primary_purpose TEXT NOT NULL
);

CREATE TABLE users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL REFERENCES role_test_users(role) ON DELETE CASCADE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL REFERENCES role_test_users(role) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_cif ON customers(cif);
CREATE INDEX idx_customers_ssn ON customers(ssn);
CREATE INDEX idx_employees_name ON employees(name);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_business_name ON business_records(business_name);
CREATE INDEX idx_users_email ON users(email);
