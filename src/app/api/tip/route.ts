import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { standaloneTipPrice } from '@/lib/tips';

// Standalone "tip merr" (footer link): straight to a Stripe checkout holding
// only the tip — the buyer types the amount and can leave a note (visible in
// Stripe). Not recorded in Notion; /api/stripe-webhook only sends the stream alert.
export async function GET(req: NextRequest) {
  try {
    const origin = new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: await standaloneTipPrice(), quantity: 1 }],
      custom_fields: [
        {
          key: 'note',
          label: { type: 'custom', custom: 'note for merr (optional)' },
          type: 'text',
          optional: true,
          text: { maximum_length: 255 },
        },
        {
          // same "name shown on stream" idea as the cart/club forms (lib/streamAlert)
          key: 'stream_name',
          label: { type: 'custom', custom: 'name shown on stream (optional)' },
          type: 'text',
          optional: true,
          text: { maximum_length: 30 },
        },
      ],
      metadata: { tip: 'standalone' },
      success_url: `${origin}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch (error) {
    console.log('tip error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
