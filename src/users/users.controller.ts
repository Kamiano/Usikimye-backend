import { Controller, Get, Post, Body, UseGuards, Patch, Req, Delete, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName } from '@prisma/client';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  @Get()
  @Roles(RoleName.ADMIN, RoleName.MANAGER)
  async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles(RoleName.ADMIN)
  async create(
    @Body() body: { firstName: string; lastName: string; email: string; roleName: string; password?: string }
  ) {
    return this.usersService.create(body);
  }

  @Patch('change-password')
  @UseGuards(AuthGuard('jwt'))
  async changePassword(@Req() req: any, @Body() body: { currentPass: string; newPass: string }) {
    return this.usersService.changePassword(req.user.userId, body.currentPass, body.newPass);
  }

  @Roles(RoleName.ADMIN)
  @Patch(':id/suspend')
  async suspend(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Roles(RoleName.ADMIN)
  @Patch(':id/reactivate')
  async reactivate(@Param('id') id: string) {
    return this.usersService.reactivate(id);
  }

  @Roles(RoleName.ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}

