import { createHmac, createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Single shared password for Merr's /admin pages (owner decision, 2026-09-23):
// SYNC_PAGE_PASSWORD in .env.local. Entering it once sets a long-lived httpOnly
// cookie so she isn't asked again on the same browser. The cookie holds an HMAC
// derived from the password, never the password itself — changing the password
// logs everyone out.

const COOKIE = 'merrbakes_admin';
const MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

function password(): string | null {
  return process.env.SYNC_PAGE_PASSWORD || null;
}

function token(pw: string): string {
  return createHmac('sha256', pw).update('merrbakes-admin-v1').digest('hex');
}

// hash both sides first so timingSafeEqual gets equal-length buffers
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isAdmin(req: NextRequest): boolean {
  const pw = password();
  const cookie = req.cookies.get(COOKIE)?.value;
  return !!pw && !!cookie && safeEqual(cookie, token(pw));
}

export function checkPassword(attempt: unknown): boolean {
  const pw = password();
  return !!pw && typeof attempt === 'string' && safeEqual(attempt, pw);
}

export function setAdminCookie(res: NextResponse): void {
  const pw = password();
  if (!pw) return;
  res.cookies.set(COOKIE, token(pw), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}
