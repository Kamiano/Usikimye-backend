import { Module, forwardRef } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { IncidentsModule } from '../incidents/incidents.module';

@Module({
  imports: [PrismaModule, MailModule, forwardRef(() => IncidentsModule)],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
