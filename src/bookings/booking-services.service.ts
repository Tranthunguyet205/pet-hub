import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingServiceDto } from './dto/create-booking-service.dto';
import { UpdateBookingServiceDto } from './dto/update-booking-service.dto';
import { BookingStatus, Role, ServiceCategory } from '@prisma/client';
import { ALLOWED_BOOKING_SERVICE_CATEGORIES } from './bookings.service';
import {
  conflictSearchWindow,
  getBookingTimeRange,
  rangesOverlap,
  TimeRange,
} from './utils/booking-time.util';
import { toPublicImageUrl } from '../common/utils/image-url.util';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class BookingServicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper xóa file ảnh vật lý khỏi ổ đĩa
   */
  /**
   * Khoảng thời gian mà một đơn chiếm dụng.
   * @param extraDurationMinutes thời lượng của dịch vụ sắp thêm vào đơn
   */
  private async getBookingRange(
    bookingId: number,
    extraDurationMinutes = 0,
  ): Promise<TimeRange | null> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, isDelete: false },
      include: { bookingServices: { include: { service: true } } },
    });
    return getBookingTimeRange(booking, extraDurationMinutes);
  }

  /**
   * Spec mục 11 — "Nhân viên không được có 2 booking trùng thời gian".
   *
   * Trước đây việc gán nhân viên chỉ kiểm tra user tồn tại và đúng role STAFF,
   * không hỏi nhân viên đó có rảnh hay không, nên một người có thể bị xếp
   * nhiều ca cùng lúc.
   *
   * @param currentBookingId đơn đang được gán — phải loại ra khỏi phép so sánh,
   *   vì một nhân viên phụ trách nhiều bước TRONG CÙNG một đơn là chuyện bình thường
   *   (và chính là luồng phân công ở trang admin).
   */
  private async assertStaffAvailable(
    staffId: number,
    range: TimeRange | null,
    currentBookingId: number,
  ) {
    if (!range) return; // Đơn chưa có giờ hẹn thì không xét được trùng

    const window = conflictSearchWindow(range);

    const assignments = await this.prisma.bookingService.findMany({
      where: {
        staffId,
        bookingId: { not: currentBookingId },
        booking: {
          isDelete: false,
          status: {
            notIn: [
              BookingStatus.COMPLETED,
              BookingStatus.CANCELLED,
              BookingStatus.NO_SHOW,
            ],
          },
          expectedCheckInDate: window,
        },
      },
      include: {
        booking: {
          include: { bookingServices: { include: { service: true } } },
        },
      },
    });

    // Query đã loại đơn hiện tại, nên mọi dòng ở đây đều thuộc đơn KHÁC.
    // Một đơn có thể có nhiều bước cùng nhân viên nên chỉ cần xét mỗi đơn một lần.
    const seen = new Set<number>();
    for (const item of assignments) {
      if (seen.has(item.bookingId)) continue;
      seen.add(item.bookingId);

      const otherRange = getBookingTimeRange(item.booking);
      if (otherRange && rangesOverlap(range, otherRange)) {
        const staff = await this.prisma.user.findUnique({
          where: { id: staffId },
          select: { fullName: true },
        });
        throw new BadRequestException(
          `Nhân viên ${staff?.fullName ?? staffId} đã có ca khác trùng khung giờ này ` +
            `(đơn #${item.bookingId}). Vui lòng chọn nhân viên khác.`,
        );
      }
    }
  }

  /**
   * So sánh ảnh client gửi lên với ảnh đang lưu trong DB.
   * DB lưu đường dẫn tương đối (vd: 'files/bookingServices/abc.png') nhưng response
   * trả về URL công khai đầy đủ, nên client round-trip sẽ gửi lại dạng URL đầy đủ.
   * Hàm này coi hai dạng đó là cùng một ảnh để không xóa nhầm file.
   */
  private isSameStoredImage(
    storedUrl: string | null,
    incomingUrl: string,
  ): boolean {
    if (!storedUrl) return false;
    if (storedUrl === incomingUrl) return true;
    return incomingUrl.endsWith(storedUrl);
  }

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

    // 2b. Không cho thêm tay hai bước hệ thống CHECK_IN / CHECK_OUT
    // (chúng được tạo tự động khi đặt lịch, thêm nữa sẽ sinh bước trùng)
    if (!ALLOWED_BOOKING_SERVICE_CATEGORIES.includes(service.category)) {
      throw new BadRequestException(
        `Dịch vụ "${service.name}" (category: ${service.category}) không thể thêm vào đơn. Chỉ chấp nhận các dịch vụ thuộc nhóm: ${ALLOWED_BOOKING_SERVICE_CATEGORIES.join(', ')}`,
      );
    }

    // 2c. Không thêm dịch vụ vào đơn đã kết thúc
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.NO_SHOW
    ) {
      throw new BadRequestException(
        'Không thể thêm dịch vụ vào đơn đặt lịch đã kết thúc',
      );
    }

    // 2d. Không thêm trùng dịch vụ đã có trong đơn
    const duplicated = await this.prisma.bookingService.findFirst({
      where: {
        bookingId: createDto.bookingId,
        serviceId: createDto.serviceId,
      },
    });

    if (duplicated) {
      throw new BadRequestException(
        `Dịch vụ "${service.name}" đã có trong đơn đặt lịch này`,
      );
    }

    // 3. Nếu có chỉ định nhân viên thực hiện, kiểm tra nhân viên tồn tại
    // (phải đúng role STAFF, giống ràng buộc ở PATCH)
    if (createDto.staffId) {
      const staff = await this.prisma.user.findFirst({
        where: {
          id: createDto.staffId,
          isDelete: false,
          role: Role.STAFF,
        },
      });

      if (!staff) {
        throw new NotFoundException(
          `Không tìm thấy nhân viên với ID: ${createDto.staffId}`,
        );
      }

      // Dịch vụ mới làm đơn GROOMING dài thêm, nên cộng thời lượng của nó vào khoảng xét
      const range = await this.getBookingRange(
        createDto.bookingId,
        service.durationMinutes ?? 0,
      );
      await this.assertStaffAvailable(
        createDto.staffId,
        range,
        createDto.bookingId,
      );
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

    // 3. Xử lý phân công nhân viên (staffId)
    if (updateDto.staffId !== undefined) {
      const staff = await this.prisma.user.findFirst({
        where: {
          id: updateDto.staffId,
          isDelete: false,
          role: 'STAFF',
        },
      });

      if (!staff) {
        throw new NotFoundException(
          `Không tìm thấy nhân viên với ID: ${updateDto.staffId}`,
        );
      }

      // Chỉ kiểm tra khi thực sự đổi sang người khác — gán lại đúng người đang
      // phụ trách thì không có gì phải xét.
      if (updateDto.staffId !== existing.staffId) {
        const range = await this.getBookingRange(existing.bookingId);
        await this.assertStaffAvailable(
          updateDto.staffId,
          range,
          existing.bookingId,
        );
      }

      updateData.staffId = updateDto.staffId;
    }

    // 4. Xử lý trạng thái dịch vụ (ServiceItemStatus)
    if (updateDto.status !== undefined) {
      updateData.status = updateDto.status;
    }

    // 4. Xử lý giá dịch vụ (price)
    if (updateDto.price !== undefined) {
      updateData.price = Number(updateDto.price);
    }

    // 5. Xử lý ghi chú chăm sóc (notes)
    if (updateDto.notes !== undefined) {
      const trimmedNotes =
        typeof updateDto.notes === 'string' ? updateDto.notes.trim() : '';
      updateData.notes = trimmedNotes === '' ? null : trimmedNotes;
    }

    // 6. Xử lý hình ảnh (imageUrl) — cập nhật từng phần (partial update):
    // - Có file upload            -> lưu file mới, xóa file cũ.
    // - Không gửi trường imageUrl -> GIỮ NGUYÊN ảnh cũ.
    // - Gửi imageUrl là chuỗi rỗng / null -> xóa ảnh cũ và set null.
    // - Gửi imageUrl là chuỗi không rỗng  -> lưu URL đó (xóa file cũ nếu khác).
    if (file) {
      if (existing.imageUrl) {
        this.deleteOldImageFile(existing.imageUrl);
      }
      updateData.imageUrl = `files/bookingServices/${file.filename}`;
    } else if (updateDto.imageUrl !== undefined) {
      const trimmedUrl =
        typeof updateDto.imageUrl === 'string' ? updateDto.imageUrl.trim() : '';

      if (trimmedUrl === '') {
        // Client chủ động yêu cầu gỡ ảnh
        if (existing.imageUrl) {
          this.deleteOldImageFile(existing.imageUrl);
        }
        updateData.imageUrl = null;
      } else if (!this.isSameStoredImage(existing.imageUrl, trimmedUrl)) {
        if (existing.imageUrl) {
          this.deleteOldImageFile(existing.imageUrl);
        }
        updateData.imageUrl = trimmedUrl;
      }
      // Nếu client gửi lại đúng ảnh hiện tại (kể cả dạng URL công khai) -> không đổi gì.
    }

    // 7. Thực hiện cập nhật trong database
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
