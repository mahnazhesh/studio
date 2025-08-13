// This file centralizes communication with the Google Apps Script Web App.

const PRODUCT_NAME = 'V2Ray Config';

type ProductInfo = {
  price: number;
  stock: number;
};

/**
 * Fetches the current price and stock count from the Google Apps Script.
 */
export async function getProductInfo(): Promise<ProductInfo> {
  const webAppUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!webAppUrl) {
    throw new Error("The Google Apps Script URL is not configured in the .env file.");
  }

  const params = new URLSearchParams({
    action: 'getInfo',
    productName: PRODUCT_NAME,
  });

  const finalUrl = `${webAppUrl}?${params.toString()}`;

  try {
    const response = await fetch(finalUrl, {
      redirect: 'follow',
      cache: 'no-store', // Always get the latest stock count
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`The server responded with an error: ${response.status}. Details: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
        throw new Error(`The Google Apps Script returned an error: ${data.error}`);
    }

    if (typeof data.price !== 'number' || typeof data.stock !== 'number') {
        throw new Error('The data received from the server was incomplete or in the wrong format.');
    }

    return { price: data.price, stock: data.stock };

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    console.error("Failed to fetch product info from Google Apps Script:", errorMessage);
    // Re-throw a user-friendly error
    throw new Error(`Could not connect to the product server. Details: ${errorMessage}`);
  }
}
