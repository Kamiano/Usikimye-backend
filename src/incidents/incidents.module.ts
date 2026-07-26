import { Module } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { PrismaModule } from '../../prisma/prisma.module'; // Adjust path if needed

@Module({
  imports: [PrismaModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
})
export class IncidentsModule {}
