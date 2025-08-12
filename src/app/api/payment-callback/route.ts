import { NextResponse, type NextRequest } from "next/server";
import { determineEmailContent } from "@/ai/flows/determine-email-content";

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

    let purchaseStatus: 'success' | 'failed' | 'pending' = 'pending';
    
    if (status === 'completed') {
        purchaseStatus = 'success';
    } else if (status === 'cancelled' || status === 'error') {
        purchaseStatus = 'failed';
    } else {
        // For other statuses, we don't need to send an email, so we can exit.
        return NextResponse.json({ status: "success", message: "Status is not final, no action taken." });
    }
    
    // Call the AI flow to determine the correct email content.
    // If successful, the flow's tool will also delete the row from the Google Sheet.
    const emailData = await determineEmailContent({
        purchaseStatus,
        productName: productName,
        email: userEmail
    });

    console.log("Determined email content for user:", userEmail);
    console.log("Email Subject:", emailData.emailSubject);
    // Be careful not to log the actual config (emailData.emailBody) in production logs.
    console.log("Email Body length:", emailData.emailBody.length);


    // In a real application, you would now use an email service (like Resend, SendGrid, etc.)
    // to send the actual email with the subject and body received from the AI flow.
    // Example: await sendEmail(userEmail, emailData.emailSubject, emailData.emailBody);
    console.log(`Simulating sending email to ${userEmail} with subject "${emailData.emailSubject}"`);
    
    // Return a 200 OK response to Plisio to acknowledge receipt of the webhook.
    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Error processing Plisio callback:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
