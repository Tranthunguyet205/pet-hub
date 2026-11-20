import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { Prisma } from '@prisma/client';
import {
  Role,
  BookingStatus,
  BookingType,
  RoomStatus,
  ServiceCategory,
  ServiceItemStatus,
} from '@prisma/client';
import { toPublicImageUrl } from '../common/utils/image-url.util';
import {
  calculateBookingCost,
  BookingCostBreakdown,
} from './utils/booking-cost.util';
import {
  businessDateString,
  businessDayStart,
  businessDayEnd,
  businessTimeKey,
  parseBusinessRangeBoundary,
} from '../common/utils/business-time.util';
import {
  conflictSearchWindow,
  getBookingTimeRange,
  rangesOverlap,
  TimeRange,
} from './utils/booking-time.util';

export const ALLOWED_BOOKING_SERVICE_CATEGORIES: ServiceCategory[] = [
  // Grooming
  ServiceCategory.BATH_AND_DRY,
  ServiceCategory.HAIRCUT,
  ServiceCategory.HYGIENE,
  ServiceCategory.FULL_GROOMING,
  // Boarding
  ServiceCategory.ASSIGN_ROOM,
  ServiceCategory.FEEDING,
  ServiceCategory.WATER,
  ServiceCategory.WALKING,
  ServiceCategory.MEDICATION,
  ServiceCategory.CLEANING,
  ServiceCategory.DAILY_HEALTH_CHECK,
];

/**
 * Máy trạng thái của đơn booking.
 * Key = trạng thái hiện tại, value = các trạng thái được phép chuyển sang.
 * Mọi chuyển trạng thái không nằm trong bảng này đều bị từ chối (400).
 */
export const BOOKING_STATUS_TRANSITIONS: Record<
  BookingStatus,
  BookingStatus[]
> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
    BookingStatus.NO_SHOW,
  ],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.CHECKED_IN,
    BookingStatus.CANCELLED,
    BookingStatus.NO_SHOW,
  ],
  [BookingStatus.CHECKED_IN]: [
    BookingStatus.IN_PROGRESS,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.NO_SHOW]: [],
};

/** Nhãn tiếng Việt của từng trạng thái (dùng cho thông báo lỗi) */
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'Chờ xử lý',
  [BookingStatus.CONFIRMED]: 'Đã xác nhận',
  [BookingStatus.CHECKED_IN]: 'Đã tiếp nhận',
  [BookingStatus.IN_PROGRESS]: 'Đang thực hiện',
  [BookingStatus.COMPLETED]: 'Hoàn thành',
  [BookingStatus.CANCELLED]: 'Đã hủy',
  [BookingStatus.NO_SHOW]: 'Không đến',
};

/**
 * BR-02: Chủ nuôi chỉ được tự hủy đơn khi còn cách giờ hẹn ít nhất ngần này giờ.
 */
export const CANCEL_DEADLINE_HOURS = 12;

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper format avatar và image URL cho Booking response
   */
  private formatBookingImages<T extends Record<string, any>>(booking: T): T {
    if (!booking) return booking;

    const formattedUser = booking.user
      ? {
          ...booking.user,
          avatarUrl: toPublicImageUrl(booking.user.avatarUrl),
        }
      : booking.user;

    const formattedPet = booking.pet
      ? {
          ...booking.pet,
          avatarUrl: toPublicImageUrl(booking.pet.avatarUrl),
        }
      : booking.pet;

    const formattedBookingServices = Array.isArray(booking.bookingServices)
      ? booking.bookingServices.map((bs: any) => ({
          ...bs,
          imageUrl: toPublicImageUrl(bs.imageUrl),
          service: bs.service
            ? {
                ...bs.service,
                imageUrl: toPublicImageUrl(bs.service.imageUrl),
              }
            : bs.service,
        }))
      : booking.bookingServices;

    return {
      ...booking,
      user: formattedUser,
      pet: formattedPet,
      bookingServices: this.sortBookingServices(formattedBookingServices),
    };
  }

  /**
   * Helper sắp xếp danh sách dịch vụ của Booking:
   * 1. CHECK_IN luôn ở vị trí đầu tiên
   * 2. CHECK_OUT luôn ở vị trí cuối cùng
   * 3. Các dịch vụ ở giữa: ưu tiên actualStartTime asc (dịch vụ có actualStartTime xếp trước null),
   *    sau đó ưu tiên id asc
   */
  private sortBookingServices<T extends Record<string, any>>(
    services: T[],
  ): T[] {
    if (!Array.isArray(services) || services.length <= 1) {
      return services;
    }

    const checkIns: T[] = [];
    const checkOuts: T[] = [];
    const middleServices: T[] = [];

    for (const item of services) {
      const category = item.service?.category;
      if (category === ServiceCategory.CHECK_IN) {
        checkIns.push(item);
      } else if (category === ServiceCategory.CHECK_OUT) {
        checkOuts.push(item);
      } else {
        middleServices.push(item);
      }
    }

    middleServices.sort((a, b) => {
      const timeA = a.actualStartTime
        ? new Date(a.actualStartTime).getTime()
        : null;
      const timeB = b.actualStartTime
        ? new Date(b.actualStartTime).getTime()
        : null;

      if (timeA !== null && timeB !== null) {
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        return (a.id ?? 0) - (b.id ?? 0);
      }

      if (timeA !== null && timeB === null) {
        return -1; // a có actualStartTime -> xếp trước b
      }

      if (timeA === null && timeB !== null) {
        return 1; // b có actualStartTime -> xếp trước a
      }

      // Cả hai đều chưa có actualStartTime -> xếp theo id asc
      return (a.id ?? 0) - (b.id ?? 0);
    });

    return [...checkIns, ...middleServices, ...checkOuts];
  }



  /**
   * Tạo Booking mới
   * - OWNER: Tự động gán userId = req.user.id, petId phải thuộc về chính mình.
   * - ADMIN / STAFF: Có thể truyền userId hoặc tự động lấy theo pet.userId.
   * - Chỉ cho phép dịch vụ thuộc BATH_AND_DRY, HAIRCUT, HYGIENE, FULL_GROOMING.
   * - Tự động chèn CHECK_IN ở đầu và CHECK_OUT ở cuối danh sách dịch vụ.
   */
  async create(
    currentUserId: number,
    currentUserRole: Role,
    createBookingDto: CreateBookingDto,
  ) {
    // 1. Kiểm tra thú cưng tồn tại
    const pet = await this.prisma.pet.findFirst({
      where: {
        id: createBookingDto.petId,
        isDelete: false,
      },
    });

    if (!pet) {
      throw new NotFoundException(
        `Thú cưng với ID ${createBookingDto.petId} không tồn tại hoặc đã bị xóa`,
      );
    }

    // 2. Xác định và kiểm tra quyền chủ sở hữu
    let targetUserId: number;

    if (currentUserRole === Role.OWNER) {
      if (pet.userId !== currentUserId) {
        throw new ForbiddenException(
          'Bạn chỉ có quyền tạo lịch hẹn cho thú cưng của chính mình',
        );
      }
      targetUserId = currentUserId;
    } else {
      // ADMIN hoặc STAFF
      if (createBookingDto.userId) {
        if (createBookingDto.userId !== pet.userId) {
          throw new BadRequestException(
            `Thú cưng (petId = ${createBookingDto.petId}) không thuộc về khách hàng (userId = ${createBookingDto.userId})`,
          );
        }
        targetUserId = createBookingDto.userId;
      } else {
        targetUserId = pet.userId;
      }
    }

    // 3. Đơn BOARDING bắt buộc có cả ngày nhận và ngày trả.
    // Thiếu ngày trả -> calculateBookingCost() fallback về thời điểm hiện tại,
    // khiến tiền phòng của đơn tự tăng theo thời gian thực.
    if (createBookingDto.bookingType === BookingType.BOARDING) {
      if (!createBookingDto.expectedCheckInDate) {
        throw new BadRequestException(
          'Đơn lưu trú bắt buộc phải có ngày giờ nhận thú cưng (expectedCheckInDate)',
        );
      }
      if (!createBookingDto.expectedCheckOutDate) {
        throw new BadRequestException(
          'Đơn lưu trú bắt buộc phải có ngày giờ trả thú cưng (expectedCheckOutDate)',
        );
      }
    }

    // Kiểm tra ngày giờ dự kiến (nếu có cả 2 trường)
    if (
      createBookingDto.expectedCheckInDate &&
      createBookingDto.expectedCheckOutDate
    ) {
      const checkInTime = new Date(createBookingDto.expectedCheckInDate).getTime();
      const checkOutTime = new Date(
        createBookingDto.expectedCheckOutDate,
      ).getTime();

      if (checkOutTime < checkInTime) {
        throw new BadRequestException(
          'Thời gian check-out dự kiến phải sau thời gian check-in dự kiến',
        );
      }
    }

    // 4. Kiểm tra dịch vụ theo loại booking
    const hasServiceIds =
      Array.isArray(createBookingDto.serviceIds) &&
      createBookingDto.serviceIds.length > 0;

    if (createBookingDto.bookingType === BookingType.GROOMING && !hasServiceIds) {
      throw new BadRequestException(
        'Lịch hẹn Grooming bắt buộc phải chọn ít nhất 1 dịch vụ chăm sóc',
      );
    }

    let userServices: any[] = [];
    if (hasServiceIds) {
      userServices = await this.resolveUserServices(
        createBookingDto.serviceIds!,
      );
    }

    // 5. Tìm dịch vụ hệ thống CHECK_IN và CHECK_OUT
    const checkInService = await this.prisma.service.findFirst({
      where: {
        category: ServiceCategory.CHECK_IN,
        isDelete: false,
      },
    });

    if (!checkInService) {
      throw new InternalServerErrorException(
        'Dịch vụ hệ thống CHECK_IN chưa được khởi tạo. Vui lòng liên hệ quản trị viên để seed dữ liệu dịch vụ.',
      );
    }

    const checkOutService = await this.prisma.service.findFirst({
      where: {
        category: ServiceCategory.CHECK_OUT,
        isDelete: false,
      },
    });

    if (!checkOutService) {
      throw new InternalServerErrorException(
        'Dịch vụ hệ thống CHECK_OUT chưa được khởi tạo. Vui lòng liên hệ quản trị viên để seed dữ liệu dịch vụ.',
      );
    }

    // Luôn luôn có CHECK_IN ở đầu và CHECK_OUT ở cuối danh sách dịch vụ
    const allServicesToCreate = [
      checkInService,
      ...userServices,
      checkOutService,
    ];

    // 6. Chống trùng lịch (spec mục 11, BR-01).
    // Phải đặt ở đây vì cần `allServicesToCreate` mới tính được thời lượng đơn.
    if (createBookingDto.expectedCheckInDate) {
      const checkInDate = new Date(createBookingDto.expectedCheckInDate);

      await this.assertSlotAvailable(checkInDate, createBookingDto.bookingType);

      const newRange = getBookingTimeRange({
        expectedCheckInDate: checkInDate,
        expectedCheckOutDate: createBookingDto.expectedCheckOutDate
          ? new Date(createBookingDto.expectedCheckOutDate)
          : null,
        bookingServices: allServicesToCreate.map((sv) => ({ service: sv })),
      });

      if (newRange) {
        await this.assertNoPetConflict(createBookingDto.petId, newRange);
      }
    }

    // 7. Thực thi Transaction tạo Booking và các BookingService
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          userId: targetUserId,
          petId: createBookingDto.petId,
          bookingType: createBookingDto.bookingType,
          status: BookingStatus.PENDING,
          expectedCheckInDate: createBookingDto.expectedCheckInDate
            ? new Date(createBookingDto.expectedCheckInDate)
            : null,
          expectedCheckOutDate: createBookingDto.expectedCheckOutDate
            ? new Date(createBookingDto.expectedCheckOutDate)
            : null,
          notes: createBookingDto.notes?.trim() || null,
        },
      });

      // Tạo các dịch vụ chi tiết cho booking
      const bookingServicesData = allServicesToCreate.map((service) => ({
        bookingId: booking.id,
        serviceId: service.id,
        price: service.basePrice,
        status: ServiceItemStatus.PENDING,
        actualStartTime: null,
        actualEndTime: null,
        staffId: null,
        imageUrl: null,
      }));

      await tx.bookingService.createMany({
        data: bookingServicesData,
      });

      // Trả về đầy đủ thông tin booking kèm quan hệ
      return tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
          pet: true,
          bookingServices: {
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
            orderBy: {
              id: 'asc',
            },
          },
        },
      });
    });

    // Trả cùng hình dạng với GET /bookings/:id (có costBreakdown) để frontend dùng thống nhất
    const formatted = this.formatBookingImages(result!);
    return {
      ...formatted,
      costBreakdown: calculateBookingCost(formatted),
    };
  }

  /**
   * Lấy chi tiết đơn đặt lịch (ADMIN, STAFF, OWNER)
   * - ADMIN / STAFF: Xem được mọi đơn booking
   * - OWNER: Chỉ xem được đơn booking của chính mình
   */
  async findOne(id: number, currentUserId: number, currentUserRole: Role) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        isDelete: false,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
          },
        },
        pet: true,
        bookingServices: {
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
          orderBy: {
            id: 'asc',
          },
        },
        bookingBoardingRoom: {
          include: {
            boardingRoom: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt lịch với ID: ${id}`);
    }

    if (currentUserRole === Role.OWNER && booking.userId !== currentUserId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem thông tin đơn đặt lịch này',
      );
    }

    const formattedBooking = this.formatBookingImages(booking);
    const costBreakdown = calculateBookingCost(formattedBooking);

    return {
      ...formattedBooking,
      costBreakdown,
    };
  }

  /**
   * Tính toán chi phí đơn booking (tiện ích tái sử dụng cho các service khác)
   */
  calculateCost(booking: any): BookingCostBreakdown {
    return calculateBookingCost(booking);
  }

  /**
   * BR-01 — Khung giờ phải nằm trong giờ làm việc và còn chỗ.
   *
   * Trước đây `getAvailability` chỉ là thông tin tham khảo cho frontend tự ẩn nút;
   * ai gọi API trực tiếp vẫn đặt được vào khung giờ đã hết chỗ.
   */
  private async assertSlotAvailable(
    checkInDate: Date,
    bookingType: BookingType,
    excludeBookingId?: number,
  ) {
    const slotKey = businessTimeKey(checkInDate);
    const availability = await this.computeSlotAvailability(
      {
        date: businessDateString(checkInDate),
        bookingType,
      },
      excludeBookingId,
    );

    const slot = availability.slots.find((s) => s.time === slotKey);

    if (!slot) {
      const openSlots = availability.slots.map((s) => s.time).join(', ');
      throw new BadRequestException(
        `Khung giờ ${slotKey} không nằm trong giờ làm việc. Các khung giờ nhận: ${openSlots}`,
      );
    }

    if (!slot.available) {
      throw new BadRequestException(
        `Khung giờ ${slotKey} ngày ${availability.date} đã hết chỗ (${slot.current}/${slot.max}). Vui lòng chọn khung giờ khác.`,
      );
    }
  }

  /**
   * Spec mục 11 — Không để một thú cưng có 2 lịch hẹn trùng khung giờ.
   * Một con thú cưng không thể vừa ở ca này vừa ở ca khác, và sẽ sinh 2 hóa đơn
   * cho cùng một lần đến cửa hàng.
   */
  private async assertNoPetConflict(
    petId: number,
    range: TimeRange,
    excludeBookingId?: number,
  ) {
    const window = conflictSearchWindow(range);

    const candidates = await this.prisma.booking.findMany({
      where: {
        petId,
        isDelete: false,
        status: {
          notIn: [
            BookingStatus.COMPLETED,
            BookingStatus.CANCELLED,
            BookingStatus.NO_SHOW,
          ],
        },
        expectedCheckInDate: window,
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      include: {
        bookingServices: { include: { service: true } },
      },
    });

    const clash = candidates.find((other) => {
      const otherRange = getBookingTimeRange(other);
      return otherRange ? rangesOverlap(range, otherRange) : false;
    });

    if (clash) {
      throw new BadRequestException(
        `Thú cưng này đã có lịch hẹn trùng khung giờ (đơn #${clash.id}). ` +
          `Nếu muốn làm thêm dịch vụ, hãy thêm vào đơn đang có thay vì tạo đơn mới.`,
      );
    }
  }

  /**
   * Xác thực danh sách dịch vụ do khách chọn và trả về theo đúng thứ tự đã chọn.
   * Dùng chung cho create() và update().
   */
  private async resolveUserServices(serviceIds: number[]) {
    const uniqueServiceIds = Array.from(new Set(serviceIds));

    const foundServices = await this.prisma.service.findMany({
      where: { id: { in: uniqueServiceIds }, isDelete: false },
    });

    if (foundServices.length !== uniqueServiceIds.length) {
      const foundIds = new Set(foundServices.map((sv) => sv.id));
      const missingIds = uniqueServiceIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Dịch vụ với ID [${missingIds.join(', ')}] không tồn tại hoặc đã bị xóa`,
      );
    }

    for (const service of foundServices) {
      if (!ALLOWED_BOOKING_SERVICE_CATEGORIES.includes(service.category)) {
        throw new BadRequestException(
          `Dịch vụ "${service.name}" (category: ${service.category}) không hợp lệ khi đặt lịch. Chỉ chấp nhận các dịch vụ thuộc nhóm: ${ALLOWED_BOOKING_SERVICE_CATEGORIES.join(', ')}`,
        );
      }
    }

    // Giữ nguyên thứ tự khách đã chọn
    return uniqueServiceIds.map((id) => foundServices.find((sv) => sv.id === id)!);
  }

  /**
   * Sửa đơn đặt lịch: đổi lịch hẹn, ghi chú, hoặc thay danh sách dịch vụ.
   *
   * - OWNER      : chỉ sửa đơn của mình và chỉ khi đơn còn PENDING.
   * - ADMIN/STAFF: sửa được khi đơn đang PENDING hoặc CONFIRMED.
   * - Từ CHECKED_IN trở đi thì không cho sửa nữa (thú cưng đã vào cơ sở,
   *   các bước chăm sóc đã bắt đầu ghi mốc thời gian).
   *
   * Hai bước hệ thống CHECK_IN / CHECK_OUT luôn được giữ, kể cả khi thay dịch vụ.
   */
  async update(
    id: number,
    updateBookingDto: UpdateBookingDto,
    currentUserId: number,
    currentUserRole: Role,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, isDelete: false },
      include: {
        bookingServices: { include: { service: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt lịch với ID: ${id}`);
    }

    // 1. Phân quyền + trạng thái cho phép sửa
    if (currentUserRole === Role.OWNER) {
      if (booking.userId !== currentUserId) {
        throw new ForbiddenException(
          'Bạn không có quyền sửa đơn đặt lịch này',
        );
      }
      if (booking.status !== BookingStatus.PENDING) {
        throw new ForbiddenException(
          `Chỉ có thể sửa đơn khi đang ở trạng thái "${BOOKING_STATUS_LABELS[BookingStatus.PENDING]}". Vui lòng liên hệ cửa hàng để được hỗ trợ.`,
        );
      }
    } else if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        `Không thể sửa đơn đã ở trạng thái "${BOOKING_STATUS_LABELS[booking.status]}"`,
      );
    }

    // 2. Ngày giờ: hợp nhất giá trị mới với giá trị đang có rồi mới validate
    const nextCheckIn =
      updateBookingDto.expectedCheckInDate !== undefined
        ? new Date(updateBookingDto.expectedCheckInDate)
        : booking.expectedCheckInDate;
    const nextCheckOut =
      updateBookingDto.expectedCheckOutDate !== undefined
        ? new Date(updateBookingDto.expectedCheckOutDate)
        : booking.expectedCheckOutDate;

    if (nextCheckIn && nextCheckOut && nextCheckOut < nextCheckIn) {
      throw new BadRequestException(
        'Thời gian check-out dự kiến phải sau thời gian check-in dự kiến',
      );
    }

    if (booking.bookingType === BookingType.BOARDING) {
      if (!nextCheckIn || !nextCheckOut) {
        throw new BadRequestException(
          'Đơn lưu trú bắt buộc phải có cả ngày giờ nhận và ngày giờ trả thú cưng',
        );
      }
    }

    // 2b. Chống trùng lịch khi đổi lịch hẹn hoặc đổi dịch vụ (đổi dịch vụ làm thay đổi
    // thời lượng của đơn GROOMING, nên cũng phải xét lại).
    const timingChanged =
      updateBookingDto.expectedCheckInDate !== undefined ||
      updateBookingDto.expectedCheckOutDate !== undefined ||
      Array.isArray(updateBookingDto.serviceIds);

    // 3. Dịch vụ: nếu truyền serviceIds thì thay toàn bộ phần khách chọn
    const wantsServiceChange = Array.isArray(updateBookingDto.serviceIds);

    if (
      wantsServiceChange &&
      booking.bookingType === BookingType.GROOMING &&
      updateBookingDto.serviceIds!.length === 0
    ) {
      throw new BadRequestException(
        'Lịch hẹn Grooming bắt buộc phải chọn ít nhất 1 dịch vụ chăm sóc',
      );
    }

    const newServices = wantsServiceChange
      ? await this.resolveUserServices(updateBookingDto.serviceIds!)
      : [];

    const systemCategories: ServiceCategory[] = [
      ServiceCategory.CHECK_IN,
      ServiceCategory.CHECK_OUT,
    ];

    if (timingChanged && nextCheckIn) {
      // Chỉ kiểm tra lại khung giờ khi giờ nhận thực sự đổi — đổi riêng dịch vụ
      // thì vẫn giữ chỗ cũ của mình, không cần tranh slot lần nữa.
      const checkInChanged =
        updateBookingDto.expectedCheckInDate !== undefined &&
        nextCheckIn.getTime() !== booking.expectedCheckInDate?.getTime();

      if (checkInChanged) {
        await this.assertSlotAvailable(nextCheckIn, booking.bookingType, id);
      }

      // Thời lượng mới = các bước hệ thống đang có + danh sách dịch vụ sau khi sửa
      const systemSteps = booking.bookingServices.filter((bs) =>
        systemCategories.includes(bs.service.category),
      );
      const effectiveServices = wantsServiceChange
        ? [
            ...systemSteps.map((bs) => ({ service: bs.service })),
            ...newServices.map((sv) => ({ service: sv })),
          ]
        : booking.bookingServices.map((bs) => ({ service: bs.service }));

      const nextRange = getBookingTimeRange({
        expectedCheckInDate: nextCheckIn,
        expectedCheckOutDate: nextCheckOut,
        bookingServices: effectiveServices,
      });

      if (nextRange) {
        await this.assertNoPetConflict(booking.petId, nextRange, id);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (wantsServiceChange) {
        // Chỉ xóa các bước do khách chọn, giữ lại CHECK_IN / CHECK_OUT
        await tx.bookingService.deleteMany({
          where: {
            bookingId: id,
            service: { category: { notIn: systemCategories } },
          },
        });

        if (newServices.length > 0) {
          await tx.bookingService.createMany({
            data: newServices.map((service) => ({
              bookingId: id,
              serviceId: service.id,
              price: service.basePrice,
              status: ServiceItemStatus.PENDING,
            })),
          });
        }
      }

      await tx.booking.update({
        where: { id },
        data: {
          ...(updateBookingDto.expectedCheckInDate !== undefined
            ? { expectedCheckInDate: nextCheckIn }
            : {}),
          ...(updateBookingDto.expectedCheckOutDate !== undefined
            ? { expectedCheckOutDate: nextCheckOut }
            : {}),
          ...(updateBookingDto.notes !== undefined
            ? { notes: updateBookingDto.notes.trim() || null }
            : {}),
        },
      });
    });

    return this.findOne(id, currentUserId, currentUserRole);
  }

  /**
   * Kiểm tra quyền + điều kiện nghiệp vụ của một lần chuyển trạng thái.
   * Tách riêng để dễ test và để `update()` / các service khác tái sử dụng.
   */
  private assertStatusTransitionAllowed(
    booking: {
      status: BookingStatus;
      userId: number;
      bookingType: BookingType;
      expectedCheckInDate: Date | null;
      bookingServices: Array<{
        status: ServiceItemStatus;
        service: { category: ServiceCategory };
      }>;
      bookingBoardingRoom: { id: number; boardingRoomId: number } | null;
    },
    nextStatus: BookingStatus,
    currentUserId: number,
    currentUserRole: Role,
  ) {
    const currentStatus = booking.status;

    // 1. Đơn đã ở đúng trạng thái yêu cầu
    if (currentStatus === nextStatus) {
      throw new BadRequestException(
        `Đơn đặt lịch đã ở trạng thái "${BOOKING_STATUS_LABELS[nextStatus]}"`,
      );
    }

    // 2. Kiểm tra máy trạng thái
    const allowed = BOOKING_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Không thể chuyển đơn đặt lịch từ "${BOOKING_STATUS_LABELS[currentStatus]}" sang "${BOOKING_STATUS_LABELS[nextStatus]}"`,
      );
    }

    // 3. Phân quyền
    if (currentUserRole === Role.OWNER) {
      if (booking.userId !== currentUserId) {
        throw new ForbiddenException(
          'Bạn không có quyền thay đổi trạng thái đơn đặt lịch này',
        );
      }

      if (nextStatus !== BookingStatus.CANCELLED) {
        throw new ForbiddenException(
          'Chủ nuôi chỉ có thể hủy đơn đặt lịch của mình',
        );
      }

      // BR-02: chỉ được hủy khi còn cách giờ hẹn >= CANCEL_DEADLINE_HOURS
      if (booking.expectedCheckInDate) {
        const hoursLeft =
          (new Date(booking.expectedCheckInDate).getTime() - Date.now()) /
          (1000 * 60 * 60);

        if (hoursLeft < CANCEL_DEADLINE_HOURS) {
          throw new ForbiddenException(
            `Chỉ có thể hủy đơn trước giờ hẹn ít nhất ${CANCEL_DEADLINE_HOURS} tiếng. Vui lòng liên hệ cửa hàng để được hỗ trợ.`,
          );
        }
      }
    }

    // 4. Điều kiện nghiệp vụ theo trạng thái đích
    if (nextStatus === BookingStatus.CHECKED_IN) {
      // BR-03: đơn BOARDING phải được gán phòng trước khi tiếp nhận
      if (
        booking.bookingType === BookingType.BOARDING &&
        !booking.bookingBoardingRoom
      ) {
        throw new BadRequestException(
          'Đơn lưu trú cần được gán phòng trước khi tiếp nhận thú cưng',
        );
      }
    }

    if (nextStatus === BookingStatus.COMPLETED) {
      // BR-05: mọi bước chăm sóc (trừ CHECK_OUT) phải hoàn thành
      const unfinished = booking.bookingServices.filter(
        (bs) =>
          bs.service.category !== ServiceCategory.CHECK_OUT &&
          bs.status !== ServiceItemStatus.COMPLETED,
      );

      if (unfinished.length > 0) {
        throw new BadRequestException(
          `Còn ${unfinished.length} bước chăm sóc chưa hoàn thành. Vui lòng hoàn tất tất cả các bước trước khi kết thúc đơn.`,
        );
      }
    }
  }

  /**
   * Cập nhật trạng thái đơn đặt lịch theo máy trạng thái (BR-02 → BR-05).
   *
   * - ADMIN / STAFF: thực hiện mọi chuyển trạng thái hợp lệ.
   * - OWNER: chỉ được hủy đơn của chính mình và chỉ khi còn >= 12 tiếng tới giờ hẹn.
   *
   * Các tác động phụ được thực hiện trong cùng một transaction:
   * - CHECKED_IN : đánh dấu bước CHECK_IN hoàn thành (mốc giờ nhận thú cưng);
   *                đơn BOARDING -> phòng chuyển sang OCCUPIED.
   * - COMPLETED  : đánh dấu bước CHECK_OUT hoàn thành (mốc giờ trả thú cưng);
   *                chốt `totalAmount`; trả phòng về AVAILABLE.
   * - CANCELLED  : lưu lý do + thời điểm hủy; trả phòng về AVAILABLE.
   */
  async updateStatus(
    id: number,
    updateBookingStatusDto: UpdateBookingStatusDto,
    currentUserId: number,
    currentUserRole: Role,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        isDelete: false,
      },
      include: {
        bookingServices: {
          include: {
            service: true,
          },
        },
        bookingBoardingRoom: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt lịch với ID: ${id}`);
    }

    const nextStatus = updateBookingStatusDto.status;

    this.assertStatusTransitionAllowed(
      booking,
      nextStatus,
      currentUserId,
      currentUserRole,
    );

    const now = new Date();

    const checkInItem = booking.bookingServices.find(
      (bs) => bs.service.category === ServiceCategory.CHECK_IN,
    );
    const checkOutItem = booking.bookingServices.find(
      (bs) => bs.service.category === ServiceCategory.CHECK_OUT,
    );

    const bookingData: Prisma.BookingUpdateInput = { status: nextStatus };

    await this.prisma.$transaction(async (tx) => {
      // --- CHECKED_IN: ghi mốc tiếp nhận + khóa phòng ---
      if (nextStatus === BookingStatus.CHECKED_IN) {
        if (checkInItem) {
          await tx.bookingService.update({
            where: { id: checkInItem.id },
            data: {
              status: ServiceItemStatus.COMPLETED,
              actualStartTime: checkInItem.actualStartTime ?? now,
              actualEndTime: checkInItem.actualEndTime ?? now,
            },
          });
        }

        if (booking.bookingBoardingRoom) {
          await tx.boardingRoom.update({
            where: { id: booking.bookingBoardingRoom.boardingRoomId },
            data: { status: RoomStatus.OCCUPIED },
          });
        }
      }

      // --- COMPLETED: ghi mốc trả thú cưng, chốt tiền, trả phòng ---
      if (nextStatus === BookingStatus.COMPLETED) {
        if (checkOutItem) {
          await tx.bookingService.update({
            where: { id: checkOutItem.id },
            data: {
              status: ServiceItemStatus.COMPLETED,
              actualStartTime: checkOutItem.actualStartTime ?? now,
              actualEndTime: now,
            },
          });
        }

        // Chốt tổng tiền dựa trên mốc check-out vừa ghi
        const costBreakdown = calculateBookingCost({
          ...booking,
          bookingServices: booking.bookingServices.map((bs) =>
            bs.id === checkOutItem?.id ? { ...bs, actualEndTime: now } : bs,
          ),
        });
        bookingData.totalAmount = costBreakdown.totalAmount;

        if (booking.bookingBoardingRoom) {
          await tx.boardingRoom.update({
            where: { id: booking.bookingBoardingRoom.boardingRoomId },
            data: { status: RoomStatus.AVAILABLE },
          });
        }
      }

      // --- CANCELLED: lưu lý do + trả phòng ---
      if (nextStatus === BookingStatus.CANCELLED) {
        bookingData.cancelReason =
          updateBookingStatusDto.cancelReason?.trim() || null;
        bookingData.cancelledAt = now;

        if (booking.bookingBoardingRoom) {
          await tx.boardingRoom.update({
            where: { id: booking.bookingBoardingRoom.boardingRoomId },
            data: { status: RoomStatus.AVAILABLE },
          });
        }
      }

      await tx.booking.update({
        where: { id },
        data: bookingData,
      });
    });

    // Trả về đơn đã cập nhật đầy đủ quan hệ + costBreakdown (giống GET /bookings/:id)
    return this.findOne(id, currentUserId, currentUserRole);
  }

  /**
   * Xóa mềm đơn đặt lịch (isDelete = true)
   * - OWNER: Chỉ xóa được booking của chính mình VÀ khi status === PENDING
   * - ADMIN / STAFF: Xóa được ở bất kỳ trạng thái nào
   */
  async remove(id: number, currentUserId: number, currentUserRole: Role) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        isDelete: false,
      },
      include: {
        bookingBoardingRoom: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt lịch với ID: ${id}`);
    }

    if (currentUserRole === Role.OWNER) {
      if (booking.userId !== currentUserId) {
        throw new ForbiddenException(
          'Bạn không có quyền thao tác trên đơn đặt lịch này',
        );
      }

      if (booking.status !== BookingStatus.PENDING) {
        throw new ForbiddenException(
          'Chủ nuôi chỉ có thể xóa đơn đặt lịch khi đơn đang ở trạng thái PENDING',
        );
      }
    }

    // Nếu đơn đang giữ phòng thì phải nhả phòng, nếu không phòng sẽ kẹt
    // OCCUPIED vĩnh viễn: đơn đã isDelete nên không còn chỗ nào trả nó về AVAILABLE.
    const petWasStaying =
      booking.status === BookingStatus.CHECKED_IN ||
      booking.status === BookingStatus.IN_PROGRESS;

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          isDelete: true,
        },
      });

      if (booking.bookingBoardingRoom && petWasStaying) {
        await tx.boardingRoom.update({
          where: { id: booking.bookingBoardingRoom.boardingRoomId },
          data: { status: RoomStatus.AVAILABLE },
        });
      }
    });

    return {
      message: `Đã xóa thành công đơn đặt lịch ID: ${id}`,
    };
  }

  /**
   * Lấy danh sách đơn đặt lịch với phân trang & lọc
   * - OWNER: Chỉ thấy các booking của chính mình
   * - ADMIN / STAFF: Thấy tất cả, có thể lọc theo userId
   */
  async findAll(
    currentUserId: number,
    currentUserRole: Role,
    query: QueryBookingDto,
  ) {
    const {
      page = 1,
      limit = 10,
      status,
      bookingType,
      petId,
      userId,
      search,
      staffId,
      from,
      to,
      paymentStatus,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {
      isDelete: false,
    };

    // Phân quyền dữ liệu theo role
    if (currentUserRole === Role.OWNER) {
      where.userId = currentUserId;
    } else if (userId) {
      // ADMIN / STAFF có thể lọc theo userId cụ thể
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (bookingType) {
      where.bookingType = bookingType;
    }

    if (petId) {
      where.petId = petId;
    }

    if (staffId) {
      where.bookingServices = {
        some: {
          staffId: staffId,
        },
      };
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    // Lọc theo khoảng ngày hẹn (expectedCheckInDate)
    const fromDate = parseBusinessRangeBoundary(from, 'start');
    const toDate = parseBusinessRangeBoundary(to, 'end');

    if (fromDate || toDate) {
      where.expectedCheckInDate = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      };
    }

    // Tìm kiếm theo tên thú cưng, tên/SĐT/email khách hàng
    if (search && search.trim()) {
      const keyword = search.trim();
      where.OR = [
        {
          pet: {
            name: { contains: keyword, mode: 'insensitive' },
          },
        },
        {
          user: {
            fullName: { contains: keyword, mode: 'insensitive' },
          },
        },
        {
          user: {
            phoneNumber: { contains: keyword, mode: 'insensitive' },
          },
        },
        {
          user: {
            email: { contains: keyword, mode: 'insensitive' },
          },
        },
      ];
    }

    const includeRelations: Prisma.BookingInclude = {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
        },
      },
      pet: true,
      bookingServices: {
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
        orderBy: {
          id: 'asc',
        },
      },
      bookingBoardingRoom: {
        include: {
          boardingRoom: true,
        },
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: includeRelations,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: data.map((booking) => {
        const formatted = this.formatBookingImages(booking);
        return {
          ...formatted,
          costBreakdown: calculateBookingCost(formatted),
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Kiểm tra slot khả dụng theo ngày
   * Đếm số booking trên mỗi khung giờ 30 phút, so với capacity tối đa.
   */
  async getAvailability(query: QueryAvailabilityDto) {
    return this.computeSlotAvailability(query);
  }

  /**
   * Tính số chỗ còn lại của từng khung giờ trong ngày.
   * @param excludeBookingId bỏ qua đơn này khi đếm — cần khi đang đổi lịch cho
   *   chính nó, nếu không đơn sẽ tự chiếm chỗ của mình và báo hết chỗ.
   */
  private async computeSlotAvailability(
    query: QueryAvailabilityDto,
    excludeBookingId?: number,
  ) {
    const activeStaffCount = await this.prisma.user.count({
      where: { role: Role.STAFF, isDelete: false },
    });
    const maxPerSlot = Math.max(activeStaffCount, 1);

    const TIME_SLOTS = [
      '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
      '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30',
    ];

    // Ranh giới ngày tính theo giờ cửa hàng (UTC+7), không theo TZ của server
    const dateStart = businessDayStart(query.date);
    const dateEnd = businessDayEnd(query.date);

    const where: Prisma.BookingWhereInput = {
      isDelete: false,
      expectedCheckInDate: {
        gte: dateStart,
        lte: dateEnd,
      },
      status: {
        notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
      },
    };

    if (excludeBookingId) {
      where.id = { not: excludeBookingId };
    }

    if (query.bookingType) {
      where.bookingType = query.bookingType;
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      select: {
        expectedCheckInDate: true,
      },
    });

    const slotCounts = new Map<string, number>();
    for (const slot of TIME_SLOTS) {
      slotCounts.set(slot, 0);
    }

    for (const booking of bookings) {
      if (!booking.expectedCheckInDate) continue;
      // Quy đổi mốc UTC trong DB về khung giờ hiển thị cho khách (giờ VN)
      const timeKey = businessTimeKey(booking.expectedCheckInDate);
      if (slotCounts.has(timeKey)) {
        slotCounts.set(timeKey, slotCounts.get(timeKey)! + 1);
      }
    }

    const slots = TIME_SLOTS.map((time) => {
      const current = slotCounts.get(time) ?? 0;
      return {
        time,
        current,
        max: maxPerSlot,
        available: current < maxPerSlot,
      };
    });

    return {
      date: query.date,
      slots,
    };
  }
}
