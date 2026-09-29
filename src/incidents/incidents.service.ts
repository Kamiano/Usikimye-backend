import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { CaseStatus, RoleName } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PdfGeneratorService } from './pdf-generator.service';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private pdfGeneratorService: PdfGeneratorService,
  ) {}

  async create(createIncidentDto: CreateIncidentDto) {
    // 1. First, find or create an IncidentType matching the string sent from the frontend form
    const typeRecord = await this.prisma.incidentType.upsert({
      where: { name: createIncidentDto.type || 'General Incident' },
      update: {},
      create: { name: createIncidentDto.type || 'General Incident' },
    });

    // 2. Map DTO data structures directly to the IncidentReport model
    const report = await this.prisma.incidentReport.create({
      data: {
        title:
          createIncidentDto.title ||
          `${createIncidentDto.type || 'Incident'} Report`,
        description:
          createIncidentDto.description || 'No description provided.',

        // Map frontend urgency choices safely onto IncidentSeverity enum
        severity: (createIncidentDto.urgency as any) || 'MEDIUM',

        county: createIncidentDto.county || 'Default County',
        subCounty: createIncidentDto.subCounty || 'Default Sub-County',
        location: createIncidentDto.location || null,
        incidentDate: new Date(),

        // Relate to IncidentType resolved above
        incidentTypeId: typeRecord.id,
        survivorStatus: createIncidentDto.survivorStatus,

        // --- TRAUMA-INFORMED & REPORTER DETAILS ---
        reportMethod: createIncidentDto.reportMethod,
        reporterName: createIncidentDto.reporterName || null,
        reporterPhone: createIncidentDto.reporterPhone || null,
        preferredContactChannel:
          createIncidentDto.preferredContactChannel || null,
        relationshipToSurvivor:
          createIncidentDto.relationshipToSurvivor || null,
        survivorIdentity: createIncidentDto.survivorIdentity || null,
        survivorIdentityOther: createIncidentDto.survivorIdentityOther || null,
        survivorName:
          createIncidentDto.survivorName ||
          createIncidentDto.reporterName ||
          null,
        survivorPhone: createIncidentDto.reporterPhone || null, // Stores reporter contact if provided
        survivorAge: createIncidentDto.survivorAge || null,
        survivorAgeGroup:
          createIncidentDto.survivorAge ||
          createIncidentDto.survivorAgeGroup ||
          null,
        targetType: createIncidentDto.targetType || null,
        perpetrator: createIncidentDto.perpetrator || null,
        perpetratorCategory: createIncidentDto.perpetrator || null,
        servicesAccessed: createIncidentDto.servicesAccessed || null,
        immediateDanger: createIncidentDto.immediateDanger ?? false,
        safeCallbackWindow: createIncidentDto.safeCallbackWindow || null,
      },
    });

    // 3. Automatically create a Case for workflow management
    const caseNumber = `CASE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCase = await this.prisma.case.create({
      data: {
        caseNumber,
        incidentId: report.id,
        status: CaseStatus.NEW,
      },
    });

    // 4. Asynchronous / Non-blocking Fire-and-Forget Notification to Super Admins
    this.notifySuperAdminsAsync(report, newCase.caseNumber);

    // Return report details AND the generated database Case number back to UI
    return {
      ...report,
      case: newCase,
    };
  }

  private async notifySuperAdminsAsync(report: any, caseNumber: string) {
    try {
      const activeSuperAdmins = await this.prisma.user.findMany({
        where: {
          role: {
            name: RoleName.ADMIN,
          },
          isActive: true,
        },
        select: {
          email: true,
          firstName: true,
        },
      });

      const bccEmails = activeSuperAdmins
        .map((admin) => admin.email)
        .filter((email): email is string => Boolean(email));

      if (bccEmails.length === 0) {
        this.logger.warn(
          `No active Super Admins found to notify for report ${report.id} (${caseNumber}).`,
        );
        return;
      }

      await this.mailService.sendSuperAdminIncidentNotification({
        bccEmails,
        reportId: report.id,
        caseNumber,
        title: report.title,
        severity: report.severity,
        county: report.county,
        subCounty: report.subCounty,
        createdAt: report.createdAt,
      });
    } catch (error) {
      this.logger.error(
        `Failed to dispatch Super Admin notification email for report ${report.id}:`,
        error,
      );
    }
  }

  async findAll() {
    const reports = await this.prisma.incidentReport.findMany({
      include: {
        incidentType: true,
        case: {
          include: {
            notes: true,
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Self-healing: Ensure legacy or manual reports have an associated Case
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      if (!report.case) {
        const caseNumber = `CASE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const newCase = await this.prisma.case.create({
          data: {
            caseNumber,
            incidentId: report.id,
            status: CaseStatus.NEW,
          },
          include: {
            notes: true,
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });
        reports[i].case = newCase;
      }
    }

    return reports;
  }

  async trackCase(caseNumber: string) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { caseNumber },
      include: {
        incident: {
          select: {
            title: true,
            createdAt: true,
            severity: true,
            county: true,
            subCounty: true,
            reportMethod: true,
            survivorStatus: true,
          },
        },
      },
    });

    if (!caseRecord) {
      return null;
    }

    return caseRecord;
  }

  async updateCase(
    incidentId: string,
    updateDto: { status?: CaseStatus; assignedToId?: string; note?: string },
    assignorId?: string,
  ) {
    let caseRecord = await this.prisma.case.findUnique({
      where: { incidentId },
      include: {
        incident: {
          select: {
            severity: true,
          },
        },
      },
    });

    if (!caseRecord) {
      const caseNumber = `CASE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      caseRecord = await this.prisma.case.create({
        data: {
          caseNumber,
          incidentId,
          status: CaseStatus.NEW,
        },
        include: {
          incident: {
            select: {
              severity: true,
            },
          },
        },
      });
    }

    const previousAssignedToId = caseRecord.assignedToId;

    const dataToUpdate: any = {};
    if (updateDto.status) {
      dataToUpdate.status = updateDto.status;
      dataToUpdate.closedAt =
        updateDto.status === CaseStatus.CLOSED ? new Date() : null;
    }

    if (updateDto.assignedToId !== undefined) {
      dataToUpdate.assignedToId = updateDto.assignedToId || null;
    }

    const updatedCase = await this.prisma.case.update({
      where: { id: caseRecord.id },
      data: dataToUpdate,
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        incident: {
          select: {
            severity: true,
          },
        },
      },
    });

    if (updateDto.status && updateDto.status !== caseRecord.status) {
      await this.prisma.caseStatusHistory.create({
        data: {
          caseId: caseRecord.id,
          status: updateDto.status,
          note: updateDto.note || 'Status updated via command dashboard',
        },
      });
    }

    if (updateDto.note && updateDto.assignedToId) {
      await this.prisma.caseNote.create({
        data: {
          caseId: caseRecord.id,
          userId: updateDto.assignedToId,
          note: updateDto.note,
        },
      });
    }

    // Trigger non-blocking case assignment notification if assignedToId changed to a new valid user ID
    const newAssignedToId = updateDto.assignedToId;
    if (newAssignedToId && newAssignedToId !== previousAssignedToId) {
      this.notifyCaseAssignmentAsync(updatedCase, newAssignedToId, assignorId);
    }

    return updatedCase;
  }

  private async notifyCaseAssignmentAsync(
    caseRecord: any,
    assigneeId: string,
    assignorId?: string,
  ) {
    try {
      const assignee = await this.prisma.user.findUnique({
        where: { id: assigneeId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!assignee || !assignee.email) {
        this.logger.warn(
          `Cannot send case assignment email for Case #${caseRecord.caseNumber}: Assignee ${assigneeId} has no valid email.`,
        );
        return;
      }

      let assignorName = 'Platform Admin';
      if (assignorId) {
        const assignor = await this.prisma.user.findUnique({
          where: { id: assignorId },
          select: {
            firstName: true,
            lastName: true,
          },
        });
        if (assignor) {
          assignorName = `${assignor.firstName} ${assignor.lastName}`.trim();
        }
      }

      const assigneeName = `${assignee.firstName} ${assignee.lastName}`.trim();

      await this.mailService.sendCaseAssignmentNotification({
        assigneeEmail: assignee.email,
        assigneeName,
        assignorName,
        caseId: caseRecord.id,
        caseNumber: caseRecord.caseNumber,
        severity: caseRecord.incident?.severity || 'MEDIUM',
        assignedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send case assignment email for Case #${caseRecord.caseNumber}:`,
        error,
      );
    }
  }

  async exportPdf(
    incidentId: string,
    currentUser: any,
    clientIp: string,
    redactPII: boolean,
  ) {
    // 1. Retrieve incident report and associated case
    const report = await this.prisma.incidentReport.findUnique({
      where: { id: incidentId },
      include: {
        incidentType: true,
        case: {
          include: {
            notes: {
              include: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            interventions: {
              include: {
                author: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            statusHistory: {
              include: {
                changedBy: {
                  select: { firstName: true, lastName: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(
        `Incident report with ID ${incidentId} not found.`,
      );
    }

    const caseRecord = report.case;
    if (!caseRecord) {
      throw new NotFoundException(
        `Associated case record for report ${incidentId} not found.`,
      );
    }

    // 2. Granular RBAC check: Super Admin / Manager vs Case Worker assignment check
    const isSuperAdminOrManager =
      currentUser.role === RoleName.ADMIN ||
      currentUser.role === RoleName.MANAGER;
    if (!isSuperAdminOrManager) {
      if (caseRecord.assignedToId !== currentUser.userId) {
        throw new ForbiddenException(
          'You are not authorized to export this case PDF. Only assigned handlers or administrators may export case files.',
        );
      }
    }

    // 3. Fetch downloading user details for watermark
    const downloadingUser = await this.prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { firstName: true, lastName: true, email: true },
    });

    const userFullName = downloadingUser
      ? `${downloadingUser.firstName} ${downloadingUser.lastName}`.trim()
      : 'Authorized User';
    const userEmail =
      downloadingUser?.email || currentUser.email || 'user@face-platform.com';

    // 4. Immutable Audit Logging Enforcement (Fail-Safe Rule)
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'CASE_EXPORT_PDF',
          entityType: 'Case',
          entityId: caseRecord.id,
          details: JSON.stringify({
            redactPII,
            clientIp,
            caseNumber: caseRecord.caseNumber,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (auditError) {
      this.logger.error(
        `CRITICAL: Mandatory Audit Log creation failed for Case ${caseRecord.id}:`,
        auditError,
      );
      throw new InternalServerErrorException(
        'Export security check failed. Audit log entry could not be written.',
      );
    }

    // 5. Build PDF payload & generate buffer
    const casePdfData = {
      caseNumber: caseRecord.caseNumber,
      status: caseRecord.status,
      severity: report.severity,
      reportId: report.id,
      reportTitle: report.title,
      reportDescription: report.description,
      category: report.incidentType?.name || 'General Incident',
      county: report.county,
      subCounty: report.subCounty,
      location: report.location,
      createdAt: report.createdAt,
      incidentDate: report.incidentDate,
      reportMethod: report.reportMethod,
      survivorStatus: report.survivorStatus,
      survivorIdentity: report.survivorIdentity,
      survivorName: report.survivorName,
      survivorPhone: report.survivorPhone,
      survivorAge: report.survivorAge,
      reporterName: report.reporterName,
      reporterPhone: report.reporterPhone,
      perpetrator: report.perpetrator,
      perpetratorCategory: report.perpetratorCategory,
      assignedHandlerName: caseRecord.assignedTo
        ? `${caseRecord.assignedTo.firstName} ${caseRecord.assignedTo.lastName}`
        : undefined,
      assignedHandlerEmail: caseRecord.assignedTo?.email,
      notes: caseRecord.notes,
      interventions: (caseRecord as any).interventions,
      statusHistory: (caseRecord as any).statusHistory,
    };

    const pdfBuffer = await this.pdfGeneratorService.generateCasePdf(
      casePdfData,
      {
        userFullName,
        userEmail,
        timestamp: new Date(),
        ipAddress: clientIp || '127.0.0.1',
        redactPII,
      },
    );

    return {
      pdfBuffer,
      filename: `CASE-${caseRecord.caseNumber}-${Date.now()}.pdf`,
    };
  }
}
