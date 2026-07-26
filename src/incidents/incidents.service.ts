import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { CaseStatus } from '@prisma/client';

@Injectable()
export class IncidentsService {
  constructor(private prisma: PrismaService) {}

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
        title: createIncidentDto.title || `${createIncidentDto.type || 'Incident'} Report`,
        description: createIncidentDto.description || 'No description provided.',
        
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
        preferredContactChannel: createIncidentDto.preferredContactChannel || null,
        relationshipToSurvivor: createIncidentDto.relationshipToSurvivor || null,
        survivorIdentity: createIncidentDto.survivorIdentity || null,
        survivorIdentityOther: createIncidentDto.survivorIdentityOther || null,
        survivorName: createIncidentDto.survivorName || createIncidentDto.reporterName || null,
        survivorPhone: createIncidentDto.reporterPhone || null, // Stores reporter contact if provided
        survivorAge: createIncidentDto.survivorAge || null,
        survivorAgeGroup: createIncidentDto.survivorAge || createIncidentDto.survivorAgeGroup || null,
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

    // Return report details AND the generated database Case number back to UI
    return {
      ...report,
      case: newCase,
    };
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
        reports[i].case = newCase as any;
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

  async updateCase(incidentId: string, updateDto: { status?: CaseStatus; assignedToId?: string; note?: string }) {
    let caseRecord = await this.prisma.case.findUnique({
      where: { incidentId },
    });

    if (!caseRecord) {
      const caseNumber = `CASE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      caseRecord = await this.prisma.case.create({
        data: {
          caseNumber,
          incidentId,
          status: CaseStatus.NEW,
        },
      });
    }

    const dataToUpdate: any = {};
    if (updateDto.status) {
      dataToUpdate.status = updateDto.status;
      dataToUpdate.closedAt = updateDto.status === CaseStatus.CLOSED ? new Date() : null;
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

    return updatedCase;
  }
}