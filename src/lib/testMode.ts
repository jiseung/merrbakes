// A test-mode Stripe key means a local/test run (the owner's dev server, a test
// worktree). Anything that reaches Merr's real world is switched off then:
// Notion writes (lib/notion notionWrite), Discord notifications
// (lib/discordNotify) and on-stream alerts (lib/streamAlert) — owner, 2026-10-03,
// after a test webhook posted a fake order to Merr's Discord.
export function isStripeTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? '').includes('_test_');
}
