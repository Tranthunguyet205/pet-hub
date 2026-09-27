import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   * Đăng nhập bằng Email và Password
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập tài khoản',
    description: 'Xác thực email và mật khẩu, cấp cặp JWT Access Token (1 ngày) và Refresh Token (30 ngày).',
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công, trả về access token, refresh token và profile user.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ (Validation Error).',
  })
  @ApiResponse({
    status: 401,
    description: 'Email hoặc mật khẩu không chính xác / Tài khoản bị khóa.',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/auth/refresh
   * Cấp Access Token mới từ Refresh Token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Làm mới Access Token',
    description: 'Xác thực Refresh Token (Stateless) và cấp một Access Token mới.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cấp Access Token mới thành công và trả lại Refresh Token hiện tại.',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh Token không hợp lệ, đã hết hạn hoặc tài khoản bị vô hiệu hóa.',
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }
}
