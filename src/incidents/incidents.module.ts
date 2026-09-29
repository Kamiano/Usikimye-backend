import { Module } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { PrismaModule } from '../../prisma/prisma.module'; // Adjust path if needed
import { MailModule } from '../mail/mail.module';
import { PdfGeneratorService } from './pdf-generator.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, PdfGeneratorService],
})
export class IncidentsModule {}
