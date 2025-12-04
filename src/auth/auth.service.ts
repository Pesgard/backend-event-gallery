import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: UserResponse;
  sessionId: string; // JWT token - named sessionId for frontend compatibility
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private toUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check unique email & username
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new BadRequestException('Email already in use');
    }

    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new BadRequestException('Username already in use');
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash: hash,
        fullName: dto.fullName ?? null,
      },
    });

    const payload = { sub: user.id, email: user.email, username: user.username };
    const token = this.jwtService.sign(payload);

    return {
      user: this.toUserResponse(user),
      sessionId: token,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const pwMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!pwMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, username: user.username };
    const token = this.jwtService.sign(payload);

    return {
      user: this.toUserResponse(user),
      sessionId: token,
    };
  }

  async logout(): Promise<{ message: string }> {
    // With JWT, logout is handled client-side by removing the token
    // Server-side we just return success
    return { message: 'Logged out successfully' };
  }

  async validateUserById(userId: string): Promise<UserResponse | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    return this.toUserResponse(user);
  }

  async validateSession(
    userId: string,
  ): Promise<{ valid: boolean; user?: UserResponse }> {
    const user = await this.validateUserById(userId);
    if (!user) {
      return { valid: false };
    }
    return { valid: true, user };
  }
}
