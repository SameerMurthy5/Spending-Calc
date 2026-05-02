import { NextRequest, NextResponse } from 'next/server';
import { updateBudget, deleteBudget } from '@/lib/queries/budgets';
import { z } from 'zod';

const updateSchema = z.object({
  monthly_limit: z.number().positive().optional(),
  alert_threshold: z.number().min(0).max(1).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  updateBudget(Number(params.id), parsed.data);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  deleteBudget(Number(params.id));
  return NextResponse.json({ success: true });
}
