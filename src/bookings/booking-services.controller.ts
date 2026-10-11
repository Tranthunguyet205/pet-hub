import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
  ApiBody,
} from '@nestjs/swagger';
import { BookingServicesService } from './booking-services.service';
import { CreateBookingServiceDto } from './dto/create-booking-service.dto';
import { UpdateBookingServiceDto } from './dto/update-booking-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { bookingServiceImageUploadOptions } from '../common/utils/multer-options.util';

@ApiTags('Booking Services')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
@Controller('booking-services')
export class BookingServicesController {
  constructor(
    private readonly bookingServicesService: BookingServicesService,
  ) {}

  /**
   * POST /api/booking-services
   * Thêm dịch vụ vào đơn đặt lịch (Admin & Staff Only)
   */
  @Post()
  @ApiOperation({
    summary: 'Thêm dịch vụ vào đơn đặt lịch (Admin & Staff Only)',
    description:
      'Chỉ ADMIN và STAFF có quyền thêm dịch vụ vào đơn booking. Đơn giá (price) được tự động lấy từ giá gốc (basePrice) của dịch vụ (không cần truyền).',

  })
  @ApiResponse({
    status: 201,
    description: 'Thêm dịch vụ vào đơn booking thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN hoặc STAFF).',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn đặt lịch, dịch vụ hoặc nhân viên.',
  })
  create(@Body() createDto: CreateBookingServiceDto) {
    return this.bookingServicesService.create(createDto);
  }

  /**
   * PATCH /api/booking-services/:id
   * Cập nhật thông tin dịch vụ trong đơn đặt lịch (Admin & Staff Only)
   */
  @Patch(':id')
  @UseInterceptors(FileInterceptor('file', bookingServiceImageUploadOptions))
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'ID của dịch vụ trong booking (BookingService ID)',
    example: 1,
  })
  @ApiOperation({
    summary:
      'Cập nhật tiến độ / thời gian / giá / ảnh dịch vụ (Admin & Staff Only)',
    description:
      'Chỉ cho phép cập nhật 5 trường: actualStartTime, actualEndTime, status, imageUrl, price. Hỗ trợ gửi JSON hoặc tải file ảnh multipart/form-data (field "file"). Nếu không gửi ảnh hoặc gửi giá trị không hợp lệ, hệ thống sẽ xóa ảnh cũ.',
  })
  @ApiBody({
    description:
      'Dữ liệu cập nhật BookingService (hỗ trợ cả JSON lẫn multipart/form-data)',
    schema: {
      type: 'object',
      properties: {
        actualStartTime: {
          type: 'string',
          format: 'date-time',
          example: '2026-10-15T09:15:00.000Z',
        },
        actualEndTime: {
          type: 'string',
          format: 'date-time',
          example: '2026-10-15T10:00:00.000Z',
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
          example: 'IN_PROGRESS',
        },
        price: {
          type: 'integer',
          example: 180000,
        },
        imageUrl: {
          type: 'string',
          example: 'files/bookingServices/booking-service-12345.jpg',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tệp hình ảnh kết quả dịch vụ (nếu upload trực tiếp)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật dịch vụ đơn booking thành công.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu không hợp lệ hoặc thời gian kết thúc trước thời gian bắt đầu.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN hoặc STAFF).',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dịch vụ đơn đặt lịch tương ứng.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBookingServiceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.bookingServicesService.update(id, updateDto, file);
  }

  /**
   * DELETE /api/booking-services/:id
   * Xóa một dịch vụ khỏi đơn đặt lịch (Admin & Staff Only)
   */
  @Delete(':id')
  @ApiParam({
    name: 'id',
    description: 'ID của dịch vụ trong booking cần xóa',
    example: 1,
  })
  @ApiOperation({
    summary: 'Xóa dịch vụ khỏi đơn đặt lịch (Admin & Staff Only)',
    description:
      'Chỉ Admin và Staff có quyền xóa. Nghiêm cấm xóa các dịch vụ hệ thống cố định CHECK_IN hoặc CHECK_OUT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa dịch vụ đơn booking thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Không thể xóa dịch vụ cố định CHECK_IN hoặc CHECK_OUT.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập (Yêu cầu Role ADMIN hoặc STAFF).',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dịch vụ đơn đặt lịch tương ứng.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bookingServicesService.remove(id);
  }
}
