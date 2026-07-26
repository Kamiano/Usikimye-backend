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
    // Initializes directly from your locked-in .env keys
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  // Helper to dynamically match the exact privilege layout you provided
  private getRoleMetadata(roleName: string) {
    switch (roleName) {
      case 'ADMIN':
        return {
          title: 'Super Admin',
          rights: 'Full Access',
          desc: 'Complete control over system configuration, incidents, and team roles.',
        };
      case 'MANAGER':
        return {
          title: 'Case Manager',
          rights: 'Read & Write Cases',
          desc: 'Authorized to assign responders and transition incidents through the triage stages.',
        };
      case 'MONITORING_OFFICER':
      default:
        return {
          title: 'Viewer / Auditor',
          rights: 'Read-Only Logs',
          desc: 'Access to search and view statistics and reports, without write permissions.',
        };
    }
  }

  async sendWelcomeEmail(payload: WelcomeEmailDto) {
    const { email, firstName, roleName, password } = payload;
    const roleMeta = this.getRoleMetadata(roleName);
    const fromSender = process.env.RESEND_FROM_EMAIL || 'no-reply@salamaprogram.org';

    try {
      await this.resend.emails.send({
        from: fromSender,
        to: email,
        subject: 'Your Salama Platform Account Details', // Changed subject to be less "robotic"
        html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
  
  <h2 style="color: #4f46e5; margin-top: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Hi ${firstName}, welcome aboard!</h2>
  <p style="font-size: 14px; line-height: 22px; color: #475569; margin-bottom: 24px;">We are incredibly glad to have you join the team. Your administrative workspace profile is ready, and your temporary configuration details have been successfully initialized below:</p>
  
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
    <h4 style="margin: 0 0 4px 0; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Assigned Profile</h4>
    <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #4f46e5;">${roleMeta.title}</p>
    <p style="margin: 0; font-size: 13px; line-height: 20px; color: #475569;"><em>${roleMeta.desc}</em></p>
  </div>

  <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
    <h4 style="margin: 0 0 12px 0; color: #b45309; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Security Credentials</h4>
    
    <div style="margin-bottom: 14px; font-size: 14px; color: #78350f; line-height: 22px;">
      <div style="margin-bottom: 6px;"><strong>Username:</strong> ${email}</div>
      <div><strong>Password:</strong> <span style="font-weight: 700; color: #0f172a;">${password}</span></div>
    </div>
    
    <div style="border-top: 1px dashed #fde68a; padding-top: 12px; font-size: 12px; line-height: 18px; color: #92400e;">
      <strong>Device Requirement:</strong> To safely display high-density incident tracking matrices, this platform is optimized exclusively for desktop or laptop screens. Please avoid mobile phone access.
    </div>
  </div>

  <div style="text-align: center; margin-bottom: 28px;">
    <a href="https://salamaprogram.org/admin/dashboard" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px;">
      Launch Your Workspace
    </a>
  </div>

  <p style="font-size: 12px; line-height: 18px; color: #64748b; margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
    Welcome to the team! For safety, please remember to update your temporary password within your workspace security configurations during your first session.
  </p>
</div>
      `,
      });

      this.logger.log(`Onboarding notice successfully dispatched via Resend pipeline to ${email}`);
    } catch (error) {
      this.logger.error(`Resend API dispatch transaction failed for ${email}:`, error);
      throw error;
    }
  }

  async sendSuspensionEmail(email: string, firstName: string) {
    const fromSender = process.env.RESEND_FROM_EMAIL || 'no-reply@salamaprogram.org';
    try {
      await this.resend.emails.send({
        from: fromSender,
        to: email,
        subject: 'Salama Platform - Account Suspended',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
            <h2 style="color: #ef4444; margin-top: 0; font-size: 24px; font-weight: 700;">Account Suspension Notice</h2>
            <p style="font-size: 15px; line-height: 24px; color: #475569;">Hello ${firstName},</p>
            <p style="font-size: 15px; line-height: 24px; color: #475569;">Your administrative access to the Salama Platform has been temporarily suspended. During this time, you will not be able to log in or access any system resources.</p>
            <p style="font-size: 15px; line-height: 24px; color: #475569;">If you believe this is an error or need further clarification, please contact your system administrator.</p>
          </div>
        `,
      });
      this.logger.log(`Suspension notice successfully dispatched to ${email}`);
    } catch (error) {
      this.logger.error(`Resend API dispatch transaction failed for ${email}:`, error);
      throw error;
    }
  }

  async sendDeletionEmail(email: string, firstName: string) {
    const fromSender = process.env.RESEND_FROM_EMAIL || 'no-reply@salamaprogram.org';
    try {
      await this.resend.emails.send({
        from: fromSender,
        to: email,
        subject: 'Salama Platform - Account Expelled',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
            <h2 style="color: #ef4444; margin-top: 0; font-size: 24px; font-weight: 700;">Account Termination Notice</h2>
            <p style="font-size: 15px; line-height: 24px; color: #475569;">Hello ${firstName},</p>
            <p style="font-size: 15px; line-height: 24px; color: #475569;">Your account on the Salama Platform has been permanently expelled/deleted. All access rights have been revoked.</p>
            <p style="font-size: 15px; line-height: 24px; color: #475569;">Please reach out to the system administrator for any questions regarding this action.</p>
          </div>
        `,
      });
      this.logger.log(`Deletion notice successfully dispatched to ${email}`);
    } catch (error) {
      this.logger.error(`Resend API dispatch transaction failed for ${email}:`, error);
      throw error;
    }
  }
}
