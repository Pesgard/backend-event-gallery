import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Always try to authenticate to extract user info
    // The handleRequest method will decide whether to throw or not
    return super.canActivate(context);
  }

  // Make authentication optional for public routes
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If public route, don't require auth but still return user if token is valid
    if (isPublic) {
      // Return user if valid, otherwise null (no error thrown)
      return user || null;
    }

    // For protected routes, throw error if no valid user
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }

    return user;
  }
}
