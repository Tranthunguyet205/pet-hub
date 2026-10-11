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
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Bookings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * GET /api/bookings
   * Lấy danh sách đơn đặt lịch có phân trang & lọc (ADMIN, STAFF, OWNER)
   */
  @Get()
  @Roles(Role.ADMIN, Role.STAFF, Role.OWNER)
  @ApiOperation({
    summary: 'Lấy danh sách đơn đặt lịch (Admin, Staff, Owner)',
    description:
      'ADMIN và STAFF xem tất cả booking trong hệ thống, có thể lọc thêm theo userId. OWNER chỉ xem được các booking của chính mình. Hỗ trợ phân trang và tìm kiếm.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách đơn đặt lịch kèm thông tin phân trang.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền truy cập.',
  })
  findAll(@Request() req: any, @Query() query: QueryBookingDto) {
    return this.bookingsService.findAll(req.user.id, req.user.role, query);
  }

  /**
   * GET /api/bookings/:id
   * Lấy chi tiết đơn đặt lịch (ADMIN, STAFF, OWNER)
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF, Role.OWNER)
  @ApiParam({
    name: 'id',
    description: 'ID đơn đặt lịch cần xem chi tiết',
    example: 1,
  })
  @ApiOperation({
    summary: 'Lấy chi tiết đơn đặt lịch (Admin, Staff, Owner)',
    description:
      'ADMIN và STAFF có thể xem chi tiết bất kỳ đơn đặt lịch nào. OWNER chỉ xem được đơn của chính mình. Trả về đầy đủ thông tin khách hàng, thú cưng, các dịch vụ chi tiết và phòng lưu trú.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết đơn đặt lịch.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Không có quyền xem thông tin đơn đặt lịch này (Khách hàng khác).',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn đặt lịch hoặc đơn đã bị xóa.',
  })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.bookingsService.findOne(id, req.user.id, req.user.role);
  }

  /**
   * POST /api/bookings

   * Tạo lịch hẹn mới (Hỗ trợ ADMIN, STAFF, OWNER)
   */
  @Post()
  @Roles(Role.ADMIN, Role.STAFF, Role.OWNER)
  @ApiOperation({
    summary: 'Tạo đơn đặt lịch mới (Booking)',
    description:
      'Cho phép ADMIN, STAFF và OWNER tạo booking. OWNER chỉ tạo cho thú cưng của mình. Dịch vụ tự động chèn CHECK_IN ở đầu và CHECK_OUT ở cuối.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo đơn đặt lịch thành công.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu không hợp lệ, thời gian check-out trước check-in hoặc chọn dịch vụ sai danh mục.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền tạo đơn đặt lịch cho thú cưng này.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy thú cưng hoặc dịch vụ tương ứng.',
  })
  create(@Request() req: any, @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(
      req.user.id,
      req.user.role,
      createBookingDto,
    );
  }

  /**
   * PATCH /api/bookings/:id/status
   * Cập nhật trạng thái đơn đặt lịch (Chỉ ADMIN & STAFF)
   */
  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiParam({ name: 'id', description: 'ID đơn đặt lịch', example: 1 })
  @ApiOperation({
    summary: 'Cập nhật trạng thái đơn đặt lịch (Admin & Staff Only)',
    description:
      'Chỉ Admin và Staff có quyền cập nhật trạng thái đơn booking (PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED).',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Trạng thái không hợp lệ.',
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
    description: 'Không tìm thấy đơn đặt lịch.',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingStatusDto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, updateBookingStatusDto);
  }

  /**
   * DELETE /api/bookings/:id
   * Xóa mềm đơn đặt lịch (ADMIN, STAFF, OWNER)
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.STAFF, Role.OWNER)
  @ApiParam({ name: 'id', description: 'ID đơn đặt lịch cần xóa', example: 1 })
  @ApiOperation({
    summary: 'Xóa mềm đơn đặt lịch (Admin, Staff, Owner)',
    description:
      'Chủ nuôi (Owner) chỉ có thể xóa đơn booking của chính mình khi trạng thái là PENDING. Admin và Staff có quyền xóa ở mọi trạng thái.',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa đơn đặt lịch thành công.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Không có quyền xóa đơn booking hoặc đơn không ở trạng thái PENDING.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn đặt lịch.',
  })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.bookingsService.remove(id, req.user.id, req.user.role);
  }
}
