const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'franchiseops.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager',       -- owner | regional_manager | manager | analyst
  outlet_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS outlets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  address TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  opened_on TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',      -- active | under_review | closed
  lat REAL,
  lng REAL,
  target_monthly_sales REAL NOT NULL,
  customer_rating REAL NOT NULL DEFAULT 4.0
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_cost REAL NOT NULL,
  unit_price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_id INTEGER NOT NULL REFERENCES outlets(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  stock_on_hand INTEGER NOT NULL,
  reorder_level INTEGER NOT NULL,
  avg_daily_sales REAL NOT NULL,
  wastage_units_30d INTEGER NOT NULL DEFAULT 0,
  last_restocked TEXT NOT NULL,
  UNIQUE(outlet_id, product_id)
);

CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_id INTEGER NOT NULL REFERENCES outlets(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,                         -- Store Manager | Shift Lead | Barista | Kitchen Staff | Cashier
  shift TEXT NOT NULL,                        -- Morning | Evening | Night
  attendance_pct REAL NOT NULL,
  productivity_pct REAL NOT NULL,
  overtime_hours_month REAL NOT NULL,
  sales_per_employee REAL NOT NULL,
  hire_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'        -- active | on_leave | exited
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_id INTEGER NOT NULL REFERENCES outlets(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  date TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  revenue REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  transaction_id TEXT,
  hour INTEGER,
  is_weekend INTEGER DEFAULT 0,
  payment_method TEXT,
  customer_rating REAL,
  customer_segment TEXT,
  footfall INTEGER
);

CREATE TABLE IF NOT EXISTS customer_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id TEXT NOT NULL UNIQUE,
  outlet_id INTEGER NOT NULL REFERENCES outlets(id),
  review_text TEXT NOT NULL,
  rating INTEGER NOT NULL,
  source TEXT NOT NULL,
  date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,                       -- Instagram | Google Ads | SMS | Email | In-store
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  budget REAL NOT NULL,
  spend REAL NOT NULL,
  impressions INTEGER NOT NULL,
  clicks INTEGER NOT NULL,
  leads INTEGER NOT NULL,
  conversions INTEGER NOT NULL,
  revenue REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'        -- active | completed | paused
);

CREATE TABLE IF NOT EXISTS audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_id INTEGER NOT NULL REFERENCES outlets(id),
  date TEXT NOT NULL,
  auditor TEXT NOT NULL,
  score INTEGER NOT NULL,
  checklist_score INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed'     -- scheduled | in_progress | completed
);

CREATE TABLE IF NOT EXISTS violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_id INTEGER NOT NULL REFERENCES audits(id),
  outlet_id INTEGER NOT NULL REFERENCES outlets(id),
  category TEXT NOT NULL,                      -- Hygiene | Staffing | Cash Handling | Inventory | Branding | Documentation
  severity TEXT NOT NULL,                      -- Low | Medium | High | Critical
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',          -- open | in_progress | verified | closed
  detected_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS corrective_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  violation_id INTEGER NOT NULL REFERENCES violations(id),
  owner TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',       -- pending | in_progress | completed | verified
  action_taken TEXT,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet_id INTEGER REFERENCES outlets(id),
  event_type TEXT NOT NULL,                     -- low_stock | attendance | compliance | sales_dip | payment | incident | campaign
  channel TEXT NOT NULL,                        -- email | sms | push
  priority TEXT NOT NULL,                       -- low | medium | high | critical
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',          -- sent | acknowledged | escalated | resolved
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged_at TEXT,
  escalated_at TEXT,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sales_outlet_date ON sales(outlet_id, date);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_outlet_date ON customer_feedback(outlet_id, date);
`);

// Keep existing local databases compatible with the richer supplied dataset.
for (const column of [
  ['transaction_id', 'TEXT'], ['hour', 'INTEGER'], ['is_weekend', 'INTEGER DEFAULT 0'],
  ['payment_method', 'TEXT'], ['customer_rating', 'REAL'], ['customer_segment', 'TEXT'], ['footfall', 'INTEGER'],
]) {
  try { db.exec(`ALTER TABLE sales ADD COLUMN ${column[0]} ${column[1]}`); } catch (error) {
    if (!String(error.message).includes('duplicate column name')) throw error;
  }
}
module.exports = db;
