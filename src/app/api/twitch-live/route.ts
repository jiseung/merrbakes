import { NextResponse } from 'next/server';
import { isChannelLive } from '@/lib/twitch';

export async function GET() {
  try {
    const isLive = await isChannelLive('merrbakes');
    return NextResponse.json({ isLive });
  } catch (error) {
    console.log('twitch-live:', error);
    // fail closed — better to hide a real live stream than to show a fake one
    return NextResponse.json({ isLive: false }, { status: 500 });
  }
}
