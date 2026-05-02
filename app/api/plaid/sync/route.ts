import { NextRequest, NextResponse } from 'next/server';
import { syncTransactions } from '@/lib/plaid/sync';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const results = await syncTransactions(body?.item_id);
    const totals = results.reduce((acc, r) => ({ added: acc.added + r.added, modified: acc.modified + r.modified, removed: acc.removed + r.removed }), { added: 0, modified: 0, removed: 0 });
    return NextResponse.json({ success: true, ...totals, items: results.length });
  } catch (err: any) {
    console.error('sync error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
