import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

// Initialize Gmail transporter
if (process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_USER) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  console.log('✅ Email service initialized with Gmail:', process.env.GMAIL_USER);
} else {
  console.warn('⚠️ Email service not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD to enable email notifications.');
}

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailTemplate): Promise<boolean> {
  if (!transporter) {
    console.warn('⚠️ Email service not configured. Skipping email to:', to);
    console.log('Subject:', subject);
    console.log('Content:', html.replace(/<[^>]*>/g, '').substring(0, 200) + '...');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"RotiHai - घर की रोटी" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent successfully to ${to} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export function createWelcomeEmail(name: string, phone: string, password: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .password-box { background: white; border: 2px solid #f97316; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .password { font-size: 32px; font-weight: bold; color: #f97316; letter-spacing: 4px; font-family: monospace; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
        .button { background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🍽️ Welcome to RotiHai!</h1>
          <p style="margin: 10px 0 0 0;">घर की रोटी - Fresh homestyle meals delivered</p>
        </div>
        <div class="content">
          <h2>Hi ${name}! 👋</h2>
          <p>Thank you for choosing RotiHai! Your account has been created successfully.</p>
          
          <div class="password-box">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">Your Login Password:</p>
            <div class="password">${password}</div>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">Use this password to log in with your phone number: ${phone}</p>
          </div>

          <p><strong>Important:</strong> Please keep this password safe. You can change it anytime from your profile page.</p>

          <h3>What's Next?</h3>
          <ul>
            <li>Browse our delicious homestyle meals</li>
            <li>Add items to your cart</li>
            <li>Enjoy fresh food delivered to your doorstep</li>
            <li>Earn rewards with our referral program</li>
          </ul>

          <div class="footer">
            <p>RotiHai - घर की रोटी | Fresh homestyle meals and restaurant specials</p>
            <p>Questions? Reply to this email and we'll help you out!</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function createPasswordResetEmail(name: string, phone: string, newPassword: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .password-box { background: white; border: 2px solid #f97316; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .password { font-size: 32px; font-weight: bold; color: #f97316; letter-spacing: 4px; font-family: monospace; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🔐 Password Reset</h1>
          <p style="margin: 10px 0 0 0;">RotiHai - Your account security</p>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>We received a request to reset your password. Your new password is ready.</p>
          
          <div class="password-box">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">Your New Password:</p>
            <div class="password">${newPassword}</div>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">Phone: ${phone}</p>
          </div>

          <div class="warning">
            <p style="margin: 0;"><strong>⚠️ Security Tip:</strong> We recommend changing this password to something more secure after logging in. Go to your profile page to update your password.</p>
          </div>

          <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">If you didn't request this password reset, please contact our support team immediately.</p>

          <div class="footer">
            <p>RotiHai - घर की रोटी | Fresh homestyle meals and restaurant specials</p>
            <p>Questions? Reply to this email and we'll help you out!</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function createPasswordChangeConfirmationEmail(name: string, phone: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .success-box { background: #d1fae5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">✅ Password Changed Successfully</h1>
          <p style="margin: 10px 0 0 0;">RotiHai - Your account is secure</p>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          
          <div class="success-box">
            <h3 style="color: #10b981; margin: 0 0 10px 0;">🎉 Your password has been updated!</h3>
            <p style="margin: 0; color: #374151;">Your account (${phone}) is now secured with your new password.</p>
          </div>

          <p>You can now use your new password to log in to your RotiHai account.</p>

          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">If you didn't make this change, please contact our support team immediately.</p>

          <div class="footer">
            <p>RotiHai - घर की रोटी | Fresh homestyle meals and restaurant specials</p>
            <p>Questions? Reply to this email and we'll help you out!</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
