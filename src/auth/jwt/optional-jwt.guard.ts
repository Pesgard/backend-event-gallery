import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that makes JWT authentication optional.
 * If a valid token is provided, the user will be attached to the request.
 * If no token or invalid token, the request continues without a user.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Always allow the request, but try to authenticate
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // Don't throw on errors, just return null user
    return user || null;
  }
}

