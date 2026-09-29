import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        role: {
          select: {
            name: true,
          },
        },
      },
      // Remove where: { isActive: true } to allow admins to see suspended users
    });
  }

  async create(dto: {
    firstName: string;
    lastName: string;
    email: string;
    roleName: string;
    password?: string;
  }) {
    // Resolve database role by name
    const dbRoleName = dto.roleName.toUpperCase() as any; // e.g. ADMIN, MANAGER, MONITORING_OFFICER, CASE_WORKER
    let role = await this.prisma.role.findUnique({
      where: { name: dbRoleName },
    });

    if (!role) {
      role = await this.prisma.role.create({
        data: { name: dbRoleName },
      });
    }

    const passwordHash = await bcrypt.hash(dto.password || 'Usikimye123!', 10);

    const createdUser = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        roleId: role.id,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    const plainTextPassword = dto.password || 'Usikimye123!';
    this.mailService
      .sendWelcomeEmail({
        email: createdUser.email,
        firstName: createdUser.firstName,
        roleName: dto.roleName.toUpperCase(),
        password: plainTextPassword,
      })
      .catch((err) => {
        console.error('Mailing Pipeline Log -> Dispatch failed:', err.message);
      });

    return createdUser;
  }

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid current password');

    const newPasswordHash = await bcrypt.hash(newPass, 10);
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
      select: { id: true, email: true },
    });
  }

  async deactivate(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, email: true, firstName: true, isActive: true },
    });

    this.mailService
      .sendSuspensionEmail(user.email, user.firstName)
      .catch((err) => {
        console.error(
          'Mailing Pipeline Log -> Suspension dispatch failed:',
          err.message,
        );
      });

    return user;
  }

  async delete(id: string) {
    // First get the user to get email and firstName
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { email: true, firstName: true },
    });

    const deletedUser = await this.prisma.user.delete({
      where: { id },
    });

    if (user) {
      this.mailService
        .sendDeletionEmail(user.email, user.firstName)
        .catch((err) => {
          console.error(
            'Mailing Pipeline Log -> Deletion dispatch failed:',
            err.message,
          );
        });
    }

    return deletedUser;
  }

  async reactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: { id: true, email: true, isActive: true },
    });
  }
}
