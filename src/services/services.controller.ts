import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
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
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { serviceImageUploadOptions } from '../common/utils/multer-options.util';

@ApiTags('Services')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  /**
   * POST /api/services
   * Tạo mới dịch vụ & Upload ảnh minh họa (Chỉ ADMIN)
   */
  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('image', serviceImageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tạo mới dịch vụ & Upload ảnh minh họa (Admin Only)',
    description:
      'Tạo mới dịch vụ với các thông tin: name, category, description, durationMinutes, basePrice và upload ảnh minh họa (multipart/form-data).\n\n' +
      '⚠️ LƯU Ý HỆ THỐNG QUAN TRỌNG: Tuyệt đối KHÔNG được tạo mới dịch vụ có category là CHECK_IN hoặc CHECK_OUT vì đây là các dịch vụ hệ thống cố định của luồng Booking.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo mới dịch vụ thành công.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu đầu vào không hợp lệ hoặc cố tình tạo mới dịch vụ có category là CHECK_IN / CHECK_OUT.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  create(
    @Body() createServiceDto: CreateServiceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.servicesService.create(createServiceDto, file);
  }

  /**
   * GET /api/services
   * Lấy danh sách dịch vụ (ADMIN, STAFF, OWNER)
   */
  @Get()
  @Roles(Role.ADMIN, Role.STAFF, Role.OWNER)
  @ApiOperation({
    summary: 'Lấy danh sách dịch vụ trong hệ thống (Admin, Staff, Owner)',
    description:
      'Hỗ trợ phân trang, tìm kiếm theo tên/mô tả dịch vụ và lọc theo category. Cho phép tất cả người dùng đã đăng nhập (Admin, Staff, Owner).',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách dịch vụ kèm thông tin phân trang.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập.',
  })
  findAll(@Query() query: QueryServiceDto) {
    return this.servicesService.findAll(query);
  }

  /**
   * GET /api/services/:id
   * Lấy thông tin chi tiết một dịch vụ (ADMIN, STAFF, OWNER)
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF, Role.OWNER)
  @ApiOperation({
    summary: 'Lấy chi tiết dịch vụ theo ID (Admin, Staff, Owner)',
    description:
      'Trả về thông tin chi tiết của dịch vụ bao gồm đơn giá, thời lượng và ảnh minh họa. Cho phép tất cả người dùng đã đăng nhập (Admin, Staff, Owner).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của dịch vụ',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết dịch vụ.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dịch vụ hoặc dịch vụ không tồn tại.',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.findOne(id);
  }

  /**
   * PATCH /api/services/:id
   * Cập nhật thông tin dịch vụ & Upload ảnh minh họa (Chỉ ADMIN)
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('image', serviceImageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cập nhật thông tin dịch vụ & Upload ảnh minh họa (Admin Only)',
    description:
      'Cho phép chỉnh sửa name, description, durationMinutes, basePrice và upload ảnh minh họa mới (multipart/form-data).\n\n' +
      '⚠️ LƯU Ý HỆ THỐNG QUAN TRỌNG: Tuyệt đối KHÔNG được chỉnh sửa các dịch vụ có category là CHECK_IN hoặc CHECK_OUT vì đây là các dịch vụ hệ thống cố định của luồng Booking.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của dịch vụ cần cập nhật',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật dịch vụ thành công.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu đầu vào hoặc tệp ảnh không hợp lệ, hoặc cố tình chỉnh sửa dịch vụ có category CHECK_IN / CHECK_OUT.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dịch vụ hoặc dịch vụ không tồn tại.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServiceDto: UpdateServiceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.servicesService.update(id, updateServiceDto, file);
  }

  /**
   * DELETE /api/services/:id
   * Xóa mềm một dịch vụ (Chỉ ADMIN)
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Xóa mềm dịch vụ (Admin Only)',
    description:
      'Chuyển trạng thái isDelete = true của dịch vụ.\n\n' +
      '⚠️ LƯU Ý HỆ THỐNG QUAN TRỌNG:\n' +
      '- Tuyệt đối KHÔNG được xóa các dịch vụ có category là CHECK_IN hoặc CHECK_OUT vì đây là các dịch vụ hệ thống cố định của luồng Booking.\n' +
      '- Hệ thống sẽ chặn xóa nếu dịch vụ đang thuộc các đơn booking chưa hoàn tất (PENDING, CONFIRMED, IN_PROGRESS).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của dịch vụ cần xóa',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa mềm dịch vụ thành công.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Cố tình xóa dịch vụ CHECK_IN / CHECK_OUT hoặc dịch vụ đang nằm trong đơn đặt lịch chưa hoàn tất.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dịch vụ hoặc dịch vụ không tồn tại.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.remove(id);
  }
}
