import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

interface AuthedRequest extends Request {
  user: { id: string; email: string; role: string };
}

const COOKIE_NAME = 'access_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: unknown) {
    const { accessToken, user } = await this.auth.login(dto);
    (res as Response).cookie(COOKIE_NAME, accessToken, COOKIE_OPTIONS);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: unknown) {
    (res as Response).clearCookie(COOKIE_NAME);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: unknown) {
    return this.auth.getMe((req as AuthedRequest).user.id);
  }
}
