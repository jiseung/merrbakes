// On-stream alerts for new sales, via a MixItUp webhook (owner/Merr, 2026-09-24).
// Ko-fi can only send its webhook to one URL and /api/kofi-webhook needs it for
// the Notion Orders rows, so both webhook routes forward a normalized event here
// instead — one MixItUp command covers Ko-fi and merrbakes.com alike.
// - new signups only, never renewals (weekly Tweat / monthly Ko-fi charges)
// - no buyer messages on stream
// - name: "Anonymous" if they opted out, else their Twitch handle, else first name
//
// MIXITUP_WEBHOOK_URL is MixItUp's webhook trigger URL (it embeds a secret —
// anyone holding it can fire the alert). Unset = alerts off.

export type StreamAlertKind = 'purchase' | 'subscription' | 'donation';

export type StreamAlert = {
  source: 'Ko-fi' | 'merrbakes.com';
  kind: StreamAlertKind;
  name: string;
  amount: number;
  summary: string; // items bought / club tier; empty for donations
};

const ANONYMOUS = 'Anonymous';

// Twitch logins are 4–25 chars of letters, digits and underscores
export function cleanTwitchHandle(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const handle = raw.trim().replace(/^@/, '').replace(/^(https?:\/\/)?(www\.)?twitch\.tv\//i, '');
  return /^[A-Za-z0-9_]{1,25}$/.test(handle) ? handle : '';
}

export function streamName(opts: { anonymous?: boolean; twitchHandle?: string; fullName?: string | null }): string {
  if (opts.anonymous) return ANONYMOUS;
  if (opts.twitchHandle) return opts.twitchHandle;
  const first = (opts.fullName ?? '').trim().split(/\s+/)[0];
  return first || ANONYMOUS;
}

// Ko-fi's from_name is the supporter's own public display name, so it's shown
// as-is; is_public=false (they asked to keep it private) shows as Anonymous.
export function kofiStreamName(fromName: string, isPublic: boolean): string {
  return isPublic && fromName.trim() ? fromName.trim() : ANONYMOUS;
}

// Never throws and never takes long: an alert that fails must not fail the
// webhook, or Ko-fi/Stripe would retry and the order logic would run again.
export async function sendStreamAlert(alert: StreamAlert): Promise<void> {
  const url = process.env.MIXITUP_WEBHOOK_URL;
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...alert, amountDisplay: `$${alert.amount.toFixed(2)}` }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.log('stream alert: MixItUp returned', res.status);
  } catch (error) {
    console.log('stream alert failed:', (error as Error).message);
  }
}
