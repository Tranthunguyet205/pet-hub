import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BookingBoardingRoomsService } from './booking-boarding-rooms.service';
import { CreateBookingBoardingRoomDto } from './dto/create-booking-boarding-room.dto';
import { UpdateBookingBoardingRoomDto } from './dto/update-booking-boarding-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Booking Boarding Rooms')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
@Controller('booking-boarding-rooms')
export class BookingBoardingRoomsController {
  constructor(private readonly bookingBoardingRoomsService: BookingBoardingRoomsService) {}

  /**
   * POST /api/booking-boarding-rooms
   * Gán phòng lưu trú vào đơn đặt lịch loại BOARDING (Admin & Staff Only)
   */
  @Post()
  @ApiOperation({
    summary: 'Gán phòng lưu trú vào đơn đặt lịch (Admin & Staff Only)',
    description:
      'Chỉ ADMIN và STAFF có quyền gán phòng. 1 Booking chỉ được gán tối đa 1 phòng. Bắt buộc bookingType phải là BOARDING. Đơn giá theo giờ (pricePerHour) được tự động lấy từ phòng lưu trú ra (không cần truyền). Chặn nếu phòng đang bận ở đơn khác chưa kết thúc.',
  })
  @ApiResponse({
    status: 201,
    description: 'Gán phòng lưu trú vào đơn booking thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Đơn không phải loại BOARDING, đơn đã có phòng, hoặc phòng đang bận ở đơn khác.',
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
    description: 'Không tìm thấy đơn đặt lịch hoặc phòng lưu trú tương ứng.',
  })
  create(@Body() createDto: CreateBookingBoardingRoomDto) {
    return this.bookingBoardingRoomsService.create(createDto);
  }

  /**
   * PATCH /api/booking-boarding-rooms/:id
   * Cập nhật đơn giá phòng lưu trú (Admin & Staff Only)
   */
  @Patch(':id')
  @ApiParam({
    name: 'id',
    description: 'ID của bản ghi BookingBoardingRoom cần cập nhật',
    example: 1,
  })
  @ApiOperation({
    summary: 'Cập nhật đơn giá phòng lưu trú (Admin & Staff Only)',
    description:
      'Chỉ cho phép cập nhật đơn giá lưu trú theo giờ (pricePerHour). Không cho phép đổi phòng sang phòng khác.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật đơn giá phòng lưu trú thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc đơn giá âm.',
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
    description: 'Không tìm thấy bản ghi phòng lưu trú hoặc phòng mới.',
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateBookingBoardingRoomDto) {
    return this.bookingBoardingRoomsService.update(id, updateDto);
  }

  /**
   * DELETE /api/booking-boarding-rooms/:id
   * Xóa phòng lưu trú khỏi đơn đặt lịch (Admin & Staff Only)
   */
  @Delete(':id')
  @ApiParam({
    name: 'id',
    description: 'ID của bản ghi BookingBoardingRoom cần xóa',
    example: 1,
  })
  @ApiOperation({
    summary: 'Xóa phòng lưu trú khỏi đơn đặt lịch (Admin & Staff Only)',
    description: 'Chỉ Admin và Staff có quyền xóa phòng lưu trú khỏi đơn booking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa phòng lưu trú khỏi đơn booking thành công.',
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
    description: 'Không tìm thấy bản ghi phòng lưu trú tương ứng.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bookingBoardingRoomsService.remove(id);
  }
}
