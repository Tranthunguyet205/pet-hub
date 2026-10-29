import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Prisma, ServiceCategory, BookingStatus } from '@prisma/client';
import { toPublicImageUrl } from '../common/utils/image-url.util';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Format imageUrl sang full public URL
   */
  private formatServiceImage<T extends { imageUrl?: string | null }>(
    service: T,
  ): T {
    if (!service) return service;
    return {
      ...service,
      imageUrl: toPublicImageUrl(service.imageUrl),
    };
  }

  /**
   * Tạo mới một dịch vụ (Chỉ Admin)
   * Chặn tuyệt đối việc tạo dịch vụ có category CHECK_IN hoặc CHECK_OUT
   */
  async create(
    createServiceDto: CreateServiceDto,
    file?: Express.Multer.File,
  ) {
    if (
      createServiceDto.category === ServiceCategory.CHECK_IN ||
      createServiceDto.category === ServiceCategory.CHECK_OUT
    ) {
      throw new BadRequestException(
        'Không được phép tạo mới dịch vụ hệ thống cố định CHECK_IN hoặc CHECK_OUT.',
      );
    }

    const imageUrl = file ? `/files/services/${file.filename}` : null;

    const createdService = await this.prisma.service.create({
      data: {
        name: createServiceDto.name.trim(),
        category: createServiceDto.category,
        description: createServiceDto.description
          ? createServiceDto.description.trim()
          : null,
        durationMinutes: createServiceDto.durationMinutes,
        basePrice: createServiceDto.basePrice,
        imageUrl,
      },
    });

    return this.formatServiceImage(createdService);
  }

  /**
   * Lấy danh sách dịch vụ kèm phân trang, tìm kiếm và lọc theo category
   */
  async findAll(query: QueryServiceDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceWhereInput = {
      isDelete: false,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.search && query.search.trim()) {
      const searchKeyword = query.search.trim();
      where.OR = [
        {
          name: {
            contains: searchKeyword,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: searchKeyword,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [total, services] = await Promise.all([
      this.prisma.service.count({ where }),
      this.prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          id: 'asc',
        },
      }),
    ]);

    const formattedData = services.map((item) => this.formatServiceImage(item));

    return {
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Lấy chi tiết một dịch vụ theo ID
   */
  async findOne(id: number) {
    const service = await this.prisma.service.findFirst({
      where: {
        id,
        isDelete: false,
      },
    });

    if (!service) {
      throw new NotFoundException(
        `Không tìm thấy dịch vụ với ID ${id} hoặc dịch vụ không tồn tại.`,
      );
    }

    return this.formatServiceImage(service);
  }

  /**
   * Cập nhật thông tin dịch vụ (Chỉ Admin)
   * Chặn cập nhật đối với dịch vụ hệ thống CHECK_IN hoặc CHECK_OUT
   */
  async update(
    id: number,
    updateServiceDto: UpdateServiceDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.prisma.service.findFirst({
      where: {
        id,
        isDelete: false,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Không tìm thấy dịch vụ với ID ${id} hoặc dịch vụ không tồn tại.`,
      );
    }

    if (
      existing.category === ServiceCategory.CHECK_IN ||
      existing.category === ServiceCategory.CHECK_OUT
    ) {
      throw new BadRequestException(
        'Không thể chỉnh sửa dịch vụ hệ thống cố định CHECK_IN hoặc CHECK_OUT.',
      );
    }

    const dataToUpdate: Prisma.ServiceUpdateInput = {};

    if (updateServiceDto.name !== undefined) {
      dataToUpdate.name = updateServiceDto.name.trim();
    }

    if (updateServiceDto.description !== undefined) {
      dataToUpdate.description = updateServiceDto.description
        ? updateServiceDto.description.trim()
        : null;
    }

    if (updateServiceDto.durationMinutes !== undefined) {
      dataToUpdate.durationMinutes = updateServiceDto.durationMinutes;
    }

    if (updateServiceDto.basePrice !== undefined) {
      dataToUpdate.basePrice = updateServiceDto.basePrice;
    }

    if (file) {
      dataToUpdate.imageUrl = `/files/services/${file.filename}`;
    }

    const updatedService = await this.prisma.service.update({
      where: { id },
      data: dataToUpdate,
    });

    return this.formatServiceImage(updatedService);
  }

  /**
   * Xóa mềm dịch vụ (Chỉ Admin)
   * Chặn xóa CHECK_IN, CHECK_OUT và các dịch vụ đang được dùng trong booking chưa hoàn tất
   */
  async remove(id: number) {
    const existing = await this.prisma.service.findFirst({
      where: {
        id,
        isDelete: false,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Không tìm thấy dịch vụ với ID ${id} hoặc dịch vụ không tồn tại.`,
      );
    }

    if (
      existing.category === ServiceCategory.CHECK_IN ||
      existing.category === ServiceCategory.CHECK_OUT
    ) {
      throw new BadRequestException(
        'Không thể xóa dịch vụ hệ thống cố định CHECK_IN hoặc CHECK_OUT.',
      );
    }

    const activeBookingService = await this.prisma.bookingService.findFirst({
      where: {
        serviceId: id,
        booking: {
          isDelete: false,
          status: {
            in: [
              BookingStatus.PENDING,
              BookingStatus.CONFIRMED,
              BookingStatus.IN_PROGRESS,
            ],
          },
        },
      },
      include: {
        booking: true,
      },
    });

    if (activeBookingService) {
      throw new BadRequestException(
        `Không thể xóa dịch vụ "${existing.name}" vì dịch vụ đang được sử dụng trong đơn đặt lịch ID: ${activeBookingService.bookingId} (Trạng thái: ${activeBookingService.booking.status}).`,
      );
    }

    await this.prisma.service.update({
      where: { id },
      data: {
        isDelete: true,
      },
    });

    return {
      message: `Đã xóa thành công dịch vụ "${existing.name}" (ID: ${id}).`,
    };
  }
}
