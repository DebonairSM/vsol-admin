import { Resend } from 'resend';
import { CycleService } from './cycle-service';
import { ValidationError } from '../middleware/errors';

const resend = new Resend(process.env.RESEND_KEY);

if (!process.env.RESEND_KEY) {
  console.warn('RESEND_KEY not found in environment variables. Email functionality will not work.');
}

const DEFAULT_RECIPIENT_EMAIL = process.env.RESEND_ADMIN_EMAIL || 'apmailbox@omnigo.com';

export interface ReceiptEmailData {
  cycleId: number;
  receiptAmount: number;
  recipientEmail?: string;
  invoiceNumber?: number;
}

export interface AccountCredentialsData {
  username: string;
  password: string;
  email: string;
  consultantName: string;
  loginUrl: string;
}

/**
 * Calculate the work period (next month) from a cycle month label
 * Example: "November 2025" -> "December 2025"
 */
function getWorkPeriodFromCycle(monthLabel: string): string | null {
  const match = monthLabel.match(/^(\w+)\s+(\d{4})$/);
  if (!match) {
    return null;
  }
  
  const [, monthName, yearStr] = match;
  const year = parseInt(yearStr, 10);
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const month = monthNames.indexOf(monthName) + 1;
  if (month === 0) {
    return null;
  }
  
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  
  return `${monthNames[nextMonth - 1]} ${nextYear}`;
}

export class EmailService {
  /**
   * Sends a receipt email for a payment received from Omnigo
   */
  static async sendReceiptEmail(data: ReceiptEmailData): Promise<{ success: boolean; messageId?: string }> {
    if (!process.env.RESEND_KEY) {
      throw new ValidationError('Email service is not configured. RESEND_KEY is missing.');
    }

    if (data.receiptAmount <= 0) {
      throw new ValidationError('Receipt amount must be greater than zero.');
    }

    // Get cycle data
    const cycle = await CycleService.getById(data.cycleId);
    const recipientEmail = data.recipientEmail || DEFAULT_RECIPIENT_EMAIL;

    // Format receipt amount as USD currency
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(data.receiptAmount);

    // Use sendReceiptDate if available, otherwise use current date
    const paymentDate = cycle.sendReceiptDate || new Date();
    const formattedDate = paymentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Calculate work period (next month after cycle month)
    const workPeriod = getWorkPeriodFromCycle(cycle.monthLabel);
    const workPeriodText = workPeriod || 'the upcoming period';

    // Generate email subject
    const subject = data.invoiceNumber 
      ? `Payment Receipt - Invoice #${data.invoiceNumber} - ${cycle.monthLabel} - Portal`
      : `Payment Receipt - ${cycle.monthLabel} - Portal`;

    // Generate HTML email body
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Payment Receipt</h2>
    <p>Dear Omnigo Accounts Payable Team,</p>
    <p>This email confirms receipt of payment for consultant services to be performed in ${workPeriodText}.</p>
    
    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
      ${data.invoiceNumber ? `<p style="margin: 5px 0;"><strong>Invoice Number:</strong> #${data.invoiceNumber}</p>` : ''}
      <p style="margin: 5px 0;"><strong>Receipt Amount:</strong> ${formattedAmount}</p>
      <p style="margin: 5px 0;"><strong>Payment Date:</strong> ${formattedDate}</p>
    </div>
    
    <p>Thank you for your prompt payment. We appreciate your business.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="margin: 5px 0;"><strong>Portal</strong></p>
      <p style="margin: 5px 0;">Phone: (407) 409-0874</p>
      <p style="margin: 5px 0;">Email: admin@vsol.software</p>
      <p style="margin: 5px 0;">Website: www.vsol.software</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Plain text version for email clients that don't support HTML
    const textBody = `
Payment Receipt

Dear Omnigo Accounts Payable Team,

This email confirms receipt of payment for consultant services to be performed in ${workPeriodText}.

${data.invoiceNumber ? `Invoice Number: #${data.invoiceNumber}\n` : ''}Receipt Amount: ${formattedAmount}
Payment Date: ${formattedDate}

Thank you for your prompt payment. We appreciate your business.

Portal
Phone: (407) 409-0874
Email: admin@vsol.software
Website: www.vsol.software
    `.trim();

    try {
      const result = await resend.emails.send({
        from: 'Portal <noreply@notifications.vsol.software>',
        to: recipientEmail,
        subject: subject,
        html: htmlBody,
        text: textBody
      });

      if (result.error) {
        throw new ValidationError(`Failed to send email: ${result.error.message}`);
      }

      return {
        success: true,
        messageId: result.data?.id
      };
    } catch (error: any) {
      console.error('Error sending receipt email:', error);
      throw new ValidationError(`Failed to send email: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Sends account credentials email to a consultant
   * Reusable for account creation, password resets, and credential reminders
   */
  static async sendAccountCredentials(data: AccountCredentialsData): Promise<{ success: boolean; messageId?: string }> {
    if (!process.env.RESEND_KEY) {
      throw new ValidationError('Email service is not configured. RESEND_KEY is missing.');
    }

    if (!data.email || !data.email.includes('@')) {
      throw new ValidationError('Valid email address is required');
    }

    // Generate email subject
    const subject = `Your Portal Account - ${data.consultantName}`;

    // Generate HTML email body
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Portal Account</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Welcome to Portal</h2>
    <p>Dear ${data.consultantName},</p>
    <p>Your account has been created for the Portal. You can now log in to upload invoices and manage your profile information.</p>
    
    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
      <p style="margin: 5px 0;"><strong>Username:</strong> ${data.username}</p>
      <p style="margin: 5px 0;"><strong>Password:</strong> ${data.password}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.loginUrl}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Log In to Portal</a>
    </div>
    
    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <p style="margin: 0;"><strong>Important:</strong> For security reasons, you will be required to change your password on your first login.</p>
    </div>
    
    <p>Once logged in, you can:</p>
    <ul>
      <li>Upload your monthly invoices</li>
      <li>View and update your profile information</li>
      <li>Manage your equipment records</li>
    </ul>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="margin: 5px 0;"><strong>Portal</strong></p>
      <p style="margin: 5px 0;">Phone: (407) 409-0874</p>
      <p style="margin: 5px 0;">Email: admin@vsol.software</p>
      <p style="margin: 5px 0;">Website: www.vsol.software</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Plain text version for email clients that don't support HTML
    const textBody = `
Welcome to Portal

Dear ${data.consultantName},

Your account has been created for the Portal. You can now log in to upload invoices and manage your profile information.

Username: ${data.username}
Password: ${data.password}

Log in at: ${data.loginUrl}

IMPORTANT: For security reasons, you will be required to change your password on your first login.

Once logged in, you can:
- Upload your monthly invoices
- View and update your profile information
- Manage your equipment records

Portal
Phone: (407) 409-0874
Email: admin@vsol.software
Website: www.vsol.software
    `.trim();

    try {
      const result = await resend.emails.send({
        from: 'Portal <noreply@notifications.vsol.software>',
        to: data.email,
        subject: subject,
        html: htmlBody,
        text: textBody
      });

      if (result.error) {
        throw new ValidationError(`Failed to send email: ${result.error.message}`);
      }

      return {
        success: true,
        messageId: result.data?.id
      };
    } catch (error: any) {
      console.error('Error sending account credentials email:', error);
      throw new ValidationError(`Failed to send email: ${error.message || 'Unknown error'}`);
    }
  }
}

