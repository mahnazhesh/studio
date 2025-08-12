'use server';

/**
 * @fileOverview A flow to determine the correct email content based on purchase.
 * It fetches a unique config from a Google Sheet and its price.
 *
 * - determineEmailContent - A function that determines the email content.
 * - DetermineEmailContentInput - The input type for the determineEmailContent function.
 * - DetermineEmailContentOutput - The return type for the determineEmailContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetermineEmailContentInputSchema = z.object({
  productName: z.string().describe('The name of the product purchased.'),
  email: z.string().email().describe('The user email address.'),
  // We keep purchaseStatus to decide what to do (e.g., fetch and delete on success)
  purchaseStatus: z
    .string()
    .describe('The status of the purchase (e.g., success, pending).'),
});
export type DetermineEmailContentInput = z.infer<typeof DetermineEmailContentInputSchema>;

const DetermineEmailContentOutputSchema = z.object({
  emailSubject: z.string().describe('The subject of the email.'),
  emailBody: z.string().describe('The body of the email.'),
  priceUSD: z.number().describe('The price of the product in USD.'),
  stockCount: z.number().optional().describe('The number of items in stock.'),
});
export type DetermineEmailContentOutput = z.infer<typeof DetermineEmailContentOutputSchema>;

export async function determineEmailContent(input: DetermineEmailContentInput): Promise<DetermineEmailContentOutput> {
  return determineEmailContentFlow(input);
}

const getEmailContent = ai.defineTool(
  {
    name: 'getEmailContent',
    description: 'Retrieves a unique email body (config) and price from a Google Sheet. If the purchase is successful, it deletes the used row. It can also return the stock count.',
    inputSchema: z.object({
      productName: z.string().describe('The name of the product purchased.'),
      // This tells the script whether to just get the price or to get the config and delete the row.
      shouldDelete: z.boolean().describe('If true, fetches one config and deletes the row. If false, just gets the price and stock count.'),
    }),
    outputSchema: z.object({
      emailBody: z.string().optional().describe('The unique config/email body from the sheet.'),
      priceUSD: z.number().optional().describe('The price of the product in USD.'),
      stockCount: z.number().optional().describe('The number of available items.'),
    }),
  },
  async (input) => {
    const webAppUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!webAppUrl) {
        throw new Error("Google Apps Script URL is not configured in .env file.");
    }
    
    const params = new URLSearchParams({
      productName: input.productName,
      action: input.shouldDelete ? 'getConfig' : 'getInfo',
    });

    // Correctly construct the URL, handling if webAppUrl already has query params.
    const finalUrl = webAppUrl.includes('?') 
        ? `${webAppUrl}&${params.toString()}`
        : `${webAppUrl}?${params.toString()}`;

    console.log('Calling Google Apps Script with URL:', finalUrl);

    const response = await fetch(finalUrl, {
      redirect: 'follow', // Important for Apps Script web apps
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Apps Script responded with an error:', response.status, errorText);
        throw new Error(`Google Apps Script request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Google Apps Script returned:', data);
    
    if (data.error) {
        throw new Error(`Error from Google Apps Script: ${data.error}`);
    }

    return {
      emailBody: data.emailBody,
      priceUSD: data.priceUSD,
      stockCount: data.stockCount,
    };
  }
);

const determineEmailContentFlow = ai.defineFlow(
  {
    name: 'determineEmailContentFlow',
    inputSchema: DetermineEmailContentInputSchema,
    outputSchema: DetermineEmailContentOutputSchema,
  },
  async (input) => {
    // If status is 'success', we should fetch a config and delete it.
    // Otherwise, for 'pending' status, we just need the price.
    const shouldDelete = input.purchaseStatus === 'success';

    const content = await getEmailContent({
      productName: input.productName,
      shouldDelete: shouldDelete,
    });

    if (typeof content.priceUSD !== 'number' || content.priceUSD <= 0) {
      console.error("Invalid price received from tool:", content);
      throw new Error('Failed to retrieve a valid price from the data source. Please check the Google Apps Script and the Google Sheet setup.');
    }
    
    let subject = "اطلاعات خرید شما";
    if (input.purchaseStatus === 'success') {
        subject = `کانفیگ V2Ray شما آماده است`;
    } else if (input.purchaseStatus === 'pending') {
        subject = `سفارش شما برای کانفیگ V2Ray ثبت شد`;
    } else if (input.purchaseStatus === 'failed') {
        subject = `پرداخت برای کانفیگ V2Ray ناموفق بود`;
    }

    return {
      // If emailBody is missing (e.g. price check), provide a default value.
      emailBody: content.emailBody || 'body for price/stock check',
      priceUSD: content.priceUSD,
      emailSubject: subject,
      stockCount: content.stockCount,
    };
  }
);
