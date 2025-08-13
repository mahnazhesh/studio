"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function PaymentFailedPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background font-body">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
           <div className="mx-auto bg-red-100 rounded-full p-3 w-fit">
             <XCircle className="h-10 w-10 text-red-600" />
           </div>
          <CardTitle className="text-2xl font-bold mt-4">پرداخت ناموفق بود</CardTitle>
          <CardDescription>
            متاسفانه در فرآیند پرداخت مشکلی پیش آمد یا توسط شما لغو شد.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            هیچ وجهی از حساب شما کسر نشده است. می‌توانید دوباره تلاش کنید.
          </p>
          <Button asChild className="w-full">
            <Link href="/">بازگشت به صفحه اصلی و تلاش مجدد</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
