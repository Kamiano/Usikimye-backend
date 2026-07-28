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

    const fromSender =
      process.env.RESEND_FROM_EMAIL ||
      'FACE Platform <support@face-usikimye.com>';
    const appUrl = process.env.FRONTEND_URL || 'https://face-usikimye.com';

    try {
      const response = await this.resend.emails.send({
        from: fromSender,
        to: email,
        subject: 'Congratulations & Welcome to FACE Platform – Account Credentials',
        html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>FACE Platform Credentials</title>
          </head>
          <body style="background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 48px 16px; -webkit-font-smoothing: antialiased;">
            <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);">
              
              <!-- Minimal Top Branding -->
              <div style="padding: 32px 32px 0 32px;">
                <table width="100%" cellPadding="0" cellSpacing="0" border="0">
                  <tr>
                    <td align="left">
                      <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #0f172a; border-left: 2px solid #0f172a; padding-left: 8px;">
                        FACE Platform
                      </span>
                    </td>
                  </tr>
                </table>
                <h1 style="color: #0f172a; margin: 24px 0 0 0; font-size: 22px; font-weight: 600; letter-spacing: -0.01em; line-height: 30px;">
                  Congratulations, ${firstName}!
                </h1>
              </div>

              <!-- Main Content Body -->
              <div style="padding: 16px 32px 32px 32px; color: #334155;">
                <p style="font-size: 14px; line-height: 22px; color: #475569; margin: 0 0 16px 0;">
                  Congratulations on your appointment to the team. Your administrative access to the <strong>FACE Platform</strong> has been initialized, empowering you to support our community protection and case management workflows.
                </p>
                
                <p style="font-size: 14px; line-height: 22px; color: #475569; margin: 0 0 28px 0;">
                  Below are your assigned role details and initial sign-in credentials to access the workspace:
                </p>

                <!-- Assigned Role Card -->
                <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                  <div style="margin-bottom: 8px; display: table; width: 100%;">
                    <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: table-cell;">
                      Assigned Role
                    </span>
                    <span style="font-size: 11px; color: #0f172a; font-weight: 600; text-align: right; display: table-cell;">
                      ${roleMeta.rights}
                    </span>
                  </div>
                  <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #0f172a;">${roleMeta.title}</p>
                  <p style="margin: 0; font-size: 13px; line-height: 19px; color: #64748b;">${roleMeta.desc}</p>
                </div>

                <!-- Credentials Box -->
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 28px; background-color: #ffffff;">
                  <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">
                    Sign-in Credentials
                  </div>
                  
                  <div style="font-size: 13px; color: #334155; margin-bottom: 12px; display: table; width: 100%;">
                    <span style="color: #64748b; display: table-cell; width: 90px;">Username</span>
                    <strong style="color: #0f172a; font-weight: 600; display: table-cell;">${email}</strong>
                  </div>

                  <div style="font-size: 13px; color: #334155; margin-bottom: 16px; display: table; width: 100%;">
                    <span style="color: #64748b; display: table-cell; width: 90px;">Password</span>
                    <span style="display: table-cell;">
                      <code style="background-color: #f1f5f9; border: 1px solid #e2e8f0; padding: 3px 8px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600; color: #0f172a; font-size: 13px;">
                        ${password}
                      </code>
                    </span>
                  </div>

                  <div style="border-top: 1px solid #f1f5f9; padding-top: 12px; font-size: 12px; line-height: 18px; color: #64748b;">
                    <strong>Security Policy:</strong> Please change this temporary password immediately upon your initial login.
                  </div>
                </div>

                <!-- Primary CTA Button -->
                <div style="text-align: left; margin-bottom: 28px;">
                  <a href="${appUrl}/admin" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 500; text-decoration: none; padding: 12px 28px; border-radius: 6px; letter-spacing: 0.01em;">
                    Access FACE Dashboard &rarr;
                  </a>
                </div>

                <!-- Device Recommendation Note -->
                <p style="font-size: 12px; line-height: 18px; color: #94a3b8; margin: 0;">
                  Note: For optimal access to case management matrices and data streams, accessing the platform via a desktop browser is recommended.
                </p>
              </div>

              <!-- Subtle Footer -->
              <div style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px; text-align: left;">
                <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 16px;">
                  &copy; ${new Date().getFullYear()} FACE — Femicide Accountability & Community Empowerment.<br/>
                  This is an automated operational notification dispatched to ${email}.
                </p>
              </div>

            </div>
          </body>
        </html>
      `,
      });

      this.logger.log(`Onboarding notice successfully dispatched to ${email}`);
      return response;
    } catch (error) {
      this.logger.error(`Resend API dispatch failed for ${email}:`, error);
      throw error;
    }
  }

  async sendSuspensionEmail(email: string, firstName: string) {
    const fromSender =
      process.env.RESEND_FROM_EMAIL ||
      'FACE Platform <support@face-usikimye.com>';
    try {
      await this.resend.emails.send({
        from: fromSender,
        to: email,
        subject: 'FACE Platform - Account Suspended',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 8px; color: #0f172a;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 600;">Account Suspension Notice</h2>
            <p style="font-size: 14px; line-height: 22px; color: #475569;">Hello ${firstName},</p>
            <p style="font-size: 14px; line-height: 22px; color: #475569;">Your administrative access to the <strong>FACE Platform</strong> has been temporarily suspended. During this period, access to workspace modules is restricted.</p>
            <p style="font-size: 14px; line-height: 22px; color: #475569; margin-bottom: 0;">If you believe this action was taken in error, please contact your system administrator.</p>
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
    const fromSender =
      process.env.RESEND_FROM_EMAIL ||
      'FACE Platform <support@face-usikimye.com>';
    try {
      await this.resend.emails.send({
        from: fromSender,
        to: email,
        subject: 'FACE Platform - Account Deactivated',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 8px; color: #0f172a;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 600;">Account Deactivation Notice</h2>
            <p style="font-size: 14px; line-height: 22px; color: #475569;">Hello ${firstName},</p>
            <p style="font-size: 14px; line-height: 22px; color: #475569;">Your account on the <strong>FACE Platform</strong> has been deactivated and all administrative privileges have been revoked.</p>
            <p style="font-size: 14px; line-height: 22px; color: #475569; margin-bottom: 0;">Please reach out to the platform administration team if you have any questions.</p>
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
