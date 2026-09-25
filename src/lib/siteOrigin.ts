import { NextRequest } from 'next/server';

// The site's public origin for links we hand to Stripe (checkout success/cancel
// URLs). Behind nginx, req.url is the internal address (http://localhost:3001),
// so use the Host / X-Forwarded-Proto headers nginx passes on instead — found
// in the first production rehearsal, 2026-09-25, when buyers were sent back
// to https://localhost:3001/order/…
export function siteOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!host) return new URL(req.url).origin;
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0].trim()
    ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`;
}
