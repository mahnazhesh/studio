'use server';

import { z } from 'zod';
import { createPlisioInvoice } from '@/lib/plisio';
import { getProductInfo as fetchProductInfo } from '@/lib/gscript';

type State = {
  error: string | null;
  transactionUrl: string | null;
};

const emailSchema = z.string().email({ message: "آدرس ایمیل وارد شده معتبر نیست." });

const PRODUCT_NAME = 'V2Ray Config';

export async function getProductInfo(): Promise<{ price: number; stock: number }> {
  try {
    const { price, stock } = await fetchProductInfo();
    return { price, stock };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
    console.error("getProductInfo Action Error:", errorMessage);
    // Re-throw with a user-friendly message
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
    // 1. Get price and check stock directly.
    const productInfo = await fetchProductInfo();

    if (typeof productInfo.price !== 'number' || productInfo.price <= 0) {
      throw new Error('امکان تشخیص قیمت محصول وجود ندارد. لطفا بعدا تلاش کنید.');
    }
    
    if (typeof productInfo.stock !== 'number' || productInfo.stock <= 0) {
       throw new Error('موجودی محصول به اتمام رسیده است.');
    }
    
    // 2. Create an invoice with Plisio
    const invoice = await createPlisioInvoice({
        amount: productInfo.price.toString(),
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
