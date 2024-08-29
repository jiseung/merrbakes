import { NextRequest, NextResponse } from 'next/server';

// Replace this with your long-lived access token
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID;

// Instagram API endpoint for fetching user's media
const INSTAGRAM_API_URL = `https://graph.instagram.com/me/media?fields=id,caption,media_url,thumbnail_url,timestamp,permalink&access_token=${ACCESS_TOKEN}`;


// API route handler for GET requests
export async function GET(req: NextRequest) {
  try {
    // Make the request to the Instagram API to fetch user's media (posts)
    const response = await fetch(INSTAGRAM_API_URL);

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`Instagram API returned status ${response.status}`);
    }

    // Parse the JSON response from Instagram API
    const data = await response.json();

    // Return the data as JSON
    return NextResponse.json({ success: true, posts: data.data });
  } catch (error) {
    // Handle errors and return a failure response
    const err = error as Error;
    console.log(err.stack);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
