import { Injectable } from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'changeme',
    });
  }

  validate(payload: any) {
    // payload: { sub: userId, email, username, iat, exp }

    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
    };
  }
}

