import {
  Controller,
  Get,
  Patch,
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
@Roles(Role.ADMIN)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  /**
   * GET /api/services
   * Lấy danh sách dịch vụ (Chỉ ADMIN)
   */
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách dịch vụ trong hệ thống (Admin Only)',
    description:
      'Hỗ trợ phân trang, tìm kiếm theo tên/mô tả dịch vụ và lọc theo category.',
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
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
  })
  findAll(@Query() query: QueryServiceDto) {
    return this.servicesService.findAll(query);
  }

  /**
   * GET /api/services/:id
   * Lấy thông tin chi tiết một dịch vụ (Chỉ ADMIN)
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết dịch vụ theo ID (Admin Only)',
    description: 'Trả về thông tin chi tiết của dịch vụ bao gồm đơn giá, thời lượng và ảnh minh họa.',
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
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN).',
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
  @UseInterceptors(FileInterceptor('image', serviceImageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cập nhật thông tin dịch vụ & Upload ảnh minh họa (Admin Only)',
    description:
      'Cho phép chỉnh sửa name, description, durationMinutes, basePrice và upload ảnh minh họa mới (multipart/form-data).',
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
    description: 'Dữ liệu đầu vào hoặc tệp ảnh tải lên không hợp lệ.',
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
}
