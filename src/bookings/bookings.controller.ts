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
import { UpdateBookingDto } from './dto/update-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
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
   * GET /api/bookings/availability
   * Kiểm tra khung giờ khả dụng theo ngày (Tất cả role)
   */
  @Get('availability')
  @Roles(Role.ADMIN, Role.STAFF, Role.OWNER)
  @ApiOperation({
    summary: 'Kiểm tra slot khả dụng theo ngày',
    description:
      'Trả về danh sách các khung giờ 30 phút trong ngày kèm số lượng booking hiện tại và trạng thái khả dụng. Dùng để hiển thị khung giờ nào còn trống khi đặt lịch.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách slot khả dụng theo ngày.',
  })
  getAvailability(@Query() query: QueryAvailabilityDto) {
    return this.bookingsService.getAvailability(query);
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
   * PATCH /api/bookings/:id
   * Sửa đơn đặt lịch: đổi lịch hẹn, ghi chú hoặc danh sách dịch vụ
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.STAFF, Role.OWNER)
  @ApiParam({ name: 'id', description: 'ID đơn đặt lịch', example: 1 })
  @ApiOperation({
    summary: 'Sửa đơn đặt lịch (đổi lịch / ghi chú / dịch vụ)',
    description:
      'Chủ nuôi chỉ sửa được đơn của mình khi đơn còn PENDING. Admin và Staff sửa được khi đơn đang PENDING hoặc CONFIRMED. ' +
      'Từ CHECKED_IN trở đi không sửa được nữa. Nếu truyền serviceIds thì toàn bộ dịch vụ khách chọn sẽ được thay thế, ' +
      'hai bước hệ thống CHECK_IN và CHECK_OUT luôn được giữ nguyên. Không dùng endpoint này để đổi trạng thái.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật đơn đặt lịch thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc đơn không còn ở trạng thái cho phép sửa.',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc Token không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền sửa đơn đặt lịch này.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn đặt lịch.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: UpdateBookingDto,
    @Request() req: any,
  ) {
    return this.bookingsService.update(
      id,
      updateBookingDto,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * PATCH /api/bookings/:id/status
   * Cập nhật trạng thái đơn đặt lịch theo máy trạng thái
   */
  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.STAFF, Role.OWNER)
  @ApiParam({ name: 'id', description: 'ID đơn đặt lịch', example: 1 })
  @ApiOperation({
    summary: 'Cập nhật trạng thái đơn đặt lịch',
    description:
      'Chuyển trạng thái theo máy trạng thái: PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED; ' +
      'PENDING/CONFIRMED/CHECKED_IN có thể chuyển sang CANCELLED, PENDING/CONFIRMED có thể chuyển sang NO_SHOW. ' +
      'Admin & Staff thực hiện mọi chuyển trạng thái hợp lệ. Owner chỉ được hủy đơn của chính mình và chỉ khi còn ít nhất 12 tiếng tới giờ hẹn.',
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
    description: 'Không đủ quyền thực hiện chuyển trạng thái này.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn đặt lịch.',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingStatusDto: UpdateBookingStatusDto,
    @Request() req: any,
  ) {
    return this.bookingsService.updateStatus(
      id,
      updateBookingStatusDto,
      req.user.id,
      req.user.role,
    );
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
