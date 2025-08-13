"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function PaymentSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background font-body">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
           <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
             <CheckCircle2 className="h-10 w-10 text-green-600" />
           </div>
          <CardTitle className="text-2xl font-bold mt-4">پرداخت موفقیت‌آمیز بود</CardTitle>
          <CardDescription>
            از خرید شما متشکریم! کانفیگ V2Ray شما تا چند لحظه دیگر به آدرس ایمیلتان ارسال خواهد شد.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
             لطفاً پوشه اسپم ایمیل خود را نیز بررسی کنید.
          </p>
          <Button asChild className="w-full">
            <Link href="/">بازگشت به صفحه اصلی</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
