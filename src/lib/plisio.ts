// This file configures the payment invoice for Plisio.

type PlisioInvoicePayload = {
  amount: string;
  currency: 'LTC';
  orderName: string;
  orderNumber: string;
  email: string;
};

export async function createPlisioInvoice(payload: PlisioInvoicePayload) {
  const apiKey = process.env.PLISIO_SECRET_KEY;
  if (!apiKey) {
    throw new Error("Plisio API key is not configured.");
  }
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured in .env file.");
  }
  
  // This is the server-to-server webhook URL. Plisio sends a POST here.
  const callbackUrl = `${appUrl}/api/payment-callback`;

  const params = new URLSearchParams({
    api_key: apiKey,
    currency: payload.currency,
    source_currency: 'USD',
    source_amount: payload.amount,
    order_name: payload.orderName,
    order_number: payload.orderNumber,
    email: payload.email,
    callback_url: callbackUrl,
    // These URLs are for redirecting the user's browser after payment.
    success_url: `${appUrl}/payment/success`,
    fail_url: `${appUrl}/payment/failed`,
  });

  try {
    const response = await fetch('https://api.plisio.net/api/v1/invoices/new?' + params.toString());
    const data = await response.json();
    
    return data;

  } catch (error) {
    console.error("Plisio API call failed:", error);
    return {
      status: 'error',
      data: {
        message: 'Could not connect to the payment provider.'
      }
    };
  }
}
