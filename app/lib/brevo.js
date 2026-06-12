/**
 * Brevo Email Service
 * Used for sending invitations to guests after profile scan
 */
export async function sendBrevoEmail(params) {
    const { email, name, magicLink, guestId } = params;
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER;
    if (!apiKey || !senderEmail) {
        console.error('[Brevo] Missing API credentials');
        return {
            success: false,
            error: 'Email service not configured',
        };
    }
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sender: {
                    email: senderEmail,
                    name: 'GitProfile AI',
                },
                to: [
                    {
                        email,
                        name: name || 'Guest User',
                    },
                ],
                subject: '✨ Complete Your GitHub Profile Analysis',
                htmlContent: `
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
                .content { padding: 30px 0; }
                .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #eee; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Your Profile Analysis is Ready!</h1>
                </div>
                <div class="content">
                  <p>Hi ${name ? `${name}` : 'there'},</p>
                  <p>Thank you for scanning your GitHub profile with GitProfile AI! We've analyzed your profile and found some interesting insights.</p>
                  <p>To save your results and access premium features, please complete your account:</p>
                  <center>
                    <a href="${magicLink}" class="cta-button">Claim Your Account</a>
                  </center>
                  <p style="color: #666; font-size: 14px;">Or copy this link: <code>${magicLink}</code></p>
                  <p>This link will expire in 24 hours.</p>
                </div>
                <div class="footer">
                  <p>© 2026 GitProfile AI. All rights reserved.</p>
                  <p>Guest ID: ${guestId}</p>
                </div>
              </div>
            </body>
          </html>
        `,
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            console.error('[Brevo] Email send failed:', error);
            return {
                success: false,
                error: error.message || 'Failed to send email',
            };
        }
        const data = await response.json();
        return {
            success: true,
            messageId: data.messageId,
        };
    }
    catch (error) {
        console.error('[Brevo] Exception:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Send welcome email after account created from guest claim
 */
export async function sendWelcomeEmail(email, name) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER;
    if (!apiKey || !senderEmail) {
        return {
            success: false,
            error: 'Email service not configured',
        };
    }
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sender: {
                    email: senderEmail,
                    name: 'GitProfile AI',
                },
                to: [
                    {
                        email,
                        name: name || 'User',
                    },
                ],
                subject: '👋 Welcome to GitProfile AI!',
                htmlContent: `
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
                .content { padding: 30px 0; }
                .feature-list { padding: 20px; background: #f5f5f5; border-radius: 6px; }
                .feature-item { padding: 10px 0; }
                .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to GitProfile AI! 🚀</h1>
                </div>
                <div class="content">
                  <p>Hi ${name ? `${name}` : 'there'},</p>
                  <p>Your account is now active! Here's what you can do:</p>
                  <div class="feature-list">
                    <div class="feature-item">✅ Unlimited profile scans on Pro Plus</div>
                    <div class="feature-item">✅ 20 profile scans on Pro plan</div>
                    <div class="feature-item">✅ Detailed AI-powered insights</div>
                    <div class="feature-item">✅ Repository analysis & suggestions</div>
                  </div>
                  <center>
                    <a href="https://gitprofileai.vercel.app/dashboard" class="cta-button">Go to Dashboard</a>
                  </center>
                </div>
              </div>
            </body>
          </html>
        `,
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            console.error('[Brevo] Welcome email failed:', error);
            return {
                success: false,
                error: error.message || 'Failed to send email',
            };
        }
        const data = await response.json();
        return {
            success: true,
            messageId: data.messageId,
        };
    }
    catch (error) {
        console.error('[Brevo] Exception:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
