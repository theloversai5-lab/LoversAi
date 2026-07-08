import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@loversai.com';

/**
 * Send an OTP Email for Verification
 * @param {string} to - Recipient email address
 * @param {string} otp - 6-digit OTP code
 */
export const sendVerificationOTP = async (to, otp) => {
  const subject = "Verify your LoversAi Account";
  
  const html = `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 40px 20px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1a1a1a; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Welcome to LoversAi</h1>
      </div>
      <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center;">
        <p style="color: #4a4a4a; font-size: 16px; margin-bottom: 25px; line-height: 1.5;">
          Thank you for joining LoversAi! To activate your account, please use the following verification code:
        </p>
        <div style="background-color: #f4f4f5; padding: 15px 25px; border-radius: 8px; display: inline-block; margin-bottom: 25px;">
          <h2 style="color: #1a1a1a; font-size: 32px; letter-spacing: 4px; margin: 0; font-weight: 700;">${otp}</h2>
        </div>
        <p style="color: #71717a; font-size: 14px; margin-bottom: 0;">
          This code will expire in 10 minutes. If you did not request this, please ignore this email.
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #a1a1aa; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} LoversAi. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    if (process.env.NODE_ENV !== 'production' && (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_dummy_key')) {
      console.log(`✉️ [DEV MODE] Email to ${to} | OTP: ${otp}`);
      return { success: true };
    }

    const { data, error } = await resend.emails.send({
      from: `LoversAi <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend API Error:", error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return { success: false, error };
  }
};
