import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

interface WelcomeEmailDto {
  email: string;
  firstName: string;
  roleName: string;
  password: string;
}

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  private getRoleMetadata(roleName: string) {
    switch (roleName) {
      case 'ADMIN':
        return {
          title: 'Super Admin',
          rights: 'Full System Access',
          desc: 'Complete control over platform settings, incident triage, user management, and operational logs.',
        };
      case 'MANAGER':
        return {
          title: 'Case Manager',
          rights: 'Read & Write Cases',
          desc: 'Authorized to assign responders, manage incident lifecycles, and transition triage stages.',
        };
      case 'MONITORING_OFFICER':
      default:
        return {
          title: 'Monitoring Officer',
          rights: 'Read-Only Audit',
          desc: 'Access to search, analyze real-time incident streams, and view operational statistics.',
        };
    }
  }

  async sendWelcomeEmail(payload: WelcomeEmailDto) {
    const { email, firstName, roleName, password } = payload;
    const roleMeta = this.getRoleMetadata(roleName);

    const fromSender = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      const response = await this.resend.emails.send({
        from: fromSender,
        to: email,
        subject: 'Welcome to FACE Platform – Account Credentials',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 12px; -webkit-font-smoothing: antialiased;">
              <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                
                <!-- Header Banner -->
                <div style="background-color: #0f172a; padding: 32px 28px; text-align: left;">
                  <span style="background-color: #38bdf8; color: #0f172a; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px;">
                    FACE Platform
                  </span>
                  <h1 style="color: #ffffff; margin: 16px 0 0 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">
                    Welcome aboard, ${firstName}!
                  </h1>
                </div>

                <!-- Main Content Body -->
                <div style="padding: 28px; color: #334155;">
                  <p style="font-size: 14px; line-height: 22px; color: #475569; margin: 0 0 24px 0;">
                    Your administrative profile has been configured and initialized on the <strong>FACE Platform</strong>. Below are your account details and login credentials:
                  </p>

                  <!-- Role Card -->
                  <div style="background-color: #f1f5f9; border-left: 4px solid #0284c7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span style="font-size: 11px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.05em;">Assigned Role</span>
                      <span style="font-size: 11px; background-color: #e0f2fe; color: #0369a1; font-weight: 600; padding: 2px 8px; border-radius: 4px;">${roleMeta.rights}</span>
                    </div>
                    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #0f172a;">${roleMeta.title}</p>
                    <p style="margin: 0; font-size: 12px; line-height: 18px; color: #64748b;">${roleMeta.desc}</p>
                  </div>

                  <!-- Credentials Box -->
                  <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <h4 style="margin: 0 0 14px 0; color: #52525b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                      Login Credentials
                    </h4>
                    
                    <div style="font-size: 14px; color: #27272a; margin-bottom: 12px;">
                      <span style="color: #71717a; display: inline-block; width: 80px;">Email:</span>
                      <strong style="color: #09090b;">${email}</strong>
                    </div>

                    <div style="font-size: 14px; color: #27272a; margin-bottom: 16px;">
                      <span style="color: #71717a; display: inline-block; width: 80px;">Password:</span>
                      <span style="background-color: #f4f4f5; border: 1px solid #e4e4e7; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-weight: 700; color: #09090b; font-size: 14px;">
                        ${password}
                      </span>
                    </div>

                    <div style="border-top: 1px dashed #e4e4e7; padding-top: 12px; font-size: 11px; line-height: 16px; color: #71717a;">
                      🔒 <strong>Security Note:</strong> Please change your temporary password immediately upon your first sign-in.
                    </div>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin-bottom: 24px;">
                    <a href="${appUrl}/admin" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 10px; transition: all 0.2s;">
                      Access FACE Dashboard →
                    </a>
                  </div>

                  <p style="font-size: 11px; line-height: 16px; color: #94a3b8; text-align: center; margin: 0;">
                    Optimization Note: To view incident tracking matrices effectively, please log in using a desktop browser.
                  </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center;">
                  <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                    &copy; ${new Date().getFullYear()} FACE Platform. All rights reserved.
                  </p>
                </div>

              </div>
            </body>
          </html>
        `,
      });

      this.logger.log(`Onboarding notice successfully dispatched to ${email}`);
    } catch (error) {
      this.logger.error(`Resend API dispatch failed for ${email}:`, error);
      throw error;
    }
  }

  async sendSuspensionEmail(email: string, firstName: string) {
    const fromSender = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    try {
      await this.resend.emails.send({
        from: fromSender,
        to: email,
        subject: 'FACE Platform - Account Suspended',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
            <h2 style="color: #ef4444; margin-top: 0; font-size: 20px; font-weight: 700;">Account Suspension Notice</h2>
            <p style="font-size: 14px; line-height: 22px; color: #475569;">Hello ${firstName},</p>
            <p style="font-size: 14px; line-height: 22px; color: #475569;">Your administrative access to the <strong>FACE Platform</strong> has been temporarily suspended. During this period, you will not be able to access workspace modules.</p>
            <p style="font-size: 14px; line-height: 22px; color: #475569;">If you believe this action was taken in error, please contact your system administrator.</p>
          </div>
        `,
      });
      this.logger.log(`Suspension notice successfully dispatched to ${email}`);
    } catch (error) {
      this.logger.error(`Resend API dispatch failed for ${email}:`, error);
      throw error;
    }
  }

  async sendDeletionEmail(email: string, firstName: string) {
    const fromSender = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    try {
      await this.resend.emails.send({
        from: fromSender,
        to: email,
        subject: 'FACE Platform - Account Deactivated',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
            <h2 style="color: #ef4444; margin-top: 0; font-size: 20px; font-weight: 700;">Account Deactivation Notice</h2>
            <p style="font-size: 14px; line-height: 22px; color: #475569;">Hello ${firstName},</p>
            <p style="font-size: 14px; line-height: 22px; color: #475569;">Your account on the <strong>FACE Platform</strong> has been permanently removed and all access rights have been revoked.</p>
            <p style="font-size: 14px; line-height: 22px; color: #475569;">Please reach out to the platform administration team for any inquiries.</p>
          </div>
        `,
      });
      this.logger.log(`Deletion notice successfully dispatched to ${email}`);
    } catch (error) {
      this.logger.error(`Resend API dispatch failed for ${email}:`, error);
      throw error;
    }
  }
}
