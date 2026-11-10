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
import { QueryBookingDto } from './dto/query-booking.dto';
import { Prisma } from '@prisma/client';
import {
  Role,
  BookingStatus,
  BookingType,
  ServiceCategory,
  ServiceItemStatus,
} from '@prisma/client';
import { toPublicImageUrl } from '../common/utils/image-url.util';
import {
  calculateBookingCost,
  BookingCostBreakdown,
} from './utils/booking-cost.util';

export const ALLOWED_BOOKING_SERVICE_CATEGORIES: ServiceCategory[] = [
  ServiceCategory.BATH_AND_DRY,
  ServiceCategory.HAIRCUT,
  ServiceCategory.HYGIENE,
  ServiceCategory.FULL_GROOMING,
];

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

    // 3. Kiểm tra ngày giờ dự kiến (nếu có cả 2 trường)
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
      // Loại bỏ ID trùng lặp nếu có
      const uniqueServiceIds = Array.from(new Set(createBookingDto.serviceIds));

      const foundServices = await this.prisma.service.findMany({
        where: {
          id: { in: uniqueServiceIds },
          isDelete: false,
        },
      });

      if (foundServices.length !== uniqueServiceIds.length) {
        const foundIds = new Set(foundServices.map((s) => s.id));
        const missingIds = uniqueServiceIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(
          `Dịch vụ với ID [${missingIds.join(', ')}] không tồn tại hoặc đã bị xóa`,
        );
      }

      // Xác thực category của từng dịch vụ
      for (const service of foundServices) {
        if (!ALLOWED_BOOKING_SERVICE_CATEGORIES.includes(service.category)) {
          throw new BadRequestException(
            `Dịch vụ "${service.name}" (category: ${service.category}) không hợp lệ khi đặt lịch. Chỉ chấp nhận các dịch vụ thuộc nhóm: ${ALLOWED_BOOKING_SERVICE_CATEGORIES.join(', ')}`,
          );
        }
      }

      // Giữ nguyên thứ tự mà người dùng đã chọn
      userServices = uniqueServiceIds.map((id) =>
        foundServices.find((s) => s.id === id)!,
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

    // 6. Thực thi Transaction tạo Booking và các BookingService
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

    return this.formatBookingImages(result!);
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
   * Cập nhật trạng thái đơn đặt lịch (Chỉ ADMIN & STAFF)
   */

  async updateStatus(
    id: number,
    updateBookingStatusDto: UpdateBookingStatusDto,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        isDelete: false,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt lịch với ID: ${id}`);
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: updateBookingStatusDto.status,
      },
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
        bookingBoardingRoom: {
          include: {
            boardingRoom: true,
          },
        },
      },
    });

    return this.formatBookingImages(updated);
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

    await this.prisma.booking.update({
      where: { id },
      data: {
        isDelete: true,
      },
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
      data: data.map((booking) => this.formatBookingImages(booking)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
