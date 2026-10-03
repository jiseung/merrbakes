// Phone notifications for Merr, via a Discord webhook into a private channel
// (owner, 2026-09-30). One message per new Orders row — Ko-fi or merrbakes.com,
// signups and renewals alike, since each is a box to pack — one per
// contact-form query, and one per membership cancellation step. Unlike the stream alerts (lib/streamAlert) these are
// private, so they carry the buyer's real name, quantities and the total.
// Shipping addresses and emails stay in Notion.
//
// DISCORD_ORDER_WEBHOOK_URL is the channel's webhook URL (it embeds a secret —
// anyone holding it can post there). Unset = notifications off. Also off under
// a test-mode Stripe key (lib/testMode).

import { CONTACT_QUERIES_DB_ID } from '@/lib/notion';
import { isStripeTestMode } from '@/lib/testMode';

const notionDbLink = (id: string) => `https://www.notion.so/${id.replace(/-/g, '')}`;

export type OrderNotice = {
  source: 'Ko-fi' | 'merrbakes.com';
  label?: string; // e.g. "renewal", "club signup" — shown after the source
  buyer: string;
  items: string[]; // "2x Morning Buns (trio)"
  total: number;
  currency?: string;
  orderedOn: string; // ISO timestamp
};

export type ContactNotice = {
  name: string;
  message: string;
  sentOn: string; // ISO timestamp
};

function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

// Discord renders <t:unix:f> in the reader's own timezone ("September 30, 2026 3:04 PM")
function discordTime(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? iso : `<t:${Math.floor(ms / 1000)}:f>`;
}

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

// Never throws and never takes long: a failed notification must not fail the
// webhook, or Ko-fi/Stripe would retry and the order logic would run again.
async function post(body: object): Promise<void> {
  const url = process.env.DISCORD_ORDER_WEBHOOK_URL?.trim();
  if (!url) return;
  if (isStripeTestMode()) {
    console.log('discord notify skipped (test-mode Stripe key)');
    return;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // buyer-typed text must never ping @everyone / roles / users
      body: JSON.stringify({ ...body, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.log('discord notify: Discord returned', res.status);
  } catch (error) {
    console.log('discord notify failed:', (error as Error).message);
  }
}

export async function notifyNewOrder(order: OrderNotice): Promise<void> {
  const ordersDbId = process.env.NOTION_ORDERS_DB_ID;
  const heading = `🛒 New order — ${order.source}${order.label ? ` (${order.label})` : ''}`;
  const lines = [
    `**Buyer:** ${order.buyer || '(no name)'}`,
    `**Items:**`,
    ...(order.items.length ? order.items.map((i) => `• ${i}`) : ['• (no items listed)']),
    `**Total:** ${formatMoney(order.total, order.currency)}`,
    `**Ordered:** ${discordTime(order.orderedOn)}`,
  ];
  if (ordersDbId) lines.push(`[Open Orders in Notion](${notionDbLink(ordersDbId)})`);
  await post({
    embeds: [{
      title: clip(heading, 256),
      description: clip(lines.join('\n'), 4000),
      color: order.source === 'Ko-fi' ? 0x29abe0 : 0xe0598b,
    }],
  });
}

export type MembershipNotice = {
  phase: 'scheduled' | 'ended' | 'undone';
  source: 'Ko-fi' | 'merrbakes.com' | 'Stripe';
  member: string;
  membership: string;
  date?: number; // unix seconds: last day (scheduled) or when it ended
  reason?: string;
  subscriptionId: string;
};

const MEMBERSHIP_HEADINGS: Record<MembershipNotice['phase'], string> = {
  scheduled: '⚠️ Membership cancelling',
  ended: '❌ Membership ended',
  undone: '✅ Cancellation undone',
};

// owner, 2026-09-30: Ko-fi memberships included; notify when a cancellation is
// scheduled and again when it actually ends
export async function notifyMembershipChange(m: MembershipNotice): Promise<void> {
  const lines = [
    `**Member:** ${m.member || '(no name)'}`,
    `**Membership:** ${m.membership || '(unknown)'}`,
  ];
  if (m.date) lines.push(`**${m.phase === 'ended' ? 'Ended' : m.phase === 'scheduled' ? 'Ends' : 'Renews'}:** <t:${m.date}:D>`);
  if (m.reason) lines.push(`**Reason:** ${m.reason}`);
  lines.push(`[Open in Stripe](https://dashboard.stripe.com/subscriptions/${m.subscriptionId})`);
  await post({
    embeds: [{
      title: `${MEMBERSHIP_HEADINGS[m.phase]} — ${m.source}`,
      description: clip(lines.join('\n'), 4000),
      color: m.phase === 'undone' ? 0x57b36b : m.phase === 'ended' ? 0x8b5a3c : 0xe89a3c,
    }],
  });
}

export async function notifyContactQuery(query: ContactNotice): Promise<void> {
  await post({
    embeds: [{
      title: '💌 New custom-order message',
      description: clip([
        `**From:** ${query.name}`,
        `**Sent:** ${discordTime(query.sentOn)}`,
        '',
        clip(query.message, 1500),
        '',
        `[Open contact queries in Notion](${notionDbLink(CONTACT_QUERIES_DB_ID)})`,
      ].join('\n'), 4000),
      color: 0xf5c542,
    }],
  });
}
