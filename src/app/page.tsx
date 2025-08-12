"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { createInvoiceAction, getProductPrice } from "@/app/actions";

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
import { Loader2, ShieldCheck, Zap, Globe } from "lucide-react";
import { Logo } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";


const initialState = {
  error: null,
  transactionUrl: null,
};

function PurchaseButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full font-bold" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          در حال پردازش...
        </>
      ) : (
        "خرید آنی"
      )}
    </Button>
  );
}

export default function Home() {
  const [state, formAction] = useActionState(createInvoiceAction, initialState);
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);

  useEffect(() => {
    // Attempt to retrieve email from local storage on component mount
    const savedEmail = localStorage.getItem("userEmail");
    if (savedEmail) {
      setEmail(savedEmail);
    }
    
    // Fetch product price on mount
    async function fetchPrice() {
      try {
        setIsLoadingPrice(true);
        setPriceError(null);
        const fetchedPrice = await getProductPrice();
        setPrice(fetchedPrice);
      } catch (error: any) {
        console.error("Failed to fetch price:", error);
        setPriceError(error.message || "یک خطای ناشناخته رخ داده است.");
        toast({
          variant: "destructive",
          title: "خطا در دریافت قیمت",
          description: "امکان دریافت قیمت محصول وجود ندارد. لطفا بعدا تلاش کنید.",
        });
      } finally {
        setIsLoadingPrice(false);
      }
    }

    fetchPrice();

  }, [toast]);

  useEffect(() => {
    if (state?.transactionUrl) {
      window.location.href = state.transactionUrl;
    }
    if (state?.error) {
       toast({
        variant: "destructive",
        title: "خطایی رخ داد",
        description: state.error,
      });
    }
  }, [state, toast]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Save email to local storage on change
    localStorage.setItem("userEmail", e.target.value);
  };


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
            کانفیگ شخصی V2Ray خود را دریافت کرده و از تجربه‌ای بی‌نظیر آنلاین لذت ببرید. پرداخت یک‌باره، دسترسی دائمی.
          </p>
        </div>

        {priceError && (
            <Alert variant="destructive" className="max-w-4xl mx-auto mb-8">
              <Terminal className="h-4 w-4" />
              <AlertTitle>خطا در ارتباط با سرور</AlertTitle>
              <AlertDescription>
                <p>امکان دریافت قیمت محصول وجود ندارد. لطفاً از موارد زیر اطمینان حاصل کنید:</p>
                <ul className="list-disc pl-5 mt-2 text-xs">
                    <li>آدرس وب اپلیکیشن (Google Apps Script URL) در فایل `.env` صحیح است.</li>
                    <li>گوگل شیت شما حداقل یک ردیف محصول با `productName` و `priceUSD` دارد.</li>
                    <li>اسکریپت Google Apps Script شما به درستی به عنوان Web App پابلیش شده و دسترسی آن روی "Anyone" تنظیم شده است.</li>
                </ul>
                <p className="mt-2 text-xs font-mono bg-muted p-2 rounded">جزئیات خطا: {priceError}</p>
              </AlertDescription>
            </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="w-full shadow-lg border-2 border-primary transform hover:scale-105 transition-transform duration-300">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">
                کانفیگ V2Ray
              </CardTitle>
              <CardDescription>
                دسترسی دائمی به یک کانفیگ سرور شخصی و پرسرعت V2Ray.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="text-4xl font-bold font-headline text-foreground text-left dir-ltr">
                {isLoadingPrice ? (
                    <Skeleton className="h-10 w-24" />
                ) : price !== null ? (
                    `$${price.toFixed(2)}`
                ) : (
                     <span className="text-red-500">ناموجود</span>
                )}
                <span className="text-base font-normal text-muted-foreground ml-2">/ پرداخت یک‌باره</span>
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
                  <PurchaseButton />
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
