import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    // Parse the incoming request body as JSON
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email not provided' }, { status: 400 });
    }

    // Define the path where the email will be stored
    const filePath = path.join(process.cwd(), 'emails.txt');

    // Append the email to the file with a newline
    await fs.appendFile(filePath, `${email}\n`);

    // Return a success response
    return NextResponse.json({ success: true, message: 'Email saved successfully' });
  } catch (error) {
    const err = error as Error;
    console.log(err.stack);
    // Handle errors and return a failure response
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
