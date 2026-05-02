import { NextRequest, NextResponse } from 'next/server';
import { getBudgets, createBudget } from '@/lib/queries/budgets';
import { z } from 'zod';

const createSchema = z.object({
  category_id: z.number().int().positive(),
  monthly_limit: z.number().positive(),
  alert_threshold: z.number().min(0).max(1).optional(),
});

export async function GET(req: NextRequest) {
  return NextResponse.json(getBudgets(req.nextUrl.searchParams.get('month') ?? undefined));
}

export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const result = createBudget(parsed.data);
  return NextResponse.json({ success: true, id: result.lastInsertRowid });
}
