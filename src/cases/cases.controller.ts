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
  Inject,
  forwardRef,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName } from '@prisma/client';
import { CasesService } from './cases.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReassignCaseDto } from './dto/reassign-case.dto';
import { IncidentsService } from '../incidents/incidents.service';

@Controller('cases')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
    @Inject(forwardRef(() => IncidentsService))
    private readonly incidentsService: IncidentsService,
  ) {}

  @Get(':id')
  @Roles(
    RoleName.ADMIN,
    RoleName.MANAGER,
    RoleName.CASE_WORKER,
    RoleName.MONITORING_OFFICER,
  )
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.casesService.findOne(id, req.user);
  }

  @Post(':id/interventions')
  @Roles(
    RoleName.ADMIN,
    RoleName.MANAGER,
    RoleName.CASE_WORKER,
    RoleName.MONITORING_OFFICER,
  )
  async createIntervention(
    @Param('id') id: string,
    @Body() createInterventionDto: CreateInterventionDto,
    @Request() req: any,
  ) {
    return this.casesService.createIntervention(id, createInterventionDto, req.user);
  }

  @Patch(':id/stage')
  @Roles(
    RoleName.ADMIN,
    RoleName.MANAGER,
    RoleName.CASE_WORKER,
    RoleName.MONITORING_OFFICER,
  )
  async updateStage(
    @Param('id') id: string,
    @Body() updateStageDto: UpdateStageDto,
    @Request() req: any,
  ) {
    return this.casesService.updateStage(id, updateStageDto, req.user);
  }

  @Patch(':id/reassign')
  @Roles(RoleName.ADMIN, RoleName.MANAGER)
  async reassignCase(
    @Param('id') id: string,
    @Body() reassignCaseDto: ReassignCaseDto,
    @Request() req: any,
  ) {
    return this.casesService.reassignCase(id, reassignCaseDto, req.user);
  }

  @Get(':id/export')
  @Roles(
    RoleName.ADMIN,
    RoleName.MANAGER,
    RoleName.CASE_WORKER,
    RoleName.MONITORING_OFFICER,
  )
  async exportPdf(
    @Param('id') id: string,
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

    // Resolve case or incident ID
    const caseRecord = await this.casesService.findCaseRecord(id);
    const incidentId = caseRecord ? caseRecord.incidentId : id;

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
