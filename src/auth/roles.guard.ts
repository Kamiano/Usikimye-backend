import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    // 1. Pull the roles assigned to the controller route metadata
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified, let the route fall back to standard JWT protection
    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Safety check if user or token payload is missing entirely
    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: Authentication payload missing role authority.');
    }

    // 2. Direct string check matches your JwtStrategy structure flawlessly
    const hasRole = requiredRoles.includes(user.role as RoleName);
    if (!hasRole) {
      throw new ForbiddenException('Access denied: Your account permissions cannot access this route.');
    }

    return true;
  }
}
