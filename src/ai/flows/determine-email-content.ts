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
    .describe('The status of the purchase (e.g., success, pending, failed).'),
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
      action: z.enum(['getInfo', 'getConfig']).describe("Action to perform: 'getInfo' to get price and stock, 'getConfig' to fetch a config and delete the row."),
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
      action: input.action,
    });
    
    // Check if the base URL already has query params
    const finalUrl = webAppUrl.includes('?') 
      ? `${webAppUrl}&${params.toString()}`
      : `${webAppUrl}?${params.toString()}`;


    console.log('Calling Google Apps Script with URL:', finalUrl);

    const response = await fetch(finalUrl, {
      redirect: 'follow', // Important for Apps Script web apps
      cache: 'no-store', // Disable caching for stock checks
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
    // If status is 'success', get the config. Otherwise, just get info.
    const action = input.purchaseStatus === 'success' ? 'getConfig' : 'getInfo';

    const content = await getEmailContent({
      productName: input.productName,
      action: action,
    });

    if (typeof content.priceUSD !== 'number' || content.priceUSD < 0) {
      console.error("Invalid price received from tool:", content);
      throw new Error('Failed to retrieve a valid price from the data source. Please check the Google Apps Script and the Google Sheet setup.');
    }
    
    // تعیین موضوع ایمیل بر اساس وضعیت پرداخت
    let subject = "اطلاعات خرید شما";
    if (input.purchaseStatus === 'success') {
        subject = `کانفیگ V2Ray شما آماده است`;
    } else if (input.purchaseStatus === 'pending') {
        subject = `سفارش شما برای کانفیگ V2Ray ثبت شد`;
    } else if (input.purchaseStatus === 'failed') {
        subject = `پرداخت برای کانفیگ V2Ray ناموفق بود`;
    }

    return {
      // اگر در حالت‌های ناموفق یا بررسی قیمت، بدنه ایمیل وجود نداشت، یک متن پیش‌فرض قرار می‌دهیم
      emailBody: content.emailBody || 'پرداخت شما موفقیت‌آمیز نبود. در صورت کسر وجه، با پشتیبانی تماس بگیرید.',
      priceUSD: content.priceUSD,
      emailSubject: subject,
      stockCount: content.stockCount,
    };
  }
);
