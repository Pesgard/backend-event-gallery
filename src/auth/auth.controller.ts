import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  async logout() {
    return this.authService.logout();
  }

  @Get('me')
  async me(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.validateUserById(user.userId);
  }

  @Get('validate-session')
  async validateSession(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.validateSession(user.userId);
  }
}
