import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { revalidatePath } from "next/cache";
import { KofiAPIResponseType, KofiItemType } from '../types';

// Utility function to handle CORS
function handleCors(req: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Origin', '*'); // Change '*' to a specific domain for security
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return headers;
}

const thumbnail = 'https://storage.ko-fi.com/cdn/useruploads/display/';
const store = 'https://ko-fi.com/s/';
// API route handler
export async function GET(req: NextRequest) {
  revalidatePath(req.url);
  const headers = handleCors(req);
  try {
    // Make a GET request to external website
    const externalResponse = await fetch('https://ko-fi.com/shop/T6T4XU0H6/items/0/50?productType=0', {
      method: 'GET'
    });
    const data = await externalResponse.json();

    var res: KofiItemType[] = [];
    data.map((item: KofiAPIResponseType) => {
      if (item.Name.toLowerCase().indexOf('merrfiliate') == -1) {
        const preorderIndex = item.Name.toLowerCase().indexOf('(pre-order)');
        res.push({
          name: preorderIndex > -1 ? item.Name.substring(0, preorderIndex) : item.Name,
          price: item.Price,
          flexiblePrice: item.IsPayWhatYouWant,
          link: `${store}${item.Alias}`,
          image: `${thumbnail}${item.ThumbnailUrls[0]}`,
          desc: item.Description,
          isSoldOut: item.IsSoldOut,
          stock: item.ItemsAvailable,
          preorder: preorderIndex > -1
        });
      }
    });

    // Return the external data in the response to the client
    return new NextResponse(JSON.stringify({ data: res }), { headers });

  } catch (error) {
    // Handle errors (e.g., network issues, API failures)
    const err = error as Error;
    console.log(err.stack);
    return new NextResponse(JSON.stringify({ error: 'Error fetching data' }), { headers, status: 500 });
  }
}