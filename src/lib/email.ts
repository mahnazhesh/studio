import { NextResponse, type NextRequest } from "next/server";

// This is the webhook handler for Plisio.
// Plisio will send a POST request to this endpoint when a payment status changes.
// This handler's only job is to call the Google Apps Script to perform the final actions.
export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    
    // Extract data from Plisio's callback.
    const status = body.get("status") as string; // e.g., 'completed', 'cancelled', 'error'
    const userEmail = body.get("email") as string;
    const productName = "V2Ray Config"; // Assuming a single product for now

    console.log(`Received Plisio callback for ${userEmail} with status: ${status}`);

    if (!status || !userEmail) {
       console.error("Incomplete Plisio callback data received.", { status, userEmail });
       return NextResponse.json({ error: "Incomplete data" }, { status: 400 });
    }

    let action: 'sendSuccessEmail' | 'sendFailureEmail' | null = null;
    
    // Determine the action for the Apps Script based on Plisio's status
    if (status === 'completed') {
        action = 'sendSuccessEmail';
    } else if (status === 'cancelled' || status === 'error') {
        action = 'sendFailureEmail';
    } else {
        // For other statuses (like 'new' or 'pending'), do nothing.
        console.log(`Status is '${status}', no action taken.`);
        return NextResponse.json({ status: "success", message: "Status is not final, no action taken." });
    }
    
    // Call the Google Apps Script to handle everything (get config, delete row, send email)
    const webAppUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!webAppUrl) {
      throw new Error("Google Apps Script URL is not configured in .env file.");
    }

    const params = new URLSearchParams({
      action,
      productName,
      userEmail,
    });
    
    const finalUrl = webAppUrl.includes('?') 
      ? `${webAppUrl}&${params.toString()}`
      : `${webAppUrl}?${params.toString()}`;

    console.log(`Calling Google Apps Script with URL: ${finalUrl}`);
    
    const scriptResponse = await fetch(finalUrl, { redirect: 'follow', cache: 'no-store' });

    if (!scriptResponse.ok) {
        const errorText = await scriptResponse.text();
        console.error('Google Apps Script responded with an error:', scriptResponse.status, errorText);
        throw new Error(`Google Apps Script request failed with status ${scriptResponse.status}: ${errorText}`);
    }
    
    const responseData = await scriptResponse.json();
    console.log('Google Apps Script returned:', responseData);

    if (responseData.error) {
        throw new Error(`Error from Google Apps Script: ${responseData.error}`);
    }

    // Respond to Plisio that the webhook was received successfully.
    return NextResponse.json({ status: "success", message: "Webhook processed by Apps Script." });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing Plisio callback:", errorMessage);
    // It's better not to return a success response to Plisio if our backend fails,
    // so it might retry the webhook.
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 });
  }
}