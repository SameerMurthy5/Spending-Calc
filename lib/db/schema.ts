import type Database from 'better-sqlite3';

export function runSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id                TEXT PRIMARY KEY,
      item_id           TEXT NOT NULL,
      access_token      TEXT NOT NULL,
      cursor            TEXT,
      institution_name  TEXT NOT NULL,
      account_name      TEXT NOT NULL,
      account_type      TEXT NOT NULL,
      mask              TEXT,
      current_balance   REAL,
      available_balance REAL,
      last_synced_at    TEXT,
      created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      plaid_primary   TEXT NOT NULL,
      plaid_detailed  TEXT,
      display_name    TEXT NOT NULL,
      color           TEXT NOT NULL DEFAULT '#6366f1',
      UNIQUE(plaid_primary, plaid_detailed)
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id                        TEXT PRIMARY KEY,
      account_id                TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      category_id               INTEGER REFERENCES categories(id),
      plaid_category_primary    TEXT,
      plaid_category_detailed   TEXT,
      merchant_name             TEXT,
      name                      TEXT NOT NULL,
      amount                    REAL NOT NULL,
      iso_currency_code         TEXT NOT NULL DEFAULT 'USD',
      date                      TEXT NOT NULL,
      pending                   INTEGER NOT NULL DEFAULT 0,
      logo_url                  TEXT,
      created_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_date        ON transactions(date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_account_id  ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_category    ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_merchant    ON transactions(merchant_name);
    CREATE TABLE IF NOT EXISTS budgets (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      monthly_limit   REAL NOT NULL,
      alert_threshold REAL NOT NULL DEFAULT 0.8,
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      UNIQUE(category_id)
    );
  `);
  seedCategories(db);
}

const CATEGORY_SEED: Array<{ primary: string; detailed: string | null; name: string; color: string }> = [
  { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_RESTAURANTS', name: 'Restaurants', color: '#f97316' },
  { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_GROCERIES', name: 'Groceries', color: '#22c55e' },
  { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_COFFEE', name: 'Coffee', color: '#a16207' },
  { primary: 'FOOD_AND_DRINK', detailed: null, name: 'Food & Drink', color: '#fb923c' },
  { primary: 'TRANSPORTATION', detailed: 'TRANSPORTATION_GAS_STATIONS', name: 'Gas', color: '#dc2626' },
  { primary: 'TRANSPORTATION', detailed: 'TRANSPORTATION_TAXIS_AND_RIDE_SHARING', name: 'Rideshare', color: '#7c3aed' },
  { primary: 'TRANSPORTATION', detailed: 'TRANSPORTATION_PUBLIC_TRANSIT', name: 'Transit', color: '#2563eb' },
  { primary: 'TRANSPORTATION', detailed: 'TRANSPORTATION_PARKING', name: 'Parking', color: '#64748b' },
  { primary: 'TRANSPORTATION', detailed: null, name: 'Transportation', color: '#8b5cf6' },
  { primary: 'ENTERTAINMENT', detailed: null, name: 'Entertainment', color: '#f43f5e' },
  { primary: 'GENERAL_MERCHANDISE', detailed: 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES', name: 'Online Shopping', color: '#0ea5e9' },
  { primary: 'GENERAL_MERCHANDISE', detailed: null, name: 'Shopping', color: '#38bdf8' },
  { primary: 'PERSONAL_CARE', detailed: null, name: 'Personal Care', color: '#d946ef' },
  { primary: 'HEALTH_AND_FITNESS', detailed: 'HEALTH_AND_FITNESS_GYM', name: 'Gym', color: '#84cc16' },
  { primary: 'HEALTH_AND_FITNESS', detailed: null, name: 'Health & Fitness', color: '#a3e635' },
  { primary: 'HOME_IMPROVEMENT', detailed: null, name: 'Home Improvement', color: '#f59e0b' },
  { primary: 'RENT_AND_UTILITIES', detailed: 'RENT_AND_UTILITIES_RENT', name: 'Rent', color: '#ef4444' },
  { primary: 'RENT_AND_UTILITIES', detailed: 'RENT_AND_UTILITIES_INTERNET_AND_CABLE', name: 'Internet & Cable', color: '#60a5fa' },
  { primary: 'RENT_AND_UTILITIES', detailed: null, name: 'Rent & Utilities', color: '#fb923c' },
  { primary: 'LOAN_PAYMENTS', detailed: null, name: 'Loan Payments', color: '#94a3b8' },
  { primary: 'TRAVEL', detailed: 'TRAVEL_FLIGHTS', name: 'Flights', color: '#38bdf8' },
  { primary: 'TRAVEL', detailed: 'TRAVEL_HOTELS_AND_MOTELS', name: 'Hotels', color: '#818cf8' },
  { primary: 'TRAVEL', detailed: null, name: 'Travel', color: '#6366f1' },
  { primary: 'TRANSFER_IN', detailed: null, name: 'Income / Transfer In', color: '#10b981' },
  { primary: 'TRANSFER_OUT', detailed: null, name: 'Transfer Out', color: '#6b7280' },
  { primary: 'INCOME', detailed: null, name: 'Income', color: '#059669' },
  { primary: 'GENERAL_SERVICES', detailed: 'GENERAL_SERVICES_SUBSCRIPTION', name: 'Subscriptions', color: '#a78bfa' },
  { primary: 'GENERAL_SERVICES', detailed: null, name: 'Services', color: '#c4b5fd' },
  { primary: 'BANK_FEES', detailed: null, name: 'Bank Fees', color: '#9ca3af' },
  { primary: 'OTHER', detailed: null, name: 'Other', color: '#6b7280' },
];

function seedCategories(db: Database.Database) {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO categories (plaid_primary, plaid_detailed, display_name, color) VALUES (?, ?, ?, ?)'
  );
  const insertMany = db.transaction(() => {
    for (const cat of CATEGORY_SEED) {
      insert.run(cat.primary, cat.detailed, cat.name, cat.color);
    }
  });
  insertMany();
}
