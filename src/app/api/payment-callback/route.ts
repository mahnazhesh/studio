import { NextResponse, type NextRequest } from "next/server";
import { determineEmailContent } from "@/ai/flows/determine-email-content";
import { sendEmail } from "@/lib/email";

// This is the webhook handler for Plisio.
// Plisio will send a POST request to this endpoint when a payment status changes.
export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    
    // Extract data from Plisio's callback.
    const status = body.get("status") as string; // e.g., 'completed', 'cancelled', 'error'
    const orderNumber = body.get("order_number") as string;
    const userEmail = body.get("email") as string;
    
    const productName = "V2Ray Config"; // Assuming a single product for now

    console.log(`Received Plisio callback for order ${orderNumber} with status: ${status}`);

    if (!status || !userEmail) {
       console.error("Incomplete Plisio callback data received.", { status, userEmail });
       return NextResponse.json({ error: "Incomplete data" }, { status: 400 });
    }

    let purchaseStatus: 'success' | 'failed' | 'pending';
    
    // وضعیت خرید را بر اساس پاسخ Plisio تعیین می‌کنیم
    if (status === 'completed') {
        purchaseStatus = 'success';
    } else if (status === 'cancelled' || status === 'error') {
        purchaseStatus = 'failed';
    } else {
        // برای وضعیت‌های دیگر (مثل new یا pending)، هیچ ایمیلی ارسال نمی‌کنیم
        console.log(`Status is '${status}', no action taken.`);
        return NextResponse.json({ status: "success", message: "Status is not final, no action taken." });
    }
    
    // بر اساس وضعیت، ایمیل مناسب را تولید می‌کنیم
    // اگر موفق باشد، کانفیگ ارسال و از شیت حذف می‌شود
    // اگر ناموفق باشد، ایمیل اطلاع‌رسانی ارسال می‌شود
    const emailData = await determineEmailContent({
        purchaseStatus,
        productName: productName,
        email: userEmail
    });

    console.log("Determined email content for user:", userEmail);
    console.log("Email Subject:", emailData.emailSubject);

    // ارسال ایمیل واقعی
    await sendEmail({
      to: userEmail,
      subject: emailData.emailSubject,
      text: emailData.emailBody, // برای سازگاری با کلاینت‌های بدون HTML
      html: `<div dir="rtl" style="font-family: sans-serif; text-align: right;">${emailData.emailBody.replace(/\n/g, '<br>')}</div>`,
    });
    
    console.log(`Successfully sent email to ${userEmail} with subject "${emailData.emailSubject}"`);
    
    // پاسخ موفقیت‌آمیز به Plisio برای تایید دریافت وب‌هوک
    return NextResponse.json({ status: "success" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing Plisio callback:", errorMessage);
    // در صورت بروز خطا در ارسال ایمیل، بهتر است به Plisio پاسخ موفقیت‌آمیز ندهیم
    // تا بتواند دوباره تلاش کند (اگر این قابلیت را داشته باشد).
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 });
  }
}
