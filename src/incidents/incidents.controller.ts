import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
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
    @Body() updateDto: { status?: CaseStatus; assignedToId?: string; note?: string }
  ) {
    return this.incidentsService.updateCase(incidentId, updateDto);
  }
}
