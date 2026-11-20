import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingBoardingRoomDto } from './dto/create-booking-boarding-room.dto';
import { UpdateBookingBoardingRoomDto } from './dto/update-booking-boarding-room.dto';
import { BookingStatus, BookingType, RoomStatus } from '@prisma/client';

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

    // 4b. Phòng đang bảo trì thì không gán được
    if (room.status === RoomStatus.MAINTENANCE) {
      throw new BadRequestException(
        `Phòng lưu trú "${room.name}" đang bảo trì, không thể gán cho đơn đặt lịch.`,
      );
    }

    // 5. Kiểm tra phòng đã được gán vào đơn booking khác đang hoạt động hay chưa
    // (đơn đã COMPLETED / CANCELLED / NO_SHOW thì coi như đã trả phòng)
    const conflict = await this.prisma.bookingBoardingRoom.findFirst({
      where: {
        boardingRoomId: createDto.boardingRoomId,
        booking: {
          isDelete: false,
          status: {
            notIn: [
              BookingStatus.COMPLETED,
              BookingStatus.CANCELLED,
              BookingStatus.NO_SHOW,
            ],
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

    // 6. Đơn giá lưu trú theo đêm (pricePerNight) luôn lấy trực tiếp từ BoardingRoom
    const pricePerNight = room.pricePerNight;

    // 7. Tạo bản ghi BookingBoardingRoom
    const created = await this.prisma.bookingBoardingRoom.create({
      data: {
        bookingId: createDto.bookingId,
        boardingRoomId: createDto.boardingRoomId,
        pricePerNight,
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

    // 8. Nếu thú cưng đã vào ở rồi mới gán phòng -> khóa phòng luôn
    if (
      booking.status === BookingStatus.CHECKED_IN ||
      booking.status === BookingStatus.IN_PROGRESS
    ) {
      await this.prisma.boardingRoom.update({
        where: { id: room.id },
        data: { status: RoomStatus.OCCUPIED },
      });
    }

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

    const updateData: { pricePerNight?: number; boardingRoomId?: number } = {};

    // 2. Đổi phòng (nếu có yêu cầu)
    let newRoom: { id: number; name: string; pricePerNight: number } | null = null;

    if (
      updateDto.boardingRoomId !== undefined &&
      updateDto.boardingRoomId !== existing.boardingRoomId
    ) {
      // Đơn đã kết thúc thì không đổi phòng nữa
      if (
        existing.booking.status === BookingStatus.COMPLETED ||
        existing.booking.status === BookingStatus.CANCELLED ||
        existing.booking.status === BookingStatus.NO_SHOW
      ) {
        throw new BadRequestException(
          'Không thể đổi phòng cho đơn đặt lịch đã kết thúc',
        );
      }

      const room = await this.prisma.boardingRoom.findFirst({
        where: { id: updateDto.boardingRoomId, isDelete: false },
      });

      if (!room) {
        throw new NotFoundException(
          `Không tìm thấy phòng lưu trú với ID: ${updateDto.boardingRoomId}`,
        );
      }

      if (room.status === RoomStatus.MAINTENANCE) {
        throw new BadRequestException(
          `Phòng lưu trú "${room.name}" đang bảo trì, không thể gán cho đơn đặt lịch.`,
        );
      }

      // Phòng mới không được đang thuộc một đơn khác còn hoạt động
      const conflict = await this.prisma.bookingBoardingRoom.findFirst({
        where: {
          boardingRoomId: updateDto.boardingRoomId,
          id: { not: id },
          booking: {
            isDelete: false,
            status: {
              notIn: [
                BookingStatus.COMPLETED,
                BookingStatus.CANCELLED,
                BookingStatus.NO_SHOW,
              ],
            },
          },
        },
        include: { booking: true },
      });

      if (conflict) {
        throw new BadRequestException(
          `Phòng lưu trú "${room.name}" (ID: ${room.id}) hiện đang được sử dụng bởi đơn đặt lịch ID: ${conflict.bookingId} (Trạng thái: ${conflict.booking.status}). Vui lòng chọn phòng khác.`,
        );
      }

      newRoom = room;
      updateData.boardingRoomId = room.id;
      // Đơn giá mặc định lấy theo phòng mới
      updateData.pricePerNight = room.pricePerNight;
    }

    // 3. Cập nhật đơn giá lưu trú theo đêm (ưu tiên giá client truyền lên)
    if (updateDto.pricePerNight !== undefined) {
      updateData.pricePerNight = updateDto.pricePerNight;
    }

    // 4. Nếu thú cưng đã vào ở, chuyển trạng thái phòng cũ -> AVAILABLE, phòng mới -> OCCUPIED
    const petIsStaying = [
      BookingStatus.CHECKED_IN,
      BookingStatus.IN_PROGRESS,
    ].includes(existing.booking.status as any);

    if (newRoom && petIsStaying) {
      await this.prisma.boardingRoom.update({
        where: { id: existing.boardingRoomId },
        data: { status: RoomStatus.AVAILABLE },
      });
      await this.prisma.boardingRoom.update({
        where: { id: newRoom.id },
        data: { status: RoomStatus.OCCUPIED },
      });
    }

    // 5. Lưu thay đổi vào DB
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
