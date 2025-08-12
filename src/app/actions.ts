'use server';

import { z } from 'zod';
import { determineEmailContent } from '@/ai/flows/determine-email-content';
import { createPlisioInvoice } from '@/lib/plisio';

type State = {
  error: string | null;
  transactionUrl: string | null;
};

const emailSchema = z.string().email({ message: "آدرس ایمیل وارد شده معتبر نیست." });

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
    throw new Error('دیتای محصول دریافت شده از سرور معتبر نیست. ممکن است شیت خالی باشد یا مشکلی در اسکریپت وجود دارد.');
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
    console.error("getProductInfo Error:", errorMessage);
    throw new Error(`امکان دریافت اطلاعات محصول وجود ندارد. جزئیات: ${errorMessage}`);
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
      throw new Error('امکان تشخیص قیمت محصول وجود ندارد. لطفا بعدا تلاش کنید.');
    }
    
    if (typeof productInfo.stockCount !== 'number' || productInfo.stockCount <= 0) {
       throw new Error('موجودی محصول به اتمام رسیده است.');
    }
    
    // 2. Create an invoice with Plisio
    const invoice = await createPlisioInvoice({
        amount: productInfo.priceUSD.toString(),
        currency: 'LTC', // پرداخت فقط با لایت‌کوین
        orderName: PRODUCT_NAME,
        orderNumber: `${PRODUCT_NAME}-${Date.now()}`,
        email: email,
    });
    
    if (invoice.status === 'success' && invoice.data?.invoice_url) {
      // 3. Return the URL for redirection
      return { error: null, transactionUrl: invoice.data.invoice_url };
    } else {
      throw new Error(invoice.data?.message || 'ایجاد فاکتور پرداخت با خطا مواجه شد.');
    }

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
    console.error("createInvoiceAction Error:", errorMessage);
    return { error: errorMessage, transactionUrl: null };
  }
}
