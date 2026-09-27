import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { avatarUploadOptions } from '../common/utils/multer-options.util';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==========================================
  // 1. ENDPOINTS DÀNH CHO USER HIỆN TẠI (/me)
  // (Không cần Guard Role, chỉ cần đăng nhập)
  // ==========================================

  /**
   * GET /api/users/me
   * Xem thông tin cá nhân của chính mình
   */
  @Get('me')
  @ApiOperation({
    summary: 'Lấy thông tin cá nhân của người dùng hiện tại (Get Me)',
    description: 'Chỉ cần đăng nhập bằng Bearer JWT, không yêu cầu phân quyền Role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin cá nhân của người dùng.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  getMe(@Request() req: any) {
    return this.usersService.getMe(req.user.id);
  }

  /**
   * PATCH /api/users/me
   * Cập nhật thông tin cá nhân & Upload ảnh đại diện
   */
  @Patch('me')
  @UseInterceptors(FileInterceptor('avatar', avatarUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cập nhật thông tin cá nhân & Upload avatar (Update Me)',
    description: 'Hỗ trợ multipart/form-data để tải tệp ảnh avatar mới (tùy chọn) và cập nhật họ tên, số điện thoại.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thông tin cá nhân thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc file không đúng định dạng ảnh / vượt quá 5MB.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 409,
    description: 'Số điện thoại đã tồn tại.',
  })
  updateMe(
    @Request() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.updateMe(req.user.id, updateProfileDto, file);
  }

  /**
   * PATCH /api/users/me/change-password
   * Đổi mật khẩu tài khoản cá nhân
   */
  @Patch('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đổi mật khẩu tài khoản cá nhân',
    description: 'Yêu cầu mật khẩu hiện tại và mật khẩu mới.',
  })
  @ApiResponse({
    status: 200,
    description: 'Đổi mật khẩu thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Mật khẩu cũ không chính xác hoặc dữ liệu không hợp lệ.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(req.user.id, changePasswordDto);
  }

  // ==========================================
  // 2. ENDPOINTS QUẢN TRỊ USER (CUD & List/Get by ID)
  // (Yêu cầu RolesGuard và quyền ADMIN)
  // ==========================================

  /**
   * POST /api/users
   * Tạo người dùng mới kèm upload ảnh avatar (Chỉ ADMIN)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('avatar', avatarUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tạo tài khoản người dùng mới & Upload avatar (Admin Only)',
    description: 'Chỉ ADMIN mới có quyền tạo tài khoản cho nhân viên (STAFF) hoặc khách hàng (OWNER), có thể đính kèm file ảnh đại diện.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo tài khoản thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc file không đúng định dạng ảnh.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  @ApiResponse({
    status: 409,
    description: 'Email hoặc số điện thoại đã tồn tại.',
  })
  create(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.create(createUserDto, file);
  }

  /**
   * GET /api/users
   * Lấy danh sách người dùng có phân trang & lọc (Chỉ ADMIN)
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách người dùng (Admin Only)',
    description: 'Hỗ trợ phân trang, tìm kiếm từ khóa và lọc theo vai trò/trạng thái.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách người dùng cùng metadata phân trang.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  /**
   * GET /api/users/:id
   * Xem thông tin chi tiết một người dùng theo ID (Chỉ ADMIN)
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'id', description: 'ID người dùng', example: 1 })
  @ApiOperation({
    summary: 'Xem chi tiết người dùng theo ID (Admin Only)',
    description: 'Xem thông tin chi tiết của bất kỳ người dùng nào trong hệ thống.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết của người dùng.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy người dùng.',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  /**
   * PATCH /api/users/:id
   * Cập nhật thông tin người dùng theo ID & Upload avatar (Chỉ ADMIN)
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('avatar', avatarUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID người dùng', example: 1 })
  @ApiOperation({
    summary: 'Cập nhật thông tin người dùng theo ID & Upload avatar (Admin Only)',
    description: 'ADMIN có thể cập nhật thông tin, trạng thái, vai trò và tải lên tệp ảnh đại diện mới.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thông tin thành công.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy người dùng.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.update(id, updateUserDto, file);
  }

  /**
   * DELETE /api/users/:id
   * Xóa mềm người dùng theo ID (Chỉ ADMIN)
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'id', description: 'ID người dùng', example: 2 })
  @ApiOperation({
    summary: 'Xóa mềm người dùng theo ID (Admin Only)',
    description: 'Chuyển isDelete = true và status = INACTIVE. Admin không thể tự xóa chính mình.',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa người dùng thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Không thể tự xóa tài khoản của chính mình.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy người dùng.',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.usersService.remove(id, req.user.id);
  }
}
