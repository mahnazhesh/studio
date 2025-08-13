// This file configures the payment invoice for Plisio and checks transaction status.

type PlisioInvoicePayload = {
  amount: string;
  currency: 'LTC';
  orderName: string;
  orderNumber: string;
  email: string;
};

/**
 * Creates a new payment invoice with Plisio.
 * This is now simplified as we only need the invoice URL.
 */
export async function createPlisioInvoice(payload: PlisioInvoicePayload) {
  const apiKey = process.env.PLISIO_SECRET_KEY;
  if (!apiKey) {
    throw new Error("Plisio API key is not configured in .env file.");
  }
  
  const params = new URLSearchParams({
    api_key: apiKey,
    currency: payload.currency,
    source_currency: 'USD',
    source_amount: payload.amount,
    order_name: payload.orderName,
    order_number: payload.orderNumber,
    email: payload.email,
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
    // Re-throw the error to be caught by the server action
    throw new Error(errorMessage);
  }
}

/**
 * Checks the status of a specific transaction by its ID.
 */
export async function checkPlisioTransactionStatus(txn_id: string) {
    const apiKey = process.env.PLISIO_SECRET_KEY;
    if (!apiKey) {
        throw new Error("Plisio API key is not configured in .env file.");
    }

    const params = new URLSearchParams({
        api_key: apiKey,
    });

    try {
        const response = await fetch(`https://api.plisio.net/api/v1/operations/${txn_id}?` + params.toString());
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Plisio API (check status) responded with an error:", errorData);
            throw new Error(errorData.data?.message || `Plisio API request failed with status ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Plisio API call (check status) failed:", error);
        const errorMessage = error instanceof Error ? error.message : 'Could not connect to the payment provider to check status.';
        throw new Error(errorMessage);
    }
}
