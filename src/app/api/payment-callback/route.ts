import { NextResponse, type NextRequest } from "next/server";
import { determineEmailContent } from "@/ai/flows/determine-email-content";

// This is the webhook handler for Plisio.
// Plisio will send a POST request to this endpoint when a payment status changes.
export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    
    // Extract data from Plisio's callback.
    // The field names are based on Plisio's documentation and might need adjustment.
    const status = body.get("status") as string; // e.g., 'completed', 'cancelled', 'error'
    const orderNumber = body.get("order_number") as string;
    const userEmail = body.get("email") as string;
    const amount = body.get("source_amount") as string;
    const currency = body.get("source_currency") as string;
    const txnId = body.get("txn_id") as string;

    console.log(`Received Plisio callback for order ${orderNumber} with status: ${status}`);

    if (!status || !userEmail) {
       console.error("Incomplete Plisio callback data received.", { status, userEmail });
       return NextResponse.json({ error: "Incomplete data" }, { status: 400 });
    }

    let purchaseStatus = "pending";
    let paymentStatus = "unconfirmed";

    if (status === 'completed') {
        purchaseStatus = 'success';
        paymentStatus = 'confirmed';
    } else if (status === 'cancelled' || status === 'error') {
        purchaseStatus = 'failed';
        paymentStatus = 'failed';
    }
    
    // Call the AI flow to determine the correct email content
    const emailData = await determineEmailContent({
        purchaseStatus,
        paymentStatus,
        productName: "V2Ray Config", // Should ideally be retrieved based on orderNumber
        email: userEmail
    });

    console.log("Determined email content for user:", userEmail);
    console.log("Email Subject:", emailData.emailSubject);
    console.log("Email Body:", emailData.emailBody);

    // In a real application, you would now use an email service (like Resend, SendGrid, etc.)
    // to send the actual email with the subject and body received from the AI flow.
    // Example: await sendEmail(userEmail, emailData.emailSubject, emailData.emailBody);
    
    // Return a 200 OK response to Plisio to acknowledge receipt of the webhook.
    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Error processing Plisio callback:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
