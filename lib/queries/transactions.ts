import { getDb } from '../db/client';

export interface Transaction {
  id: string; account_id: string; category_id: number | null;
  plaid_category_primary: string | null; plaid_category_detailed: string | null;
  merchant_name: string | null; name: string; amount: number;
  iso_currency_code: string; date: string; pending: number; logo_url: string | null;
  category_display_name: string | null; category_color: string | null;
  account_name: string | null; institution_name: string | null;
}

export interface TransactionFilters {
  search?: string; category?: number; from?: string; to?: string;
  account_id?: string; page?: number; limit?: number;
}

export function getTransactions(filters: TransactionFilters = {}) {
  const { search, category, from, to, account_id, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) { conditions.push('(LOWER(t.merchant_name) LIKE ? OR LOWER(t.name) LIKE ?)'); params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`); }
  if (category) { conditions.push('t.category_id = ?'); params.push(category); }
  if (from) { conditions.push('t.date >= ?'); params.push(from); }
  if (to) { conditions.push('t.date <= ?'); params.push(to); }
  if (account_id) { conditions.push('t.account_id = ?'); params.push(account_id); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total: number = (getDb().prepare(`SELECT COUNT(*) as count FROM transactions t ${where}`).get(...params) as any).count;
  const transactions = getDb().prepare(`
    SELECT t.*, c.display_name as category_display_name, c.color as category_color,
      a.account_name, a.institution_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    ${where}
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Transaction[];

  return { transactions, total, page, pages: Math.ceil(total / limit) };
}
