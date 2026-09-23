import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, checkPassword, setAdminCookie } from '@/lib/adminAuth';
import { runReconcile } from '@/lib/reconcile';

// Backs /admin/sync — Merr's "sync now" button for pushing Notion product/price
// edits to Stripe without waiting for the cron. Same sync as /api/notion-reconcile.

// GET — is this browser already signed in? (lets the page skip the password form)
export async function GET(req: NextRequest) {
  return NextResponse.json({ authed: isAdmin(req), configured: !!process.env.SYNC_PAGE_PASSWORD });
}

// POST { action: 'login', password } — sets the cookie on a correct password
// POST { action: 'sync' } — runs the sync (cookie required)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (body.action === 'login') {
    if (!checkPassword(body.password)) {
      // small fixed delay to make guessing slow
      await new Promise((r) => setTimeout(r, 1000));
      return NextResponse.json({ error: 'wrong password' }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    setAdminCookie(res);
    return res;
  }

  if (body.action === 'sync') {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    try {
      const report = await runReconcile();
      return NextResponse.json({ ok: true, report });
    } catch (error) {
      const err = error as Error;
      console.log('admin sync error:', err.stack);
      return NextResponse.json({ error: 'sync failed', message: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
