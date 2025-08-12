// In a real-world scenario, you would use the official Plisio API.
// This is a mocked version for demonstration purposes.

type PlisioInvoicePayload = {
  amount: string;
  currency: 'LTC'; // Only LTC is supported
  orderName: string;
  orderNumber: string;
  email: string;
};

export async function createPlisioInvoice(payload: PlisioInvoicePayload) {
  const apiKey = process.env.PLISIO_SECRET_KEY;
  if (!apiKey) {
    throw new Error("Plisio API key is not configured.");
  }
  
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment-callback`;

  const params = new URLSearchParams({
    api_key: apiKey,
    currency: payload.currency, // e.g., 'LTC'
    source_currency: 'USD', // The currency of the amount in your sheet
    source_amount: payload.amount,
    order_name: payload.orderName,
    order_number: payload.orderNumber,
    email: payload.email,
    callback_url: callbackUrl,
    // You might want to add success_url and fail_url to redirect the user
    // after payment completion or failure from the Plisio page.
    // success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    // fail_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failed`,
  });

  try {
    const response = await fetch('https://api.plisio.net/api/v1/invoices/new?' + params.toString());
    const data = await response.json();
    
    // The Plisio API response structure might be different.
    // This is based on common API patterns.
    // Example success response: { status: "success", data: { txn_id: "...", invoice_url: "..." } }
    // Example error response: { status: "error", data: { message: "..." } }
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
