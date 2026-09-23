import { NextRequest, NextResponse } from 'next/server';
import { runReconcile } from '@/lib/reconcile';

// Cron/webhook entry point for the Notion -> Stripe sync (logic lives in
// src/lib/reconcile.ts). Meant to be hit on a schedule (droplet crontab) and/or
// by a Notion webhook once one's registered; auth is a bearer secret, not a
// Notion signature, since it's triggered externally rather than by Notion itself.
// Merr's manual trigger is /admin/sync (password-protected), not this route.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!process.env.RECONCILE_SECRET || authHeader !== `Bearer ${process.env.RECONCILE_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const report = await runReconcile();
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const err = error as Error;
    console.log('notion-reconcile error:', err.stack);
    return NextResponse.json({ error: 'internal error', message: err.message }, { status: 500 });
  }
}
