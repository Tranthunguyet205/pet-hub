import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingBoardingRoomDto } from './dto/create-booking-boarding-room.dto';
import { UpdateBookingBoardingRoomDto } from './dto/update-booking-boarding-room.dto';
import { BookingStatus, BookingType } from '@prisma/client';

@Injectable()
export class BookingBoardingRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /api/booking-boarding-rooms
   * Gán phòng lưu trú vào đơn đặt lịch loại BOARDING (Admin & Staff Only)
   */
  async create(createDto: CreateBookingBoardingRoomDto) {
    // 1. Kiểm tra đơn đặt lịch tồn tại và chưa bị soft-delete
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: createDto.bookingId,
        isDelete: false,
      },
      include: {
        bookingBoardingRoom: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt lịch với ID: ${createDto.bookingId}`);
    }

    // 2. Kiểm tra loại đơn đặt lịch: Chỉ BOARDING mới được gán phòng
    if (booking.bookingType !== BookingType.BOARDING) {
      throw new BadRequestException('Chỉ có thể gán phòng lưu trú cho đơn đặt lịch loại BOARDING');
    }

    // 3. Ràng buộc 1 Booking chỉ được gán tối đa 1 BookingBoardingRoom
    if (booking.bookingBoardingRoom) {
      throw new BadRequestException(
        'Đơn đặt lịch này đã được gán phòng lưu trú. Mỗi đơn chỉ được gán tối đa 1 phòng.',
      );
    }

    // 4. Kiểm tra phòng lưu trú tồn tại và chưa bị xóa
    const room = await this.prisma.boardingRoom.findFirst({
      where: {
        id: createDto.boardingRoomId,
        isDelete: false,
      },
    });

    if (!room) {
      throw new NotFoundException(
        `Không tìm thấy phòng lưu trú với ID: ${createDto.boardingRoomId}`,
      );
    }

    // 5. Kiểm tra phòng đã được gán vào đơn booking khác đang hoạt động hay chưa (status khác COMPLETED và CANCELLED)
    const conflict = await this.prisma.bookingBoardingRoom.findFirst({
      where: {
        boardingRoomId: createDto.boardingRoomId,
        booking: {
          isDelete: false,
          status: {
            notIn: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
          },
        },
      },
      include: {
        booking: true,
      },
    });

    if (conflict) {
      throw new BadRequestException(
        `Phòng lưu trú "${room.name}" (ID: ${room.id}) hiện đang được sử dụng bởi đơn đặt lịch ID: ${conflict.bookingId} (Trạng thái: ${conflict.booking.status}). Vui lòng chọn phòng khác.`,
      );
    }

    // 6. Đơn giá lưu trú theo giờ (pricePerHour) luôn lấy trực tiếp từ BoardingRoom
    const pricePerHour = room.pricePerHour;

    // 7. Tạo bản ghi BookingBoardingRoom
    const created = await this.prisma.bookingBoardingRoom.create({
      data: {
        bookingId: createDto.bookingId,
        boardingRoomId: createDto.boardingRoomId,
        pricePerHour,
      },
      include: {
        boardingRoom: true,
        booking: {
          include: {
            pet: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    return created;
  }

  /**
   * PATCH /api/booking-boarding-rooms/:id
   * Cập nhật thông tin phòng lưu trú / đổi phòng trong đơn đặt lịch (Admin & Staff Only)
   */
  async update(id: number, updateDto: UpdateBookingBoardingRoomDto) {
    // 1. Tìm bản ghi BookingBoardingRoom
    const existing = await this.prisma.bookingBoardingRoom.findUnique({
      where: { id },
      include: {
        boardingRoom: true,
        booking: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Không tìm thấy bản ghi phòng lưu trú đơn đặt lịch với ID: ${id}`,
      );
    }

    const updateData: { pricePerHour?: number } = {};

    // 2. Cập nhật đơn giá lưu trú theo giờ (pricePerHour)
    if (updateDto.pricePerHour !== undefined) {
      updateData.pricePerHour = updateDto.pricePerHour;
    }

    // 4. Lưu thay đổi vào DB
    const updated = await this.prisma.bookingBoardingRoom.update({
      where: { id },
      data: updateData,
      include: {
        boardingRoom: true,
        booking: {
          include: {
            pet: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * DELETE /api/booking-boarding-rooms/:id
   * Xóa phòng lưu trú khỏi đơn đặt lịch (Admin & Staff Only)
   */
  async remove(id: number) {
    const existing = await this.prisma.bookingBoardingRoom.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Không tìm thấy bản ghi phòng lưu trú đơn đặt lịch với ID: ${id}`,
      );
    }

    await this.prisma.bookingBoardingRoom.delete({
      where: { id },
    });

    return {
      message: `Đã xóa thành công phòng lưu trú khỏi đơn đặt lịch ID: ${id}`,
    };
  }
}
