import { plaidClient } from './client';
import { getDb } from '../db/client';

interface SyncResult {
  added: number;
  modified: number;
  removed: number;
  error?: string;
}

export async function syncTransactions(itemId?: string): Promise<SyncResult[]> {
  const db = getDb();
  const results: SyncResult[] = [];

  const items: Array<{ item_id: string; access_token: string; cursor: string | null }> = itemId
    ? db.prepare('SELECT DISTINCT item_id, access_token, cursor FROM accounts WHERE item_id = ?').all(itemId) as any
    : db.prepare('SELECT DISTINCT item_id, access_token, cursor FROM accounts').all() as any;

  for (const item of items) {
    const result: SyncResult = { added: 0, modified: 0, removed: 0 };
    try {
      let cursor = item.cursor ?? undefined;
      let hasMore = true;

      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: item.access_token,
          cursor,
          count: 500,
        });
        const data = response.data;

        const upsert = db.prepare(`
          INSERT INTO transactions (
            id, account_id, category_id, plaid_category_primary, plaid_category_detailed,
            merchant_name, name, amount, iso_currency_code, date, pending, logo_url, updated_at
          ) VALUES (
            @id, @account_id, @category_id, @plaid_category_primary, @plaid_category_detailed,
            @merchant_name, @name, @amount, @iso_currency_code, @date, @pending, @logo_url,
            strftime('%Y-%m-%dT%H:%M:%fZ','now')
          )
          ON CONFLICT(id) DO UPDATE SET
            category_id = excluded.category_id,
            plaid_category_primary = excluded.plaid_category_primary,
            plaid_category_detailed = excluded.plaid_category_detailed,
            merchant_name = excluded.merchant_name,
            name = excluded.name,
            amount = excluded.amount,
            date = excluded.date,
            pending = excluded.pending,
            logo_url = excluded.logo_url,
            updated_at = excluded.updated_at
        `);

        const getCategoryId = db.prepare(
          'SELECT id FROM categories WHERE plaid_primary = ? AND (plaid_detailed = ? OR (plaid_detailed IS NULL AND ? IS NULL)) LIMIT 1'
        );
        const getFallbackCategoryId = db.prepare(
          'SELECT id FROM categories WHERE plaid_primary = ? AND plaid_detailed IS NULL LIMIT 1'
        );

        const upsertMany = db.transaction((txns: typeof data.added) => {
          for (const txn of txns) {
            const primary = txn.personal_finance_category?.primary ?? null;
            const detailed = txn.personal_finance_category?.detailed ?? null;
            let catRow: any = primary ? getCategoryId.get(primary, detailed, detailed) : null;
            if (!catRow && primary) catRow = getFallbackCategoryId.get(primary);
            upsert.run({
              id: txn.transaction_id,
              account_id: txn.account_id,
              category_id: catRow?.id ?? null,
              plaid_category_primary: primary,
              plaid_category_detailed: detailed,
              merchant_name: txn.merchant_name ?? null,
              name: txn.name,
              amount: txn.amount,
              iso_currency_code: txn.iso_currency_code ?? 'USD',
              date: txn.date,
              pending: txn.pending ? 1 : 0,
              logo_url: txn.logo_url ?? null,
            });
          }
        });

        upsertMany([...data.added, ...data.modified]);
        result.added += data.added.length;
        result.modified += data.modified.length;

        if (data.removed.length > 0) {
          const ids = data.removed.map((r) => r.transaction_id);
          const placeholders = ids.map(() => '?').join(',');
          db.prepare(`DELETE FROM transactions WHERE id IN (${placeholders})`).run(...ids);
          result.removed += data.removed.length;
        }

        cursor = data.next_cursor;
        hasMore = data.has_more;
        db.prepare(
          "UPDATE accounts SET cursor = ?, last_synced_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE item_id = ?"
        ).run(cursor, item.item_id);
      }
    } catch (err: any) {
      result.error = err?.message ?? 'Unknown error';
    }
    results.push(result);
  }
  return results;
}
