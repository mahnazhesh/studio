'use server';

/**
 * @fileOverview A flow to determine the correct email content based on purchase and Plisio payment status.
 *
 * - determineEmailContent - A function that determines the email content.
 * - DetermineEmailContentInput - The input type for the determineEmailContent function.
 * - DetermineEmailContentOutput - The return type for the determineEmailContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetermineEmailContentInputSchema = z.object({
  purchaseStatus: z
    .string()
    .describe('The status of the purchase (e.g., success, pending, failed).'),
  paymentStatus: z
    .string()
    .describe('The status of the Plisio payment (e.g., confirmed, unconfirmed).'),
  productName: z.string().describe('The name of the product purchased.'),
  email: z.string().email().describe('The user email address.'),
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
    description: 'Retrieves email content and price from a Google Sheet based on purchase and payment status.',
    inputSchema: z.object({
      purchaseStatus: z
        .string()
        .describe('The status of the purchase (e.g., success, pending, failed).'),
      paymentStatus: z
        .string()
        .describe('The status of the Plisio payment (e.g., confirmed, unconfirmed).'),
      productName: z.string().describe('The name of the product purchased.'),
    }),
    outputSchema: z.object({
      emailSubject: z.string().describe('The subject of the email.'),
      emailBody: z.string().describe('The body of the email.'),
      priceUSD: z.number().describe('The price of the product in USD.'),
    }),
  },
  async (input) => {
    // TODO: Implement the logic to fetch email content and price from Google Sheet
    // using Google Apps Script or a similar method.
    // This is a placeholder implementation.
    console.log('Calling google app script', input);
    const response = await fetch(
      `https://script.google.com/macros/s/AKfycbyqLfSwQ7GmK5g0-cB4hfBfHTU0NfGG1-u7tt3viNZWglg4Jmo90ymt35wAQwkqsYzcog/exec?purchaseStatus=${input.purchaseStatus}&paymentStatus=${input.paymentStatus}&productName=${input.productName}`
    );

    const data = await response.json();
    console.log('google app script return', data);
    return {
      emailSubject: data.emailSubject ?? 'Your Purchase',
      emailBody: data.emailBody ?? 'Thank you for your purchase!',
      priceUSD: data.priceUSD ?? 0.0,
    };
  }
);

const determineEmailContentPrompt = ai.definePrompt({
  name: 'determineEmailContentPrompt',
  tools: [getEmailContent],
  input: {schema: DetermineEmailContentInputSchema},
  output: {schema: DetermineEmailContentOutputSchema},
  prompt: `Determine the appropriate email content based on the purchase and payment status.

  The user's email is: {{{email}}}

  Use the getEmailContent tool to retrieve the email subject, body, and product price.

  Purchase Status: {{{purchaseStatus}}}
  Payment Status: {{{paymentStatus}}}
  Product Name: {{{productName}}}`, 
});

const determineEmailContentFlow = ai.defineFlow(
  {
    name: 'determineEmailContentFlow',
    inputSchema: DetermineEmailContentInputSchema,
    outputSchema: DetermineEmailContentOutputSchema,
  },
  async input => {
    const {output} = await determineEmailContentPrompt(input);
    return output!;
  }
);
