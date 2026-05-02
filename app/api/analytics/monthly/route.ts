import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { subMonths, format, startOfMonth } from 'date-fns';

export async function GET(req: NextRequest) {
  const months = Number(req.nextUrl.searchParams.get('months') ?? 12);
  const db = getDb();
  const results: Array<{ month: string; total: number }> = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(startOfMonth(now), i);
    const month = format(date, 'yyyy-MM');
    const row = db.prepare("SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total FROM transactions WHERE strftime('%Y-%m', date) = ? AND pending = 0").get(month) as any;
    results.push({ month, total: row.total });
  }
  return NextResponse.json(results);
}
