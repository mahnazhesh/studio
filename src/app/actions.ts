'use server';

import { z } from 'zod';
import { determineEmailContent } from '@/ai/flows/determine-email-content';
import { createPlisioInvoice } from '@/lib/plisio';

type State = {
  error: string | null;
  transactionUrl: string | null;
};

const emailSchema = z.string().email({ message: "Invalid email address." });

export async function createInvoiceAction(prevState: State, formData: FormData): Promise<State> {
  const email = formData.get('email') as string;

  const validation = emailSchema.safeParse(email);
  if (!validation.success) {
    return { error: validation.error.errors[0].message, transactionUrl: null };
  }

  const productName = 'V2Ray Config';

  try {
    // 1. Get price from Google Sheet via the AI flow.
    // We pass 'pending' because we only need the price at this stage.
    const emailContent = await determineEmailContent({
      productName,
      email,
      purchaseStatus: 'pending',
    });

    if (typeof emailContent.priceUSD !== 'number' || emailContent.priceUSD <= 0) {
      throw new Error('Could not determine product price. Please try again later.');
    }
    
    // 2. Create an invoice with Plisio
    const invoice = await createPlisioInvoice({
        amount: emailContent.priceUSD.toString(),
        currency: 'USD',
        orderName: productName,
        orderNumber: `${productName}-${Date.now()}`,
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
