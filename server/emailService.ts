import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

// Initialize transporter
if (process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_USER) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  console.log("✅ Email service initialized with Gmail:", process.env.GMAIL_USER);
} else {
  console.warn(
    "⚠️ Email service not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD."
  );
}

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

/* ============================================
   SEND EMAIL (COMMON FUNCTION)
============================================ */
export async function sendEmail({ to, subject, html }: EmailTemplate) {
  if (!transporter) {
    console.warn("⚠️ Email service not configured. Skipping email:", to);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"RotiHai - घर की रोटी" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to} (Message ID: ${info.messageId})`);
    return true;
  } catch (err) {
    console.error("❌ Email send failed:", err);
    return false;
  }
}

/* ============================================
   WELCOME EMAIL TEMPLATE
============================================ */
export function createWelcomeEmail(
  name: string,
  phone: string,
  password: string
) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial; line-height:1.6; color:#333; }
        .container { max-width:600px; margin:0 auto; padding:20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Welcome ${name}! 👋</h2>
        <p>Your account has been created successfully.</p>

        <h3>Your Password:</h3>
        <div style="font-size:24px; font-weight:bold;">${password}</div>

        <p>Use this with phone: <b>${phone}</b></p>
      </div>
    </body>
    </html>
  `;
}

/* ============================================
   PASSWORD RESET EMAIL (SINGLE FINAL VERSION)
============================================ */
export function createPasswordResetEmail(
  name: string,
  phone: string,
  newPassword: string
) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial; max-width: 600px; margin: auto;">
      <h2>Password Reset</h2>
      <p>Hello ${name},</p>
      <p>Your new temporary password is:</p>

      <div style="
          padding: 15px;
          background: #eee;
          border-radius: 6px;
          width: fit-content;
        ">
        <b style="font-size: 24px;">${newPassword}</b>
      </div>

      <p>
        Use it to login with phone: <b>${phone}</b><br>
        Please change it after logging in.
      </p>
    </body>
    </html>
  `;
}

/* ============================================
   PASSWORD CHANGE CONFIRMATION
============================================ */
export function createPasswordChangeConfirmationEmail(
  name: string,
  phone: string
) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial; max-width: 600px; margin: auto;">
      <h2>Password Changed Successfully</h2>
      <p>Hello ${name},</p>
      <p>Your password for <b>${phone}</b> has been updated.</p>
    </body>
    </html>
  `;
}

/* ============================================
   SEND WELCOME EMAIL
============================================ */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  phone: string,
  password: string
) {
  return sendEmail({
    to: email,
    subject: "Welcome to RotiHai 🎉",
    html: createWelcomeEmail(name, phone, password),
  });
}
