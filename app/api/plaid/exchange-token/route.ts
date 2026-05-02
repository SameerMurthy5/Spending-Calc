import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid/client';
import { insertAccount } from '@/lib/queries/accounts';
import { syncTransactions } from '@/lib/plaid/sync';

export async function POST(req: NextRequest) {
  try {
    const { public_token } = await req.json();
    if (!public_token) return NextResponse.json({ error: 'Missing public_token' }, { status: 400 });

    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchangeRes.data;

    const accountsRes = await plaidClient.accountsGet({ access_token });
    const institution_id = accountsRes.data.item.institution_id ?? 'unknown';

    let institution_name = 'Unknown Institution';
    try {
      if (institution_id !== 'unknown') {
        const instRes = await plaidClient.institutionsGetById({ institution_id, country_codes: ['US' as any] });
        institution_name = instRes.data.institution.name;
      }
    } catch {}

    for (const account of accountsRes.data.accounts) {
      insertAccount({
        id: account.account_id, item_id, access_token,
        institution_name, account_name: account.name,
        account_type: account.type, mask: account.mask ?? null,
        current_balance: account.balances.current ?? null,
        available_balance: account.balances.available ?? null,
      });
    }

    syncTransactions(item_id).catch(console.error);
    return NextResponse.json({ success: true, account_count: accountsRes.data.accounts.length });
  } catch (err: any) {
    console.error('exchange-token error:', err?.response?.data ?? err);
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 });
  }
}
