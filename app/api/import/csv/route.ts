import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';

// Map Capital One categories → our Plaid-seeded category rows
const CAP1_CATEGORY_MAP: Record<string, { primary: string; detailed: string | null }> = {
  'dining':           { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_RESTAURANTS' },
  'restaurant':       { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_RESTAURANTS' },
  'food & drink':     { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_RESTAURANTS' },
  'groceries':        { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_GROCERIES' },
  'grocery':          { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_GROCERIES' },
  'supermarkets':     { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_GROCERIES' },
  'coffee':           { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_COFFEE' },
  'gas':              { primary: 'TRANSPORTATION', detailed: 'TRANSPORTATION_GAS_STATIONS' },
  'gas & automotive': { primary: 'TRANSPORTATION', detailed: 'TRANSPORTATION_GAS_STATIONS' },
  'automotive':       { primary: 'TRANSPORTATION', detailed: 'TRANSPORTATION_GAS_STATIONS' },
  'rideshare':        { primary: 'TRANSPORTATION', detailed: 'TRANSPORTATION_TAXIS_AND_RIDE_SHARING' },
  'transportation':   { primary: 'TRANSPORTATION', detailed: null },
  'travel':           { primary: 'TRAVEL',          detailed: null },
  'hotel':            { primary: 'TRAVEL',          detailed: 'TRAVEL_HOTELS_AND_MOTELS' },
  'airline':          { primary: 'TRAVEL',          detailed: 'TRAVEL_FLIGHTS' },
  'entertainment':    { primary: 'ENTERTAINMENT',   detailed: null },
  'merchandise':      { primary: 'GENERAL_MERCHANDISE', detailed: null },
  'shopping':         { primary: 'GENERAL_MERCHANDISE', detailed: null },
  'clothing':         { primary: 'GENERAL_MERCHANDISE', detailed: null },
  'health':           { primary: 'HEALTH_AND_FITNESS', detailed: null },
  'healthcare':       { primary: 'HEALTH_AND_FITNESS', detailed: null },
  'pharmacy':         { primary: 'HEALTH_AND_FITNESS', detailed: 'HEALTH_AND_FITNESS_PHARMACIES' },
  'personal':         { primary: 'PERSONAL_CARE',   detailed: null },
  'personal care':    { primary: 'PERSONAL_CARE',   detailed: null },
  'utilities':        { primary: 'RENT_AND_UTILITIES', detailed: null },
  'services':         { primary: 'GENERAL_SERVICES', detailed: null },
  'subscription':     { primary: 'GENERAL_SERVICES', detailed: 'GENERAL_SERVICES_SUBSCRIPTION' },
  'home':             { primary: 'HOME_IMPROVEMENT', detailed: null },
  'home improvement': { primary: 'HOME_IMPROVEMENT', detailed: null },
  'payment':          { primary: 'TRANSFER_IN',     detailed: null },
  'credit':           { primary: 'TRANSFER_IN',     detailed: null },
  'transfer':         { primary: 'TRANSFER_IN',     detailed: null },
  'fees':             { primary: 'BANK_FEES',        detailed: null },
};

function lookupCategory(db: ReturnType<typeof getDb>, cap1Category: string): number | null {
  const key = cap1Category.toLowerCase().trim();
  const mapped = CAP1_CATEGORY_MAP[key];
  if (!mapped) return null;

  const row = mapped.detailed
    ? db.prepare('SELECT id FROM categories WHERE plaid_primary = ? AND plaid_detailed = ? LIMIT 1').get(mapped.primary, mapped.detailed) as any
    : db.prepare('SELECT id FROM categories WHERE plaid_primary = ? AND plaid_detailed IS NULL LIMIT 1').get(mapped.primary) as any;

  return row?.id ?? null;
}

function parseCSVLine(line: string): string[] {
  // Handle quoted fields with commas inside
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function ensureCsvAccount(db: ReturnType<typeof getDb>, cardNo: string): string {
  const accountId = `csv-import-${cardNo}`;
  const existing = db.prepare('SELECT id FROM accounts WHERE id = ?').get(accountId);
  if (!existing) {
    db.prepare(`
      INSERT INTO accounts (id, item_id, access_token, institution_name, account_name, account_type, mask)
      VALUES (?, ?, 'csv-import', 'Capital One', ?, 'credit', ?)
    `).run(accountId, `csv-import-${cardNo}`, `Capital One ···${cardNo}`, cardNo);
  }
  return accountId;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return NextResponse.json({ error: 'CSV appears empty' }, { status: 400 });

    // Validate header
    const header = lines[0].toLowerCase();
    if (!header.includes('transaction date') || !header.includes('description')) {
      return NextResponse.json({ error: 'Unrecognized CSV format. Expected Capital One format.' }, { status: 400 });
    }

    const db = getDb();
    let added = 0;
    let skipped = 0;

    const upsert = db.prepare(`
      INSERT INTO transactions (id, account_id, category_id, plaid_category_primary, plaid_category_detailed, merchant_name, name, amount, date, pending)
      VALUES (@id, @account_id, @category_id, @plaid_category_primary, @plaid_category_detailed, @merchant_name, @name, @amount, @date, 0)
      ON CONFLICT(id) DO NOTHING
    `);

    const insertMany = db.transaction((rows: Parameters<typeof upsert.run>[0][]) => {
      for (const row of rows) {
        const info = upsert.run(row);
        if (info.changes > 0) added++; else skipped++;
      }
    });

    const rows: Parameters<typeof upsert.run>[0][] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      // Expected: Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit
      if (cols.length < 6) continue;

      const [txnDate, , cardNo, description, cap1Category, debitStr, creditStr] = cols;
      if (!txnDate || !description) continue;

      const debit  = parseFloat(debitStr  || '0') || 0;
      const credit = parseFloat(creditStr || '0') || 0;
      // Plaid convention: positive = money out (debit), negative = money in (credit/payment)
      const amount = debit > 0 ? debit : -credit;

      const accountId = ensureCsvAccount(db, cardNo || 'unknown');
      const categoryId = lookupCategory(db, cap1Category || '');

      // Stable dedupe ID from date + description + amount
      const dedupe = `csv-${txnDate}-${description.replace(/\s+/g, '-')}-${amount}`;

      rows.push({
        id: dedupe,
        account_id: accountId,
        category_id: categoryId,
        plaid_category_primary: null,
        plaid_category_detailed: null,
        merchant_name: description,
        name: description,
        amount,
        date: txnDate,
      });
    }

    insertMany(rows);

    return NextResponse.json({ success: true, added, skipped, total: rows.length });
  } catch (err: any) {
    console.error('CSV import error:', err);
    return NextResponse.json({ error: err.message ?? 'Import failed' }, { status: 500 });
  }
}
