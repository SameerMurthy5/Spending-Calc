import { getDb } from '../db/client';

export interface Account {
  id: string;
  item_id: string;
  institution_name: string;
  account_name: string;
  account_type: string;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  last_synced_at: string | null;
  created_at: string;
}

export function getAllAccounts(): Account[] {
  return getDb().prepare('SELECT * FROM accounts ORDER BY institution_name, account_name').all() as Account[];
}

export function insertAccount(account: {
  id: string; item_id: string; access_token: string; institution_name: string;
  account_name: string; account_type: string; mask?: string | null;
  current_balance?: number | null; available_balance?: number | null;
}) {
  getDb().prepare(`
    INSERT OR REPLACE INTO accounts (id, item_id, access_token, institution_name, account_name, account_type, mask, current_balance, available_balance)
    VALUES (@id, @item_id, @access_token, @institution_name, @account_name, @account_type, @mask, @current_balance, @available_balance)
  `).run(account);
}

export function deleteAccount(id: string) {
  getDb().prepare('DELETE FROM accounts WHERE id = ?').run(id);
}

export function getAccessToken(accountId: string): string | null {
  const row = getDb().prepare('SELECT access_token FROM accounts WHERE id = ?').get(accountId) as any;
  return row?.access_token ?? null;
}
