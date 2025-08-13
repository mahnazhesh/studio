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
    throw new Error("Plisio API key is not configured in .env file.");
  }
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("The NEXT_PUBLIC_APP_URL environment variable is not set.");
  }
  
  // This is the server-to-server webhook URL. Plisio sends a POST here in the background.
  const callbackUrl = `${appUrl}/api/payment-callback`;
  
  // These URLs are for redirecting the user's browser after payment.
  const successUrl = `${appUrl}/payment/success`;
  const failUrl = `${appUrl}/payment/failed`;

  const params = new URLSearchParams({
    api_key: apiKey,
    currency: payload.currency,
    source_currency: 'USD',
    source_amount: payload.amount,
    order_name: payload.orderName,
    order_number: payload.orderNumber,
    email: payload.email,
    callback_url: callbackUrl,
    success_url: successUrl,
    fail_url: failUrl,
  });

  try {
    const response = await fetch('https://api.plisio.net/api/v1/invoices/new?' + params.toString());
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error("Plisio API responded with an error:", errorData);
        throw new Error(errorData.data?.message || `Plisio API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error("Plisio API call failed:", error);
    const errorMessage = error instanceof Error ? error.message : 'Could not connect to the payment provider.';
    return {
      status: 'error',
      data: {
        message: errorMessage
      }
    };
  }
}
