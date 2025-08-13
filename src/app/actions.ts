'use server';

import { z } from 'zod';
import { createPlisioInvoice, checkPlisioTransactionStatus } from '@/lib/plisio';
import { getProductInfo as fetchProductInfo } from '@/lib/gscript';

// Initial state for the create invoice action
type CreateInvoiceState = {
  error: string | null;
  transactionUrl: string | null;
  txn_id: string | null;
  email: string | null;
};

const emailSchema = z.string().email({ message: "آدرس ایمیل وارد شده معتبر نیست." });
const PRODUCT_NAME = 'V2Ray Config';

/**
 * Fetches product information (price and stock) from Google Apps Script.
 * This is a wrapper to provide better error messages.
 */
export async function getProductInfo(): Promise<{ price: number; stock: number }> {
  try {
    const { price, stock } = await fetchProductInfo();
    return { price, stock };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred on the server.';
    console.error("getProductInfo Action Error:", errorMessage);
    // Provide a user-friendly error that guides them on what to check.
    throw new Error(`امکان دریافت اطلاعات محصول وجود ندارد. جزئیات: ${errorMessage}`);
  }
}

/**
 * Creates a payment invoice using Plisio.
 */
export async function createInvoiceAction(prevState: CreateInvoiceState, formData: FormData): Promise<CreateInvoiceState> {
  const email = formData.get('email') as string;

  const validation = emailSchema.safeParse(email);
  if (!validation.success) {
    return { error: validation.error.errors[0].message, transactionUrl: null, txn_id: null, email: null };
  }

  try {
    const productInfo = await getProductInfo();

    if (typeof productInfo.price !== 'number' || productInfo.price <= 0) {
      throw new Error('قیمت محصول از سرور دریافت نشد یا نامعتبر است. لطفاً بعداً تلاش کنید.');
    }
    
    if (typeof productInfo.stock !== 'number' || productInfo.stock <= 0) {
       throw new Error('موجودی محصول به اتمام رسیده است.');
    }
    
    const invoice = await createPlisioInvoice({
        amount: productInfo.price.toString(),
        currency: 'LTC', 
        orderName: PRODUCT_NAME,
        orderNumber: `${PRODUCT_NAME}-${Date.now()}`,
        email: email,
    });
    
    // Check for success status and necessary data from Plisio
    if (invoice.status === 'success' && invoice.data?.invoice_url && invoice.data?.txn_id) {
      return { 
        error: null, 
        transactionUrl: invoice.data.invoice_url,
        txn_id: invoice.data.txn_id,
        email: email,
      };
    } else {
      // Throw an error with the message from Plisio if available
      throw new Error(invoice.data?.message || 'ایجاد فاکتور پرداخت با یک خطای ناشناخته از سمت درگاه مواجه شد.');
    }

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred.';
    console.error("createInvoiceAction Error:", errorMessage);
    return { error: errorMessage, transactionUrl: null, txn_id: null, email: null };
  }
}

/**
 * Checks the status of a payment and sends the product if successful.
 */
export async function checkPaymentStatusAction(txn_id: string, email: string): Promise<{ success?: string; error?: string }> {
    try {
        const statusData = await checkPlisioTransactionStatus(txn_id);

        if (statusData.status !== 'success' || !statusData.data) {
            throw new Error(statusData.data?.message || 'خطا در بررسی وضعیت تراکنش.');
        }

        const transaction = statusData.data;

        if (transaction.status === 'completed' || transaction.status === 'mismatch') {
             // 'mismatch' means over or underpaid, but we can treat it as success.
            const webAppUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
            if (!webAppUrl) throw new Error("Google Apps Script URL is not configured.");

            const params = new URLSearchParams({
                action: 'sendSuccessEmail',
                productName: PRODUCT_NAME,
                userEmail: email,
            });
            const finalUrl = `${webAppUrl}?${params.toString()}`;
            
            const scriptResponse = await fetch(finalUrl, { redirect: 'follow', cache: 'no-store' });
            
            if (!scriptResponse.ok) {
                const errorText = await scriptResponse.text();
                throw new Error(`خطای سرور هنگام ارسال محصول: ${errorText}`);
            }
            
            const scriptResult = await scriptResponse.json();
            if (scriptResult.error) {
                 throw new Error(`خطا در اسکریپت گوگل: ${scriptResult.error}`);
            }

            return { success: 'ایمیل حاوی کانفیگ با موفقیت برای شما ارسال شد. لطفاً پوشه اسپم را نیز بررسی کنید.' };

        } else if (transaction.status === 'new' || transaction.status === 'pending') {
            return { error: 'پرداخت شما هنوز در انتظار تایید شبکه است. لطفاً چند دقیقه دیگر دوباره بررسی کنید.' };
        } else {
            // For statuses like 'cancelled', 'expired', 'error'
             return { error: `وضعیت پرداخت: ناموفق (${transaction.status}). اگر فکر می‌کنید این یک اشتباه است، با پشتیبانی تماس بگیرید.` };
        }

    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        console.error("checkPaymentStatusAction Error:", errorMessage);
        return { error: errorMessage };
    }
}
