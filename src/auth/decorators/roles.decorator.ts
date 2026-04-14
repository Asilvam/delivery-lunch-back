import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../auth.service';

export const ROLES_KEY = 'roles';

/** Declara qué roles tienen acceso al endpoint. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
