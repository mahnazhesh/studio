'use server';

import { z } from 'zod';
import { determineEmailContent } from '@/ai/flows/determine-email-content';
import { createPlisioInvoice } from '@/lib/plisio';

type State = {
  error: string | null;
  transactionUrl: string | null;
};

const emailSchema = z.string().email({ message: "Invalid email address." });

const PRODUCT_NAME = 'V2Ray Config';

export async function getProductInfo(): Promise<{ price: number; stock: number }> {
  try {
     const emailContent = await determineEmailContent({
      productName: PRODUCT_NAME,
      email: 'pricecheck@example.com', // Dummy email for price check
      purchaseStatus: 'pending', // 'pending' maps to 'getInfo' action
    });

    if (typeof emailContent.priceUSD === 'number' && typeof emailContent.stockCount === 'number') {
      return { price: emailContent.priceUSD, stock: emailContent.stockCount };
    }
    console.error("getProductInfo Error: Received invalid data from flow", emailContent);
    // Provide a more specific error if data is invalid but the call succeeded
    throw new Error('Product data received from the source is not valid. Check sheet contents and script logic.');
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
    console.error("getProductInfo Error:", errorMessage);
    throw new Error(`Could not fetch product info. Details: ${errorMessage}`);
  }
}

export async function createInvoiceAction(prevState: State, formData: FormData): Promise<State> {
  const email = formData.get('email') as string;

  const validation = emailSchema.safeParse(email);
  if (!validation.success) {
    return { error: validation.error.errors[0].message, transactionUrl: null };
  }

  try {
    // 1. Get price and check stock from Google Sheet via the AI flow.
    const productInfo = await determineEmailContent({
      productName: PRODUCT_NAME,
      email,
      purchaseStatus: 'pending', // 'pending' maps to 'getInfo' action
    });

    if (typeof productInfo.priceUSD !== 'number' || productInfo.priceUSD <= 0) {
      throw new Error('Could not determine product price. Please try again later.');
    }
    
    if (typeof productInfo.stockCount !== 'number' || productInfo.stockCount <= 0) {
       throw new Error('موجودی محصول به اتمام رسیده است.');
    }
    
    // 2. Create an invoice with Plisio
    const invoice = await createPlisioInvoice({
        amount: productInfo.priceUSD.toString(),
        currency: 'USD',
        orderName: PRODUCT_NAME,
        orderNumber: `${PRODUCT_NAME}-${Date.now()}`,
        email: email,
    });
    
    if (invoice.status === 'success' && invoice.data?.invoice_url) {
      // 3. Return the URL for redirection
      return { error: null, transactionUrl: invoice.data.invoice_url };
    } else {
      throw new Error(invoice.data?.message || 'Failed to create payment invoice.');
    }

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
    console.error("createInvoiceAction Error:", errorMessage);
    return { error: errorMessage, transactionUrl: null };
  }
}
