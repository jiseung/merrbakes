// App access token via the client_credentials flow — cached in memory for the
// life of the server process so every live-status check doesn't re-auth with
// Twitch (tokens are valid for tens of days).
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_DEV_CLIENT_ID!,
      client_secret: process.env.TWITCH_DEV_SECRET!,
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`Twitch token request failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  // knock 60s off the real expiry so a token never gets used right as it lapses
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

export async function isChannelLive(userLogin: string): Promise<boolean> {
  const token = await getAppAccessToken();
  const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(userLogin)}`, {
    headers: {
      'Client-Id': process.env.TWITCH_DEV_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Twitch streams request failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data.data) && data.data.length > 0;
}
