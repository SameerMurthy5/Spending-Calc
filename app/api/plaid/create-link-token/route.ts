import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid/client';
import { CountryCode, Products } from 'plaid';

export async function POST() {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'local-user' },
      client_name: 'Spending Calc',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      redirect_uri: process.env.PLAID_REDIRECT_URI,
    });
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err: any) {
    console.error('create-link-token error:', err?.response?.data ?? err);
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 });
  }
}
