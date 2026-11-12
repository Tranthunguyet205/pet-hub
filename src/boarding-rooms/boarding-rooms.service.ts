import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardingRoomDto } from './dto/create-boarding-room.dto';
import { UpdateBoardingRoomDto } from './dto/update-boarding-room.dto';
import { QueryBoardingRoomDto } from './dto/query-boarding-room.dto';
import { BookingStatus, Prisma, RoomStatus } from '@prisma/client';
import { toPublicImageUrl } from '../common/utils/image-url.util';

@Injectable()
export class BoardingRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatBoardingRoomImage<T extends { imageUrl?: string | null }>(
    room: T,
  ): T {
    if (!room) return room;
    return {
      ...room,
      imageUrl: toPublicImageUrl(room.imageUrl),
    };
  }

  async create(
    createDto: CreateBoardingRoomDto,
    file?: Express.Multer.File,
  ) {
    const trimmedName = createDto.name.trim();

    const existing = await this.prisma.boardingRoom.findFirst({
      where: {
        name: trimmedName,
        isDelete: false,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Phòng lưu trú với tên "${trimmedName}" đã tồn tại trong hệ thống`,
      );
    }

    const imageUrl = file ? `/files/boardingRooms/${file.filename}` : null;

    const createdRoom = await this.prisma.boardingRoom.create({
      data: {
        name: trimmedName,
        description: createDto.description.trim(),
        pricePerHour: createDto.pricePerHour,
        status: createDto.status ?? RoomStatus.AVAILABLE,
        imageUrl,
      },
    });

    return this.formatBoardingRoomImage(createdRoom);
  }

  /**
   * GET /api/boarding-rooms
   * Lấy danh sách phòng lưu trú có phân trang, lọc theo status và tìm kiếm
   */
  async findAll(query: QueryBoardingRoomDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.BoardingRoomWhereInput = {
      isDelete: false,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const keyword = query.search.trim();
      where.OR = [
        {
          name: { contains: keyword, mode: 'insensitive' },
        },
        {
          description: { contains: keyword, mode: 'insensitive' },
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.boardingRoom.count({ where }),
      this.prisma.boardingRoom.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
    ]);

    return {
      data: data.map((room) => this.formatBoardingRoomImage(room)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * GET /api/boarding-rooms/:id
   * Lấy chi tiết thông tin một phòng lưu trú
   */
  async findOne(id: number) {
    const room = await this.prisma.boardingRoom.findFirst({
      where: {
        id,
        isDelete: false,
      },
    });

    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng lưu trú với ID: ${id}`);
    }

    return this.formatBoardingRoomImage(room);
  }

  async update(
    id: number,
    updateDto: UpdateBoardingRoomDto,
    file?: Express.Multer.File,
  ) {
    // 1. Kiểm tra phòng tồn tại
    const room = await this.prisma.boardingRoom.findFirst({
      where: {
        id,
        isDelete: false,
      },
    });

    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng lưu trú với ID: ${id}`);
    }

    const updateData: Prisma.BoardingRoomUpdateInput = {};

    // 2. Nếu đổi tên, kiểm tra trùng lặp với các phòng khác
    if (updateDto.name !== undefined) {
      const trimmedName = updateDto.name.trim();
      if (trimmedName !== room.name) {
        const duplicate = await this.prisma.boardingRoom.findFirst({
          where: {
            name: trimmedName,
            isDelete: false,
            id: { not: id },
          },
        });

        if (duplicate) {
          throw new ConflictException(
            `Tên phòng "${trimmedName}" đã được sử dụng bởi một phòng khác`,
          );
        }
      }
      updateData.name = trimmedName;
    }

    if (updateDto.description !== undefined) {
      updateData.description = updateDto.description.trim();
    }

    if (updateDto.pricePerHour !== undefined) {
      updateData.pricePerHour = updateDto.pricePerHour;
    }

    if (updateDto.status !== undefined) {
      updateData.status = updateDto.status;
    }

    if (file) {
      updateData.imageUrl = `/files/boardingRooms/${file.filename}`;
    }

    const updatedRoom = await this.prisma.boardingRoom.update({
      where: { id },
      data: updateData,
    });

    return this.formatBoardingRoomImage(updatedRoom);
  }

  /**
   * DELETE /api/boarding-rooms/:id
   * Xóa mềm phòng lưu trú (isDelete = true)
   * Chặn xóa nếu phòng đang được sử dụng ở đơn booking hoạt động
   */
  async remove(id: number) {
    const room = await this.prisma.boardingRoom.findFirst({
      where: {
        id,
        isDelete: false,
      },
    });

    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng lưu trú với ID: ${id}`);
    }

    // Kiểm tra xem phòng có đang gán cho booking nào chưa hoàn thành hoặc chưa hủy không
    const activeBooking = await this.prisma.bookingBoardingRoom.findFirst({
      where: {
        boardingRoomId: id,
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

    if (activeBooking) {
      throw new BadRequestException(
        `Không thể xóa phòng "${room.name}" vì phòng đang được sử dụng trong đơn đặt lịch ID: ${activeBooking.bookingId} (Trạng thái: ${activeBooking.booking.status})`,
      );
    }

    await this.prisma.boardingRoom.update({
      where: { id },
      data: {
        isDelete: true,
      },
    });

    return {
      message: `Đã xóa thành công phòng lưu trú ID: ${id}`,
    };
  }
}
