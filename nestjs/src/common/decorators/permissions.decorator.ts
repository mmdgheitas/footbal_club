import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { getSessionUser, getSessionUserId, getSessionUserRole, SessionUser } from '../session/session.types';

export const PERMISSIONS_KEY = 'fc:permissions';
export const ROLES_KEY = 'fc:roles';
export const IS_PUBLIC_KEY = 'fc:isPublic';
export const IS_GUEST_ONLY_KEY = 'fc:isGuestOnly';

/** Require the current user to hold at least one of these permissions. */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Require the current user to hold one of these roles. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** Route is reachable without authentication (legacy isPublicRoute list). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Route redirects authenticated users away (legacy AuthMiddleware::requireGuest). */
export const GuestOnly = () => SetMetadata(IS_GUEST_ONLY_KEY, true);

/** Injects the authenticated user id ($_SESSION['user_id']). */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number | null =>
    getSessionUserId(ctx.switchToHttp().getRequest<Request>()),
);

/** Injects the authenticated user's role ($_SESSION['user_role']). */
export const CurrentUserRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null =>
    getSessionUserRole(ctx.switchToHttp().getRequest<Request>()),
);

/** Injects the full session user ($_SESSION['user']). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser | null =>
    getSessionUser(ctx.switchToHttp().getRequest<Request>()),
);
