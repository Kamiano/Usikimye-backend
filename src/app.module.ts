import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PrismaModule } from '../prisma/prisma.module';
import { IncidentsModule } from './incidents/incidents.module';

@Module({
  imports: [AuthModule, UsersModule, RolesModule, PrismaModule, IncidentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
