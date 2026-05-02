import { getDb } from '../db/client';
import { format } from 'date-fns';

export interface Budget {
  id: number; category_id: number; monthly_limit: number; alert_threshold: number;
  display_name: string; color: string; spent: number; percent_used: number; is_over_threshold: boolean;
}

export function getBudgets(month?: string): Budget[] {
  const m = month ?? format(new Date(), 'yyyy-MM');
  return (getDb().prepare(`
    SELECT b.*, c.display_name, c.color,
      COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) as spent
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    LEFT JOIN transactions t ON t.category_id = b.category_id AND strftime('%Y-%m', t.date) = ? AND t.pending = 0
    GROUP BY b.id ORDER BY c.display_name
  `).all(m) as any[]).map((row: any) => ({
    ...row,
    percent_used: row.monthly_limit > 0 ? row.spent / row.monthly_limit : 0,
    is_over_threshold: row.monthly_limit > 0 && row.spent / row.monthly_limit >= row.alert_threshold,
  })) as Budget[];
}

export function createBudget(data: { category_id: number; monthly_limit: number; alert_threshold?: number }) {
  return getDb().prepare('INSERT INTO budgets (category_id, monthly_limit, alert_threshold) VALUES (?, ?, ?)').run(data.category_id, data.monthly_limit, data.alert_threshold ?? 0.8);
}

export function updateBudget(id: number, data: { monthly_limit?: number; alert_threshold?: number }) {
  const fields: string[] = ["updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')"];
  const params: any[] = [];
  if (data.monthly_limit !== undefined) { fields.push('monthly_limit = ?'); params.push(data.monthly_limit); }
  if (data.alert_threshold !== undefined) { fields.push('alert_threshold = ?'); params.push(data.alert_threshold); }
  params.push(id);
  getDb().prepare(`UPDATE budgets SET ${fields.join(', ')} WHERE id = ?`).run(...params);
}

export function deleteBudget(id: number) {
  getDb().prepare('DELETE FROM budgets WHERE id = ?').run(id);
}
