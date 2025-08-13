"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createInvoiceAction, getProductInfo, checkPaymentStatusAction } from "@/app/actions";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Zap, Globe, Terminal, Package, CheckCircle, AlertTriangle } from "lucide-react";
import { Logo } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const createInvoiceInitialState = {
  error: null,
  transactionUrl: null,
  txn_id: null,
  email: null,
};

type PendingTransaction = {
  txn_id: string;
  email: string;
}

export default function Home() {
  const [invoiceState, formAction, isInvoicePending] = useActionState(createInvoiceAction, createInvoiceInitialState);
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [productInfoError, setProductInfoError] = useState<string | null>(null);
  const [isLoadingProductInfo, setIsLoadingProductInfo] = useState(true);
  
  const [isCheckingPayment, startPaymentCheck] = useTransition();
  const [pendingTx, setPendingTx] = useState<PendingTransaction | null>(null);
  const [checkStatusResult, setCheckStatusResult] = useState<{success?: string, error?: string} | null>(null);

  // Effect to fetch product info on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("userEmail");
    if (savedEmail) setEmail(savedEmail);
    
    async function fetchInfo() {
      try {
        setIsLoadingProductInfo(true);
        setProductInfoError(null);
        const { price, stock } = await getProductInfo();
        setPrice(price);
        setStock(stock);
      } catch (error: any) {
        console.error("Failed to fetch product info:", error);
        setProductInfoError(error.message || "یک خطای ناشناخته در دریافت اطلاعات محصول رخ داد.");
        setPrice(0); 
        setStock(0);
      } finally {
        setIsLoadingProductInfo(false);
      }
    }
    fetchInfo();
  }, []);
  
  // Effect to handle invoice creation result
  useEffect(() => {
    if (invoiceState?.error) {
       toast({
        variant: "destructive",
        title: "خطایی رخ داد",
        description: invoiceState.error,
      });
    } else if (invoiceState?.transactionUrl && invoiceState?.txn_id && invoiceState?.email) {
      // Save transaction info to local storage for checking later
      const txData = { txn_id: invoiceState.txn_id, email: invoiceState.email };
      localStorage.setItem('pendingTx', JSON.stringify(txData));
      setPendingTx(txData);
      // Redirect user to Plisio
      window.location.href = invoiceState.transactionUrl;
    }
  }, [invoiceState, toast]);
  
  // Effect to check for a pending transaction in local storage on page load
  useEffect(() => {
    const savedTx = localStorage.getItem('pendingTx');
    if (savedTx) {
      try {
        setPendingTx(JSON.parse(savedTx));
      } catch(e) {
        console.error("Failed to parse pending transaction from localStorage", e);
        localStorage.removeItem('pendingTx');
      }
    }
  }, []);


  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    localStorage.setItem("userEmail", e.target.value);
  };

  const handleCheckPayment = () => {
    if (!pendingTx) return;
    setCheckStatusResult(null);
    startPaymentCheck(async () => {
      const result = await checkPaymentStatusAction(pendingTx.txn_id, pendingTx.email);
      setCheckStatusResult(result);
      if (result.success) {
        localStorage.removeItem('pendingTx');
        setPendingTx(null);
      }
    });
  }

  const isOutOfStock = stock !== null && stock <= 0;

  return (
    <div className="flex flex-col min-h-screen bg-background font-body">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold font-headline text-foreground">
              V2Ray فروشگاه
            </span>
          </div>
        </nav>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold font-headline text-foreground tracking-tighter">
            اینترنت امن، سریع و بدون محدودیت
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            با پرداخت امن از طریق لایت‌کوین (LTC)، کانفیگ شخصی V2Ray خود را دریافت کرده و از تجربه‌ای بی‌نظیر آنلاین لذت ببرید.
          </p>
        </div>

        {productInfoError && !isLoadingProductInfo && (
            <Alert variant="destructive" className="max-w-4xl mx-auto mb-8">
              <Terminal className="h-4 w-4" />
              <AlertTitle>خطا در ارتباط با سرور</AlertTitle>
              <AlertDescription>
                <p>امکان دریافت اطلاعات محصول (قیمت و موجودی) وجود ندارد.</p>
                <p className="mt-2 text-xs font-mono bg-muted p-2 rounded">جزئیات خطا: {productInfoError}</p>
              </AlertDescription>
            </Alert>
        )}
        
        {pendingTx && !checkStatusResult?.success && (
          <Card className="max-w-4xl mx-auto mb-8 border-accent">
            <CardHeader className="text-center">
              <CardTitle>یک سفارش در انتظار دارید</CardTitle>
              <CardDescription>
                به نظر می‌رسد شما یک پرداخت را شروع کرده‌اید. اگر پرداخت را کامل کرده‌اید، روی دکمه زیر کلیک کنید تا سفارش شما را بررسی و تحویل دهیم.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkStatusResult?.error && (
                 <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>بررسی ناموفق</AlertTitle>
                    <AlertDescription>{checkStatusResult.error}</AlertDescription>
                </Alert>
              )}
              <Button onClick={handleCheckPayment} className="w-full" disabled={isCheckingPayment}>
                {isCheckingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    در حال بررسی وضعیت پرداخت...
                  </>
                ) : (
                  "پرداخت را انجام دادم، سفارشم را تحویل بده"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
        
        {checkStatusResult?.success && (
            <Alert variant="default" className="max-w-4xl mx-auto mb-8 bg-green-50 border-green-300">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">پرداخت شما با موفقیت تایید شد</AlertTitle>
                <AlertDescription className="text-green-700">
                    {checkStatusResult.success}
                </AlertDescription>
            </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className={`w-full shadow-lg border-2 border-primary transform hover:scale-105 transition-transform duration-300 ${isOutOfStock && !isLoadingProductInfo ? 'opacity-50' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="font-headline text-2xl">
                    کانفیگ V2Ray
                  </CardTitle>
                  <CardDescription>
                    پرداخت با لایت‌کوین (LTC) و تحویل آنی کانفیگ.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Package className="h-5 w-5 text-primary" />
                  {isLoadingProductInfo ? (
                    <Skeleton className="h-5 w-16" />
                  ) : isOutOfStock ? (
                      <span className="text-destructive font-bold">اتمام موجودی</span>
                    ) : stock !== null ? (
                      <span>{stock} عدد موجود</span>
                    ) : null
                  }
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="text-4xl font-bold font-headline text-foreground text-left dir-ltr">
                {isLoadingProductInfo ? (
                    <Skeleton className="h-10 w-24" />
                ) : price !== null && price > 0 ? (
                    `$${price.toFixed(2)}`
                ) : !productInfoError ? (
                     <span className="text-base text-red-500">قیمت نامشخص</span>
                ) : null
                }
                { price !== null && price > 0 && <span className="text-base font-normal text-muted-foreground ml-2">/ پرداخت یک‌باره (LTC)</span>}
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  امنیت و حریم خصوصی پیشرفته
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  اتصال پرسرعت
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  عبور از محدودیت‌های جغرافیایی
                </li>
              </ul>
              <form action={formAction}>
                <div className="space-y-4">
                   <div className="space-y-2">
                    <Label htmlFor="email" className="font-bold">آدرس ایمیل</Label>
                    <p className="text-xs text-muted-foreground">کانفیگ V2Ray به این ایمیل ارسال خواهد شد.</p>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={handleEmailChange}
                      className="bg-background"
                      dir="ltr"
                    />
                  </div>
                  <Button type="submit" className="w-full font-bold" disabled={isInvoicePending || isLoadingProductInfo || isOutOfStock || !!pendingTx}>
                    {isInvoicePending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        در حال ایجاد فاکتور...
                      </>
                    ) : isOutOfStock ? (
                       "اتمام موجودی"
                    ) : !!pendingTx ? (
                      "یک سفارش در انتظار دارید"
                    ) : (
                      "پرداخت با لایت‌کوین (LTC)"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="w-full shadow-lg flex flex-col items-center justify-center text-center bg-card/50 border-dashed">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">
                محصولات جدید
              </CardTitle>
              <CardDescription>
                راهکارهای بیشتری برای حریم خصوصی در راه است.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-headline text-muted-foreground animate-pulse">
                به زودی
              </p>
            </CardContent>
            <CardFooter>
                 <p className="text-xs text-muted-foreground">منتظر به‌روزرسانی‌ها باشید!</p>
            </CardFooter>
          </Card>
        </div>
      </main>

      <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} فروشگاه V2Ray. تمام حقوق محفوظ است.</p>
      </footer>
    </div>
  );
}
