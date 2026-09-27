import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserStatus } from '@prisma/client';

export interface JwtTokenPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Đăng nhập bằng Email và Password
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        isDelete: false,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa hoặc vô hiệu hóa');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const payload: JwtTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
      },
    };
  }

  /**
   * Cấp Access Token mới từ Refresh Token Stateless
   * Trả về Access Token mới và giữ nguyên Refresh Token cũ theo yêu cầu
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'pethub_jwt_refresh_secret_key_2026_super_secure',
    );

    let payload: JwtTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtTokenPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch (err) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Payload của Refresh token không hợp lệ');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.isDelete || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản người dùng không hợp lệ hoặc đã bị vô hiệu hóa');
    }

    const newAccessTokenPayload: JwtTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = await this.generateAccessToken(newAccessTokenPayload);

    return {
      accessToken: newAccessToken,
      refreshToken, // Trả lại Refresh Token cũ theo yêu cầu
    };
  }

  /**
   * Tạo Access Token (mặc định 1 ngày)
   */
  private async generateAccessToken(payload: JwtTokenPayload): Promise<string> {
    const secret = this.configService.get<string>(
      'JWT_SECRET',
      'pethub_jwt_access_secret_key_2026_super_secure',
    );
    const expiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '1d');

    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn,
    });
  }

  /**
   * Tạo Refresh Token (mặc định 30 ngày)
   */
  private async generateRefreshToken(payload: JwtTokenPayload): Promise<string> {
    const secret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'pethub_jwt_refresh_secret_key_2026_super_secure',
    );
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');

    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn,
    });
  }
}
