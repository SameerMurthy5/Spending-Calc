import { NextRequest, NextResponse } from 'next/server';
import { updateCategory } from '@/lib/queries/categories';
import { z } from 'zod';

const schema = z.object({
  display_name: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  updateCategory(Number(params.id), parsed.data);
  return NextResponse.json({ success: true });
}
