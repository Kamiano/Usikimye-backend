import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { AuthGuard } from '@nestjs/passport';
import { CaseStatus, RoleName } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post() // Keeps form submission open to anyone
  async create(@Body() createIncidentDto: CreateIncidentDto) {
    return this.incidentsService.create(createIncidentDto);
  }

  @Get('track/:caseNumber')
  async trackCase(@Param('caseNumber') caseNumber: string) {
    return this.incidentsService.trackCase(caseNumber);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.MANAGER, RoleName.MONITORING_OFFICER)
  async findAll() {
    return this.incidentsService.findAll();
  }

  @Patch(':id/case')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.MANAGER)
  async updateCase(
    @Param('id') incidentId: string,
    @Body()
    updateDto: { status?: CaseStatus; assignedToId?: string; note?: string },
    @Request() req: any,
  ) {
    return this.incidentsService.updateCase(
      incidentId,
      updateDto,
      req?.user?.userId,
    );
  }

  @Get(':id/export')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(
    RoleName.ADMIN,
    RoleName.MANAGER,
    RoleName.CASE_WORKER,
    RoleName.MONITORING_OFFICER,
  )
  async exportPdf(
    @Param('id') incidentId: string,
    @Query('redactPII') redactPII: string,
    @Request() req: any,
    @Res() res: any,
  ) {
    const isRedacted = redactPII === 'true' || redactPII === '1';
    const clientIp =
      req.ip ||
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const { pdfBuffer, filename } = await this.incidentsService.exportPdf(
      incidentId,
      req.user,
      Array.isArray(clientIp) ? clientIp[0] : clientIp,
      isRedacted,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  }
}
