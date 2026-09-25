// On-stream alerts for new sales, via a MixItUp webhook (owner/Merr, 2026-09-24).
// Ko-fi can only send its webhook to one URL and /api/kofi-webhook needs it for
// the Notion Orders rows, so both webhook routes forward a normalized event here
// instead — one MixItUp command covers Ko-fi and merrbakes.com alike.
// - new signups only, never renewals (weekly Tweat / monthly Ko-fi charges)
// - no buyer messages or amounts on stream; items are listed without quantities
// - name: the "name shown on stream" they typed at checkout, else "Anonymous"
//   (owner, 2026-09-25 — previously fell back to their first name from Stripe)
//
// MIXITUP_WEBHOOK_URL is MixItUp's webhook trigger URL (it embeds a secret —
// anyone holding it can fire the alert). Unset = alerts off.

import { alertPhrases } from '@/content/shoutout';

export type StreamAlertKind = 'purchase' | 'subscription' | 'donation';

export type StreamAlert = {
  source: 'Ko-fi' | 'merrbakes.com';
  kind: StreamAlertKind;
  name: string;
  summary: string; // items bought / club tier; empty for donations
};

// item names ("Morning Buns! — trio of buns") → one line, repeats dropped
export function alertSummary(itemNames: string[]): string {
  return Array.from(new Set(itemNames.map((n) => n.trim()).filter(Boolean))).join(', ');
}

const ANONYMOUS = 'Anonymous';

export const STREAM_NAME_MAX = 30;

// free text from the checkout form: single line, trimmed, capped
export function cleanStreamName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, STREAM_NAME_MAX);
}

export function streamName(chosenName: string): string {
  return chosenName || ANONYMOUS;
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
      // phrase = ready-made wording per kind, so Merr's MixItUp command can be
      // one line ("{name} {phrase} {summary}") with no conditions
      body: JSON.stringify({ ...alert, phrase: alertPhrases[alert.kind] }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.log('stream alert: MixItUp returned', res.status);
  } catch (error) {
    console.log('stream alert failed:', (error as Error).message);
  }
}
