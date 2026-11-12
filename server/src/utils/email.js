import nodemailer from 'nodemailer';

let transporterInstance = null;

/**
 * Returns a configured Nodemailer transporter using Gmail SMTP
 */
export const getTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (
    !user ||
    !pass ||
    user === 'your-email@gmail.com' ||
    pass === 'your-16-character-app-password'
  ) {
    return null;
  }

  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  return transporterInstance;
};

/**
 * Sends a welcome email to newly registered users
 * Styled with JurisFlow's Executive Dark & Gold aesthetic
 *
 * @param {string} toEmail - Recipient email
 * @param {string} userName - User display name
 * @returns {Promise<{success: boolean, messageId?: string, skipped?: boolean, error?: string}>}
 */
export const sendWelcomeEmail = async (toEmail, userName = 'Valued Member') => {
  try {
    const transporter = getTransporter();
    const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const fromAddress = process.env.EMAIL_USER
      ? `"JurisFlow" <${process.env.EMAIL_USER}>`
      : '"JurisFlow" <no-reply@jurisflow.com>';

    if (!transporter) {
      console.warn(
        `[Email Service] SMTP credentials (EMAIL_USER / EMAIL_PASS) not configured. Welcome email to ${toEmail} was not dispatched via SMTP.`
      );
      return { success: false, skipped: true, message: 'SMTP not configured' };
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to JurisFlow</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080808; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5e6c4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080808; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #121212; border: 1px solid #262118; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
          <!-- Header Bar -->
          <tr>
            <td style="padding: 35px 40px 25px; text-align: center; border-bottom: 1px solid #262118; background: linear-gradient(180deg, #181818 0%, #121212 100%);">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 14px; background: #1c1c1c; border: 1px solid #d4af37; text-align: center; margin-bottom: 12px;">
                <span style="font-size: 24px; color: #d4af37;">⚖️</span>
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">JurisFlow</h1>
              <p style="margin: 6px 0 0; font-size: 13px; font-weight: 500; color: #d4af37; letter-spacing: 0.5px;">Your Legal World, Organized in One Flow.</p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 40px 40px 30px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #ffffff;">Welcome aboard, ${escapeHtml(userName)}!</h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #a39e93;">
                We are thrilled to welcome you to <strong>JurisFlow</strong>. Your account has been successfully created and configured. You now have full access to our intelligent legal management platform, instant consultation network, and enterprise-grade contract workspace.
              </p>

              <!-- Feature Highlights -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0; background: #181818; border: 1px solid #262118; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #262118;">
                    <div style="font-size: 13px; font-weight: 700; color: #ffffff;">🔒 Enterprise Legal Vault</div>
                    <div style="font-size: 12px; color: #a39e93; margin-top: 3px;">Organize, analyze, and automate contracts with verified audit trails.</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #262118;">
                    <div style="font-size: 13px; font-weight: 700; color: #ffffff;">💬 Instant Legal Consultation</div>
                    <div style="font-size: 12px; color: #a39e93; margin-top: 3px;">Astrotalk-style real-time messaging, audio, and video sessions with certified advocates.</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 13px; font-weight: 700; color: #ffffff;">⚡ Smart Risk Analysis</div>
                    <div style="font-size: 12px; color: #a39e93; margin-top: 3px;">Automated clause risk assessment and compliance scoring.</div>
                  </td>
                </tr>
              </table>

              <!-- Call to Action -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0 15px; text-align: center;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/login" style="display: inline-block; padding: 14px 34px; background-color: #d4af37; color: #080808; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.25);">
                      Launch JurisFlow Workspace →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 40px; background-color: #0e0e0e; border-top: 1px solid #262118; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 11px; color: #666158;">
                This transactional email was sent to <span style="color: #a39e93;">${escapeHtml(toEmail)}</span> regarding your JurisFlow account registration.
              </p>
              <p style="margin: 0; font-size: 11px; color: #666158;">
                &copy; ${new Date().getFullYear()} JurisFlow. All legal rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `
Welcome to JurisFlow, ${userName}!

Your Legal World, Organized in One Flow.

Your account has been successfully created and configured. You now have full access to our intelligent legal management platform, verified advocate directory, and contract workspace.

Launch your workspace: ${appUrl}/login

© ${new Date().getFullYear()} JurisFlow. All rights reserved.
    `.trim();

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: 'Welcome to JurisFlow — Your Legal World, Organized in One Flow.',
      text: textContent,
      html: htmlContent,
    });

    console.log(`[Email Service] Welcome email dispatched successfully to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Service Error] Failed to send welcome email to ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a 6-digit OTP code for password recovery
 * Mentions 10-minute expiration prominently
 *
 * @param {string} toEmail - Recipient email
 * @param {string|number} otp - 6-digit verification code
 * @returns {Promise<{success: boolean, messageId?: string, skipped?: boolean, error?: string}>}
 */
export const sendOtpEmail = async (toEmail, otp) => {
  try {
    const transporter = getTransporter();
    const fromAddress = process.env.EMAIL_USER
      ? `"JurisFlow Security" <${process.env.EMAIL_USER}>`
      : '"JurisFlow Security" <no-reply@jurisflow.com>';

    if (!transporter) {
      console.warn(
        `[Email Service] SMTP credentials (EMAIL_USER / EMAIL_PASS) not configured. OTP for ${toEmail} is: [${otp}] (expires in 10 minutes).`
      );
      return { success: false, skipped: true, message: 'SMTP not configured' };
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JurisFlow Password Reset Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080808; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5e6c4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080808; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #121212; border: 1px solid #262118; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
          <!-- Header Bar -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center; border-bottom: 1px solid #262118; background: linear-gradient(180deg, #181818 0%, #121212 100%);">
              <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: #1c1c1c; border: 1px solid #d4af37; text-align: center; margin-bottom: 10px;">
                <span style="font-size: 22px; color: #d4af37;">⚖️</span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">JurisFlow</h1>
              <p style="margin: 4px 0 0; font-size: 12px; color: #d4af37; font-weight: 600;">Account Security & Recovery</p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 35px 40px 25px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #ffffff;">Password Reset Verification Code</h2>
              <p style="margin: 0 0 22px; font-size: 13px; line-height: 1.6; color: #a39e93;">
                A password reset request was initiated for your JurisFlow account. Use the 6-digit verification code below to authorize the update:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #1a1a1a; border: 1px solid #d4af37; border-radius: 14px; padding: 20px; text-align: center; max-width: 320px;">
                      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #a39e93; margin-bottom: 8px;">Your 6-Digit OTP Code</div>
                      <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #d4af37; user-select: all;">${otp}</div>
                      <div style="font-size: 11px; font-weight: 600; color: #f59e0b; margin-top: 8px;">⏱️ Expires in 10 minutes</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiration Warning Alert -->
              <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 12px 16px; margin: 25px 0 15px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #fca5a5;">
                  <strong>Important Security Notice:</strong> This code is valid for <strong>10 minutes</strong> only. Do not share this OTP with anyone, including JurisFlow staff.
                </p>
              </div>

              <p style="margin: 15px 0 0; font-size: 12px; line-height: 1.5; color: #666158;">
                If you did not request a password reset, please disregard this email. Your existing password will remain active and secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #0e0e0e; border-top: 1px solid #262118; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #666158;">
                &copy; ${new Date().getFullYear()} JurisFlow. Your Legal World, Organized in One Flow.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `
JurisFlow — Password Reset Verification Code

A password reset request was initiated for your JurisFlow account.

Your 6-Digit Verification Code: ${otp}

NOTE: This code is valid for 10 minutes. 

If you did not request this password reset, please ignore this email. Your account remains secure.

© ${new Date().getFullYear()} JurisFlow. Your Legal World, Organized in One Flow.
    `.trim();

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `JurisFlow — Password Reset Code: ${otp}`,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[Email Service] Password reset OTP sent successfully to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Service Error] Failed to send OTP email to ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Escapes HTML characters for safe template rendering
 */
function escapeHtml(string) {
  if (typeof string !== 'string') return '';
  return string
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default {
  getTransporter,
  sendWelcomeEmail,
  sendOtpEmail,
};
