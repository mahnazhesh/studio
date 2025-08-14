
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createInvoiceAction } from '@/app/actions';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

function ProcessingComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('در حال ایجاد فاکتور پرداخت شما...');

  useEffect(() => {
    const email = searchParams.get('email');

    if (!email) {
      setError('ایمیل در درخواست یافت نشد. لطفاً به صفحه اصلی بازگردید و دوباره تلاش کنید.');
      return;
    }

    const processPayment = async () => {
      const formData = new FormData();
      formData.append('email', email);

      // Simulate the initial state for the action
      const initialState = { error: null, transactionUrl: null, txn_id: null, email: null };

      try {
        const result = await createInvoiceAction(initialState, formData);

        if (result.error) {
          setError(result.error);
        } else if (result.transactionUrl && result.txn_id && result.email) {
          setMessage('فاکتور با موفقیت ایجاد شد! در حال انتقال به درگاه پرداخت...');
          
          // Save pending transaction to localStorage so the main page can pick it up
          const txData = { txn_id: result.txn_id, email: result.email };
          localStorage.setItem('pendingTx', JSON.stringify(txData));

          // Redirect to Plisio invoice page
          window.location.href = result.transactionUrl;
        } else {
          setError('یک خطای ناشناخته در ایجاد فاکتور رخ داد. پاسخ معتبری از سرور دریافت نشد.');
        }
      } catch (e: any) {
        setError(e.message || 'یک خطای غیرمنتظره در سمت سرور رخ داد.');
      }
    };

    processPayment();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background font-body p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>در حال پردازش...</CardTitle>
          <CardDescription>لطفاً این صفحه را نبندید.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>خطا!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground text-center">{message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function ProcessingPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProcessingComponent />
        </Suspense>
    )
}
