import { getDb } from '../db/client';

export interface Category {
  id: number; plaid_primary: string; plaid_detailed: string | null;
  display_name: string; color: string; total_spent?: number; tx_count?: number;
}

export function getCategories(month?: string): Category[] {
  if (month) {
    return getDb().prepare(`
      SELECT c.*, COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) as total_spent, COUNT(t.id) as tx_count
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id AND strftime('%Y-%m', t.date) = ? AND t.pending = 0
      GROUP BY c.id ORDER BY total_spent DESC
    `).all(month) as Category[];
  }
  // Only return categories that have at least one transaction (used in dropdowns)
  return getDb().prepare(`
    SELECT c.* FROM categories c
    WHERE EXISTS (SELECT 1 FROM transactions t WHERE t.category_id = c.id)
    ORDER BY c.display_name
  `).all() as Category[];
}

export function getAllCategories(): Category[] {
  return getDb().prepare('SELECT * FROM categories ORDER BY display_name').all() as Category[];
}

export function updateCategory(id: number, data: { display_name?: string; color?: string }) {
  const fields: string[] = [];
  const params: any[] = [];
  if (data.display_name !== undefined) { fields.push('display_name = ?'); params.push(data.display_name); }
  if (data.color !== undefined) { fields.push('color = ?'); params.push(data.color); }
  if (fields.length === 0) return;
  params.push(id);
  getDb().prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...params);
}
