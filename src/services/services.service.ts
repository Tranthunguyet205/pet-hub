import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryServiceDto } from './dto/query-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Prisma } from '@prisma/client';
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
}
