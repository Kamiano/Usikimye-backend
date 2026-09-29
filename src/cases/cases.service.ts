import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CaseStatus, RoleName, InterventionCategory } from '@prisma/client';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReassignCaseDto } from './dto/reassign-case.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  /**
   * Helper to resolve a case record by caseId, caseNumber, or incidentId
   */
  async findCaseRecord(id: string) {
    let caseRecord = await this.prisma.case.findFirst({
      where: {
        OR: [
          { id },
          { caseNumber: id },
          { incidentId: id },
        ],
      },
    });

    return caseRecord;
  }

  /**
   * Verify RBAC permissions for accessing a case
   */
  verifyAccessPermission(caseRecord: any, currentUser: any) {
    const isSuperAdminOrManager =
      currentUser.role === RoleName.ADMIN ||
      currentUser.role === RoleName.MANAGER ||
      currentUser.role === RoleName.MONITORING_OFFICER;

    if (isSuperAdminOrManager) {
      return true;
    }

    if (caseRecord.assignedToId === currentUser.userId) {
      return true;
    }

    throw new ForbiddenException(
      'Access Denied: You are not assigned to this case or lack permission to view it.',
    );
  }

  /**
   * GET /cases/:id - Retrieve detailed Case Workspace data with RBAC guard
   */
  async findOne(id: string, currentUser: any) {
    const targetCase = await this.findCaseRecord(id);
    if (!targetCase) {
      throw new NotFoundException(`Case with ID or reference "${id}" not found.`);
    }

    // Enforce RBAC
    this.verifyAccessPermission(targetCase, currentUser);

    // Fetch full case hierarchy
    const caseDetails = await this.prisma.case.findUnique({
      where: { id: targetCase.id },
      include: {
        incident: {
          include: {
            incidentType: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: { select: { name: true } },
          },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        interventions: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Fetch matching audit logs for full activity timeline
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: targetCase.id },
          { entityId: targetCase.incidentId },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...caseDetails,
      auditLogs,
    };
  }

  /**
   * POST /cases/:id/interventions - Create handler intervention record
   */
  async createIntervention(
    id: string,
    createInterventionDto: CreateInterventionDto,
    currentUser: any,
  ) {
    const targetCase = await this.findCaseRecord(id);
    if (!targetCase) {
      throw new NotFoundException(`Case with ID or reference "${id}" not found.`);
    }

    this.verifyAccessPermission(targetCase, currentUser);

    const intervention = await this.prisma.caseIntervention.create({
      data: {
        caseId: targetCase.id,
        authorId: currentUser.userId,
        category: createInterventionDto.category,
        noteText: createInterventionDto.noteText,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    // Write Audit Log
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'LOG_HANDLER_INTERVENTION',
          entityType: 'Case',
          entityId: targetCase.id,
          details: JSON.stringify({
            category: createInterventionDto.category,
            interventionId: intervention.id,
          }),
        },
      });
    } catch (err) {
      this.logger.error('Failed to log audit entry for intervention creation', err);
    }

    return intervention;
  }

  /**
   * PATCH /cases/:id/stage - Synchronized Stage Stepper Update
   */
  async updateStage(
    id: string,
    updateStageDto: UpdateStageDto,
    currentUser: any,
  ) {
    const targetCase = await this.findCaseRecord(id);
    if (!targetCase) {
      throw new NotFoundException(`Case with ID or reference "${id}" not found.`);
    }

    this.verifyAccessPermission(targetCase, currentUser);

    const previousStatus = targetCase.status;
    const newStatus = updateStageDto.stage;

    const dataToUpdate: any = {
      status: newStatus,
    };

    if (newStatus === CaseStatus.RESOLVED || newStatus === CaseStatus.CLOSED) {
      dataToUpdate.closedAt = new Date();
    }

    const updatedCase = await this.prisma.case.update({
      where: { id: targetCase.id },
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
      },
    });

    // Append to CaseStatusHistory
    await this.prisma.caseStatusHistory.create({
      data: {
        caseId: targetCase.id,
        status: newStatus,
        changedById: currentUser.userId,
        note: updateStageDto.note || updateStageDto.resolutionSummary || `Stage updated from ${previousStatus} to ${newStatus}`,
      },
    });

    // If a resolution summary is provided on closure/resolution, automatically log an intervention record
    if (updateStageDto.resolutionSummary) {
      await this.prisma.caseIntervention.create({
        data: {
          caseId: targetCase.id,
          authorId: currentUser.userId,
          category: InterventionCategory.GENERAL_NOTE,
          noteText: `[Final Case Resolution Summary]: ${updateStageDto.resolutionSummary}`,
        },
      });
    }

    // Write Audit Log
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'STAGE_STEPPER_UPDATE',
          entityType: 'Case',
          entityId: targetCase.id,
          details: JSON.stringify({
            previousStatus,
            newStatus,
            resolutionSummary: updateStageDto.resolutionSummary || null,
          }),
        },
      });
    } catch (err) {
      this.logger.error('Failed to write audit log for stage update', err);
    }

    return updatedCase;
  }

  /**
   * PATCH /cases/:id/reassign - Reassign case to another handler
   */
  async reassignCase(
    id: string,
    reassignCaseDto: ReassignCaseDto,
    currentUser: any,
  ) {
    const isSuperAdminOrManager =
      currentUser.role === RoleName.ADMIN ||
      currentUser.role === RoleName.MANAGER;

    if (!isSuperAdminOrManager) {
      throw new ForbiddenException(
        'Only Super Admins and Managers are authorized to reassign case ownership.',
      );
    }

    const targetCase = await this.findCaseRecord(id);
    if (!targetCase) {
      throw new NotFoundException(`Case with ID or reference "${id}" not found.`);
    }

    const previousAssignedToId = targetCase.assignedToId;
    const newAssignedToId = reassignCaseDto.assignedToId || null;

    const updatedCase = await this.prisma.case.update({
      where: { id: targetCase.id },
      data: {
        assignedToId: newAssignedToId,
      },
      include: {
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

    // Append to status history
    await this.prisma.caseStatusHistory.create({
      data: {
        caseId: targetCase.id,
        status: targetCase.status,
        changedById: currentUser.userId,
        note: reassignCaseDto.note || `Case ownership reassigned to ${newAssignedToId ? newAssignedToId : 'Unassigned'}`,
      },
    });

    // Audit Log
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'REASSIGN_CASE_OWNER',
          entityType: 'Case',
          entityId: targetCase.id,
          details: JSON.stringify({
            previousAssignedToId,
            newAssignedToId,
          }),
        },
      });
    } catch (err) {
      this.logger.error('Failed to log audit entry for case reassignment', err);
    }

    return updatedCase;
  }
}
