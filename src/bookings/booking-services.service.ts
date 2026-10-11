import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingServiceDto } from './dto/create-booking-service.dto';
import { UpdateBookingServiceDto } from './dto/update-booking-service.dto';
import { ServiceCategory } from '@prisma/client';
import { toPublicImageUrl } from '../common/utils/image-url.util';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class BookingServicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper xóa file ảnh vật lý khỏi ổ đĩa
   */
  private deleteOldImageFile(imagePath: string | null) {
    if (!imagePath) return;
    try {
      const fullPath = join(process.cwd(), imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (error) {
      console.error(`Không thể xóa file ảnh: ${imagePath}`, error);
    }
  }

  /**
   * Helper format avatar và image URL cho response
   */
  private formatItemImages<T extends Record<string, any>>(item: T): T {
    if (!item) return item;
    return {
      ...item,
      imageUrl: toPublicImageUrl(item.imageUrl),
      service: item.service
        ? {
            ...item.service,
            imageUrl: toPublicImageUrl(item.service.imageUrl),
          }
        : item.service,
    };
  }

  /**
   * POST /api/booking-services
   * Tạo / Thêm mới một dịch vụ vào đơn đặt lịch
   */
  async create(createDto: CreateBookingServiceDto) {
    // 1. Kiểm tra đơn đặt lịch tồn tại và chưa bị soft-delete
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: createDto.bookingId,
        isDelete: false,
      },
    });

    if (!booking) {
      throw new NotFoundException(
        `Không tìm thấy đơn đặt lịch với ID: ${createDto.bookingId}`,
      );
    }

    // 2. Kiểm tra dịch vụ tồn tại
    const service = await this.prisma.service.findFirst({
      where: {
        id: createDto.serviceId,
        isDelete: false,
      },
    });

    if (!service) {
      throw new NotFoundException(
        `Không tìm thấy dịch vụ với ID: ${createDto.serviceId}`,
      );
    }

    // 3. Nếu có chỉ định nhân viên thực hiện, kiểm tra nhân viên tồn tại
    if (createDto.staffId) {
      const staff = await this.prisma.user.findFirst({
        where: {
          id: createDto.staffId,
          isDelete: false,
        },
      });

      if (!staff) {
        throw new NotFoundException(
          `Không tìm thấy nhân viên với ID: ${createDto.staffId}`,
        );
      }
    }

    // 4. Giá dịch vụ luôn lấy trực tiếp từ giá gốc (basePrice) của dịch vụ
    const price = service.basePrice;


    // 5. Tạo mới bản ghi BookingService
    const created = await this.prisma.bookingService.create({
      data: {
        bookingId: createDto.bookingId,
        serviceId: createDto.serviceId,
        staffId: createDto.staffId ?? null,
        price,
      },
      include: {
        service: true,
        staff: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return this.formatItemImages(created);
  }

  /**
   * PATCH /api/booking-services/:id
   * Cập nhật thông tin dịch vụ trong đơn booking (Chỉ 5 trường cho phép)
   */
  async update(
    id: number,
    updateDto: UpdateBookingServiceDto,
    file?: Express.Multer.File,
  ) {
    // 1. Tìm bản ghi BookingService
    const existing = await this.prisma.bookingService.findUnique({
      where: { id },
      include: {
        service: true,
        booking: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Không tìm thấy dịch vụ đơn đặt lịch với ID: ${id}`,
      );
    }

    const updateData: Record<string, any> = {};

    // 2. Xử lý thời gian thực tế
    if (updateDto.actualStartTime !== undefined) {
      updateData.actualStartTime = updateDto.actualStartTime
        ? new Date(updateDto.actualStartTime)
        : null;
    }

    if (updateDto.actualEndTime !== undefined) {
      updateData.actualEndTime = updateDto.actualEndTime
        ? new Date(updateDto.actualEndTime)
        : null;
    }

    const effectiveStartTime =
      updateData.actualStartTime !== undefined
        ? updateData.actualStartTime
        : existing.actualStartTime;
    const effectiveEndTime =
      updateData.actualEndTime !== undefined
        ? updateData.actualEndTime
        : existing.actualEndTime;

    if (effectiveStartTime && effectiveEndTime) {
      if (new Date(effectiveEndTime) < new Date(effectiveStartTime)) {
        throw new BadRequestException(
          'Thời gian hoàn thành thực tế phải sau thời gian bắt đầu thực tế',
        );
      }
    }

    // 3. Xử lý trạng thái dịch vụ (ServiceItemStatus)
    if (updateDto.status !== undefined) {
      updateData.status = updateDto.status;
    }

    // 4. Xử lý giá dịch vụ (price)
    if (updateDto.price !== undefined) {
      updateData.price = Number(updateDto.price);
    }

    // 5. Xử lý hình ảnh (imageUrl):
    // - Nếu có file upload -> lưu file mới, xóa file cũ
    // - Nếu không có file:
    //   + Nếu gửi imageUrl hợp lệ dạng string không rỗng -> lưu URL đó (xóa file cũ nếu khác)
    //   + Nếu không gửi gì lên hoặc gửi rỗng/không hợp lệ -> xóa ảnh cũ luôn và set null
    if (file) {
      if (existing.imageUrl) {
        this.deleteOldImageFile(existing.imageUrl);
      }
      updateData.imageUrl = `files/bookingServices/${file.filename}`;
    } else if (
      typeof updateDto.imageUrl === 'string' &&
      updateDto.imageUrl.trim() !== ''
    ) {
      const trimmedUrl = updateDto.imageUrl.trim();
      if (existing.imageUrl && existing.imageUrl !== trimmedUrl) {
        this.deleteOldImageFile(existing.imageUrl);
      }
      updateData.imageUrl = trimmedUrl;
    } else {
      // Không gửi gì hoặc giá trị không hợp lệ -> xóa ảnh cũ luôn
      if (existing.imageUrl) {
        this.deleteOldImageFile(existing.imageUrl);
      }
      updateData.imageUrl = null;
    }

    // 6. Thực hiện cập nhật trong database
    const updated = await this.prisma.bookingService.update({
      where: { id },
      data: updateData,
      include: {
        service: true,
        staff: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return this.formatItemImages(updated);
  }

  /**
   * DELETE /api/booking-services/:id
   * Xóa một dịch vụ khỏi đơn đặt lịch (Chặn xóa CHECK_IN và CHECK_OUT)
   */
  async remove(id: number) {
    const item = await this.prisma.bookingService.findUnique({
      where: { id },
      include: {
        service: true,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Không tìm thấy dịch vụ đơn đặt lịch với ID: ${id}`,
      );
    }

    // Chặn xóa dịch vụ hệ thống CHECK_IN hoặc CHECK_OUT
    if (
      item.service.category === ServiceCategory.CHECK_IN ||
      item.service.category === ServiceCategory.CHECK_OUT
    ) {
      throw new BadRequestException(
        'Không thể xóa dịch vụ cố định CHECK_IN hoặc CHECK_OUT của đơn đặt lịch',
      );
    }

    // Dọn dẹp ảnh vật lý nếu có
    if (item.imageUrl) {
      this.deleteOldImageFile(item.imageUrl);
    }

    // Xóa bản ghi
    await this.prisma.bookingService.delete({
      where: { id },
    });

    return {
      message: `Đã xóa thành công dịch vụ đơn đặt lịch ID: ${id}`,
    };
  }
}
