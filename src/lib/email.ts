import nodemailer from "nodemailer";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

// Check for required environment variables
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM } = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !EMAIL_FROM) {
  console.warn(
    "Warning: Email sending is not fully configured. Missing SMTP environment variables."
  );
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

export const sendEmail = async (data: EmailPayload) => {
  if (!SMTP_HOST) {
    console.error("Email host not configured. Skipping email send.");
    // In a real app, you might want to throw an error here.
    // For now, we'll just log it to avoid crashing the callback.
    return;
  }
  
  const mailOptions = {
    from: EMAIL_FROM,
    ...data,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    // Re-throw the error to be handled by the calling function
    throw new Error("Failed to send email.");
  }
};
