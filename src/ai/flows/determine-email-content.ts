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
});
export type DetermineEmailContentOutput = z.infer<typeof DetermineEmailContentOutputSchema>;

export async function determineEmailContent(input: DetermineEmailContentInput): Promise<DetermineEmailContentOutput> {
  return determineEmailContentFlow(input);
}

const getEmailContent = ai.defineTool(
  {
    name: 'getEmailContent',
    description: 'Retrieves a unique email body (config) and price from a Google Sheet. If the purchase is successful, it deletes the used row.',
    inputSchema: z.object({
      productName: z.string().describe('The name of the product purchased.'),
      // This tells the script whether to just get the price or to get the config and delete the row.
      shouldDelete: z.boolean().describe('If true, fetches one config and deletes the row. If false, just gets the price.'),
    }),
    outputSchema: z.object({
      emailBody: z.string().describe('The unique config/email body from the sheet.'),
      priceUSD: z.number().describe('The price of the product in USD.'),
    }),
  },
  async (input) => {
    const webAppUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!webAppUrl) {
        throw new Error("Google Apps Script URL is not configured in .env file.");
    }
    // The Google Apps Script will handle fetching, and deleting if necessary.
    console.log('Calling google app script with input:', input);
    const response = await fetch(
      `${webAppUrl}?productName=${encodeURIComponent(input.productName)}&shouldDelete=${input.shouldDelete}`
    );

    const data = await response.json();
    console.log('google app script returned:', data);
    
    if (data.error) {
        throw new Error(data.error);
    }

    // When just fetching the price, the apps script returns a placeholder emailBody.
    return {
      emailBody: data.emailBody,
      priceUSD: data.priceUSD,
    };
  }
);

const determineEmailContentFlow = ai.defineFlow(
  {
    name: 'determineEmailContentFlow',
    inputSchema: DetermineEmailContentInputSchema,
    outputSchema: DetermineEmailContentOutputSchema,
  },
  async input => {
    // If status is 'success', we should fetch a config and delete it.
    // Otherwise, for 'pending' status, we just need the price.
    const shouldDelete = input.purchaseStatus === 'success';

    const content = await getEmailContent({
      productName: input.productName,
      shouldDelete: shouldDelete,
    });
    
    let subject = "اطلاعات خرید شما";
    if (input.purchaseStatus === 'success') {
        subject = `کانفیگ V2Ray شما آماده است`;
    } else if (input.purchaseStatus === 'pending') {
        subject = `سفارش شما برای کانفیگ V2Ray ثبت شد`;
    } else if (input.purchaseStatus === 'failed') {
        subject = `پرداخت برای کانفیگ V2Ray ناموفق بود`;
    }

    return {
      ...content,
      emailSubject: subject,
    };
  }
);
